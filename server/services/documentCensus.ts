import Anthropic from "@anthropic-ai/sdk";
import {
  buildChunks,
  mapWithConcurrency,
  subdivideChunk,
  CENSUS_CHUNK_PAGES,
  type PageChunk,
  type SourceFile,
} from "@/server/services/documentSplit";
import {
  PRICING_RELEVANT_KINDS,
  type PageInventory,
  type PageKind,
  type PageMedium,
} from "@/shared/documents/pageInventory";

/**
 * Pass one: look at every page, cheaply, and say what it is.
 *
 * WHY A SEPARATE PASS. Deep extraction on a hundred sheets is slow and
 * expensive, and most of those sheets are shear-wall details that carry no
 * quantity anyone prices. But "we skipped it because it looked boring" is only
 * defensible if something actually looked. The census looks at all of them and
 * returns a few fields per page, so the set gets a complete manifest for the
 * cost of a small model, and pass two spends the expensive model only where
 * there is something to find.
 *
 * This manifest is also the answer to the question the customer is really
 * asking when they upload a permit set: did you read my whole plan set? Every
 * page ends up READ with a sheet number and a title, or FAILED with a reason.
 */

const CENSUS_MODEL = "claude-haiku-4-5-20251001";
const CENSUS_CONCURRENCY = 6;

const CENSUS_SCHEMA = {
  type: "object",
  properties: {
    pages: {
      type: "array",
      description: "One entry per page supplied, in the order supplied. Never skip a page.",
      items: {
        type: "object",
        properties: {
          position: { type: "integer", description: "1-based position of this page within THIS request." },
          sheet: { type: ["string", "null"], description: "Sheet number exactly as printed, e.g. \"A2.1\". Null if none." },
          title: { type: ["string", "null"], description: "Sheet title as printed." },
          kind: {
            type: "string",
            enum: [
              "cover", "floor-plan", "demolition", "elevation", "schedule", "structural",
              "mep", "site", "detail", "notes", "repair-form", "photo", "other", "unreadable",
            ],
          },
          medium: { type: "string", enum: ["vector", "scanned", "handwritten", "unknown"] },
          legibility: { type: "number", description: "0 to 1. How confidently the content could be read." },
          carriesQuantities: {
            type: "boolean",
            description:
              "True if this page states room areas, dimensions, schedule quantities, counts, specifications, allowances, alternates, or a repair list. False for reference-only detail sheets.",
          },
          note: { type: ["string", "null"], description: "Anything unusual: illegible regions, handwritten markup, revision clouds, conflicting stamps." },
        },
        required: ["position", "sheet", "title", "kind", "medium", "legibility", "carriesQuantities", "note"],
        additionalProperties: false,
      },
    },
  },
  required: ["pages"],
  additionalProperties: false,
} as const;

const CENSUS_PROMPT = `You are indexing a construction document set so an estimator knows what is in it.

For EVERY page you are given, in order, return one entry. Never skip a page, never merge two pages into one entry, and never invent a page that was not supplied. If a page is blank, return it as kind "other" with legibility 1. If a page is too degraded to read, return kind "unreadable" with a low legibility and say why in the note.

Read what is actually printed. Sheet numbers and titles come from the title block, usually bottom-right or along the right edge. Quote them exactly; do not tidy them up.

medium: "vector" for crisp CAD output, "scanned" for a scan or photograph of a printed sheet (speckle, skew, uneven exposure), "handwritten" when the page carries handwritten annotation, initials, redlines or markup - handwriting anywhere on a page makes the whole page "handwritten" even if the rest is printed.

carriesQuantities is the field that decides whether this page gets a detailed read later. Set it TRUE for: cover sheets with area tabulations, floor plans, demolition plans, any schedule (door, window, finish, fixture, equipment), plans carrying counts or specifications, general notes listing allowances, alternates, or exclusions, and inspection or repair forms. Set it FALSE for pure reference material: typical details, wall sections, elevations without dimensions, structural detail sheets with no schedule, and title or index pages carrying no numbers. When genuinely torn, set it TRUE - a wasted read is cheaper than a missed quantity.`;

export interface CensusOutcome {
  ok: boolean;
  /** Pages that could not be censused even after subdividing to one page. */
  failed: number;
}

interface CensusPage {
  position: number;
  sheet: string | null;
  title: string | null;
  kind: PageKind;
  medium: PageMedium;
  legibility: number;
  carriesQuantities: boolean;
  note: string | null;
}

/**
 * Census every page in the inventory, mutating each PageRecord in place.
 *
 * Failures are contained per chunk: a chunk the API rejects is halved and
 * retried, down to single pages, so one pathological sheet cannot take the
 * rest of the set with it. A page that fails even alone is marked FAILED with
 * a reason, which is a result rather than an error - the customer is told
 * which page we could not read.
 */
export async function censusPages(
  files: SourceFile[],
  inventory: PageInventory,
  client: Anthropic,
  /**
   * What the customer asked us to focus on, in their own words.
   *
   * Steers WHICH pages earn a detailed read without narrowing which pages are
   * looked at: every sheet is still indexed, so the coverage claim stays true.
   * "Millwork only" should make the casework details and interior elevations
   * pricing-relevant on a set where the room areas are not the point.
   */
  instructions?: string,
): Promise<CensusOutcome> {
  const chunks = await buildChunks(
    files,
    inventory,
    inventory.pages.map((p) => p.index),
    CENSUS_CHUNK_PAGES,
  );

  const queue: PageChunk[] = [...chunks];
  const failedPages = new Set<number>();

  // Processed in waves so subdivided retries rejoin the pool with the same
  // concurrency cap rather than spawning unbounded recursion.
  while (queue.length > 0) {
    const wave = queue.splice(0, queue.length);
    const retries = await mapWithConcurrency(wave, CENSUS_CONCURRENCY, async (chunk) => {
      try {
        const pages = await censusChunk(chunk, client, instructions);
        applyCensus(inventory, chunk, pages);
        return null;
      } catch (err) {
        const smaller = await subdivideChunk(files, inventory, chunk);
        if (smaller && smaller.length > 0) return smaller;
        for (const index of chunk.pageIndices) {
          failedPages.add(index);
          const page = inventory.pages.find((p) => p.index === index);
          if (page) {
            page.status = "failed";
            page.kind = "unreadable";
            page.failureReason = describeFailure(err);
          }
        }
        console.error(`[documentCensus] gave up on ${chunk.label}:`, err);
        return null;
      }
    });
    for (const more of retries) if (more) queue.push(...more);
  }

  return { ok: failedPages.size < inventory.pages.length, failed: failedPages.size };
}

async function censusChunk(
  chunk: PageChunk,
  client: Anthropic,
  instructions?: string,
): Promise<CensusPage[]> {
  const system = instructions
    ? `${CENSUS_PROMPT}\n\nWHAT THIS CUSTOMER ASKED FOR, VERBATIM: "${instructions}"\n\nIndex every page exactly as instructed above - the customer's focus never reduces which pages you look at or report. It DOES widen carriesQuantities: a page carrying information relevant to what they asked for is pricing-relevant even if it carries no room areas. On a millwork or casework request that means interior elevations, enlarged plans, casework details, finish schedules and equipment schedules all count.`
    : CENSUS_PROMPT;

  const message = await client.messages.create({
    model: CENSUS_MODEL,
    max_tokens: 4000,
    system,
    output_config: {
      format: { type: "json_schema", schema: CENSUS_SCHEMA as unknown as Record<string, unknown> },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `--- ${chunk.label} (${chunk.pageIndices.length} page(s)) ---` },
          chunk.mimeType === "application/pdf"
            ? {
                type: "document" as const,
                source: { type: "base64" as const, media_type: "application/pdf" as const, data: chunk.data.toString("base64") },
              }
            : {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: chunk.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                  data: chunk.data.toString("base64"),
                },
              },
          { type: "text", text: "Index every page above. One entry per page, in order." },
        ],
      },
    ],
  } as Anthropic.Messages.MessageCreateParamsNonStreaming);

  // A truncated census is a census that silently lost pages, which is the
  // exact failure this pass exists to prevent. Treat it as a chunk failure so
  // the retry ladder halves it and tries again.
  if (message.stop_reason === "max_tokens") {
    throw new Error("census response truncated");
  }
  const text = message.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("census returned no text");
  const parsed = JSON.parse(text.text) as { pages: CensusPage[] };
  if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) throw new Error("census returned no pages");
  return parsed.pages;
}

/**
 * Write census results onto the inventory.
 *
 * Position is trusted only as an ordinal into THIS chunk's page list. A model
 * that returns fewer entries than pages leaves the remainder pending, and the
 * caller marks those failed - which is the honest outcome, and far better than
 * spreading N answers across M pages and mislabelling every one of them.
 */
function applyCensus(inventory: PageInventory, chunk: PageChunk, results: CensusPage[]): void {
  for (const result of results) {
    const ordinal = Math.round(result.position);
    if (!Number.isFinite(ordinal) || ordinal < 1 || ordinal > chunk.pageIndices.length) continue;
    const pageIndex = chunk.pageIndices[ordinal - 1];
    const page = inventory.pages.find((p) => p.index === pageIndex);
    if (!page) continue;

    page.status = "read";
    page.kind = result.kind;
    page.medium = result.medium;
    page.sheet = result.sheet;
    page.title = result.title;
    page.legibility = clamp01(result.legibility);
    // A page is worth a deep read if the census says it carries numbers OR its
    // kind is one we always read. Kind is the backstop: a floor plan is worth
    // opening even if the indexer judged it bare.
    page.pricingRelevant =
      (result.carriesQuantities || PRICING_RELEVANT_KINDS.includes(result.kind)) &&
      result.kind !== "unreadable";
    if (result.note) page.failureReason = undefined;
    if (result.kind === "unreadable") {
      page.status = "failed";
      page.failureReason = result.note ?? "This page could not be read.";
    }
  }

  // Anything the model did not answer for stays unread, and says so.
  for (const index of chunk.pageIndices) {
    const page = inventory.pages.find((p) => p.index === index);
    if (page && page.status === "pending") {
      page.status = "failed";
      page.failureReason = "The indexer returned no entry for this page.";
    }
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function describeFailure(err: unknown): string {
  if (err instanceof Anthropic.APIError && (err.status === 413 || err.status === 400)) {
    return "This page was too heavy to process on its own. It is usually a very large drawing.";
  }
  if (err instanceof Anthropic.RateLimitError) return "We ran out of capacity while reading this page.";
  return "This page could not be read.";
}
