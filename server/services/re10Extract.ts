import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACTION_SCHEMA,
  EXTRACTION_SYSTEM_PROMPT,
  type ExtractedRepair,
  type ExtractionResult,
  type UnmappedItem,
} from "@/shared/re10/extraction";
import { MAX_TOTAL_UPLOAD_BYTES } from "@/shared/re10/uploads";
import {
  buildChunks,
  buildInventory,
  mapWithConcurrency,
  subdivideChunk,
  DEEP_CHUNK_PAGES,
  type PageChunk,
  type SourceFile,
} from "@/server/services/documentSplit";
import { censusPages } from "@/server/services/documentCensus";
import { summarizeInventory, type PageInventory } from "@/shared/documents/pageInventory";
import {
  addFact,
  emptyTrail,
  normalizeKey,
  type AuditTrail,
} from "@/shared/documents/auditTrail";
import { findDuplicatePairs, findQuantityConflicts, type DuplicatePair, type QuantityConflict } from "@/shared/re10/duplicates";

/**
 * Reading an inspection repair list with Claude, one bite at a time.
 *
 * WHAT THIS USED TO DO AND WHY IT WAS DANGEROUS. Every uploaded file went into
 * a single request with `max_tokens: 16000`, and the ONLY stop_reason checked
 * was "refusal". A sixty-item RE-10 with verbatim strings exhausts that budget,
 * and a truncated structured response does not announce itself: the constrained
 * decoder closes the array and the result parses cleanly as a SHORTER LIST.
 * Nothing downstream could tell twelve-of-sixty from twelve-of-twelve, so the
 * customer got a firm price for a fraction of the work they asked about. That
 * is the most expensive failure this product can have, and it was silent.
 *
 * Now: pages are counted, every page is indexed, repair-bearing pages are read
 * in small chunks in parallel, truncation is detected per chunk and retried at
 * a smaller size, and the results are merged with duplicates and contradictions
 * FLAGGED rather than quietly resolved. A page we could not read is reported as
 * a page we could not read.
 */

export interface ExtractionInput {
  filename: string;
  mimeType: string;
  data: Buffer;
}

export type ExtractionFailure = "not-configured" | "refused" | "busy" | "too-large" | "failed";

export interface ExtractionSuccess {
  ok: true;
  result: ExtractionResult;
  /** Page-by-page record of what was read. The completeness evidence. */
  inventory: PageInventory;
  trail: AuditTrail;
  /** Suspected restatements, for the review screen to ask about. */
  duplicates: DuplicatePair[];
  quantityConflicts: QuantityConflict[];
  usage: { inputTokens: number; outputTokens: number };
}

export type ExtractionOutcome =
  | ExtractionSuccess
  | { ok: false; reason: ExtractionFailure; message: string; inventory?: PageInventory };

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PDF_TYPE = "application/pdf";

export { MAX_TOTAL_UPLOAD_BYTES };

const DEEP_MODEL = "claude-opus-5";
const DEEP_CONCURRENCY = 5;

/**
 * Repair lists are read TWO pages at a time, not four.
 *
 * A repair document is dense in a way a drawing sheet is not: sixty-five
 * numbered requests can sit on three pages, and enumerating all of them in one
 * response is where the model gives up early. Fewer pages per request means
 * fewer items to enumerate per response, which is the lever that actually
 * moves completeness.
 */
const RE10_CHUNK_PAGES = 2;

export function isExtractionConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Kinds of page worth reading for repairs. A repair list can be anywhere. */
const REPAIR_BEARING_KINDS = new Set(["repair-form", "notes", "cover", "other", "schedule", "photo"]);

export async function extractRepairs(files: ExtractionInput[]): Promise<ExtractionOutcome> {
  if (!isExtractionConfigured()) {
    return { ok: false, reason: "not-configured", message: "Document analysis is not configured on this environment." };
  }

  const usable: SourceFile[] = files.filter((f) => f.mimeType === PDF_TYPE || IMAGE_TYPES.has(f.mimeType));
  if (usable.length === 0) {
    return { ok: false, reason: "failed", message: "No readable PDF or image files were supplied." };
  }

  const total = usable.reduce((sum, f) => sum + f.data.byteLength, 0);
  if (total > MAX_TOTAL_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: "too-large",
      message:
        "Those files are too large to analyze together. Send the RE-10 and the inspection pages it refers to, rather than the full report.",
    };
  }

  const client = new Anthropic();
  const inventory = await buildInventory(usable);

  if (inventory.pages.length === 0) {
    return {
      ok: false,
      reason: "failed",
      message: "We could not open any pages from those files. A PDF export or clear photos usually works.",
      inventory,
    };
  }

  try {
    // Pass one: index every page. This is what lets us say honestly whether the
    // whole document was read, and it keeps the expensive pass off the pages
    // that carry nothing (photo logs, cut sheets, agency stamps).
    await censusPages(usable, inventory, client);

    const targets = inventory.pages.filter(
      (p) => p.status === "read" && (p.pricingRelevant || REPAIR_BEARING_KINDS.has(p.kind)),
    );
    if (targets.length === 0) {
      return {
        ok: false,
        reason: "failed",
        message: "We read those pages, but none of them carry a repair list we could work from.",
        inventory,
      };
    }

    const chunks = await buildChunks(usable, inventory, targets.map((p) => p.index), RE10_CHUNK_PAGES);
    /* Pages where even a single-page read came back short. Recorded so the
       customer is told the list may be incomplete rather than left to assume
       it is whole. */
    const shortPages: { page: number; counted: number; extracted: number }[] = [];
    const collected: { chunk: PageChunk; result: ExtractionResult }[] = [];
    const usage = { inputTokens: 0, outputTokens: 0 };
    let refusals = 0;

    const queue: PageChunk[] = [...chunks];
    while (queue.length > 0) {
      const wave = queue.splice(0, queue.length);
      const retries = await mapWithConcurrency(wave, DEEP_CONCURRENCY, async (chunk) => {
        try {
          const { result, tokens } = await extractChunk(chunk, client);
          collected.push({ chunk, result });
          usage.inputTokens += tokens.inputTokens;
          usage.outputTokens += tokens.outputTokens;
          for (const index of chunk.pageIndices) {
            const page = inventory.pages.find((p) => p.index === index);
            if (page) page.deepRead = true;
          }
          return null;
        } catch (err) {
          if (err instanceof RefusedError) {
            refusals++;
            return null;
          }
          // Truncation and over-size both mean "this bite was too big".
          // Halving is the answer to both, down to a single page.
          const smaller = await subdivideChunk(usable, inventory, chunk);
          if (smaller && smaller.length > 0) return smaller;

          /* A single page that still reads short is kept, not discarded: a
             partial list of real repairs beats none. But it is recorded, and
             the customer is told the count did not reconcile. */
          if (err instanceof ShortReadError && err.partial) {
            collected.push({ chunk, result: err.partial });
            for (const index of chunk.pageIndices) {
              const page = inventory.pages.find((p) => p.index === index);
              if (page) page.deepRead = true;
              shortPages.push({ page: index, counted: err.counted, extracted: err.extracted });
            }
            return null;
          }

          for (const index of chunk.pageIndices) {
            const page = inventory.pages.find((p) => p.index === index);
            if (page) {
              page.status = "failed";
              page.failureReason =
                err instanceof TruncatedError
                  ? "This page held more than we could read in one pass."
                  : "This page could not be read in detail.";
            }
          }
          console.error(`[re10Extract] gave up on ${chunk.label}:`, err);
          return null;
        }
      });
      for (const more of retries) if (more) queue.push(...more);
    }

    if (collected.length === 0) {
      return {
        ok: false,
        reason: refusals > 0 ? "refused" : "failed",
        message:
          refusals > 0
            ? "We could not analyze that document automatically. Send it to us directly and we will review it by hand."
            : "We could not read those documents. A clearer scan, or a photo of each page, usually fixes it.",
        inventory,
      };
    }

    const { result, trail } = mergeExtractions(collected, inventory);
    const duplicates = findDuplicatePairs(result.repairs);
    const quantityConflicts = findQuantityConflicts(result.repairs, duplicates);

    if (shortPages.length > 0) {
      const total = shortPages.reduce((sum, p) => sum + (p.counted - p.extracted), 0);
      result.documentNotes.push(
        `On ${shortPages.length} page(s) we counted about ${total} more request(s) than we could list individually. ` +
          `Check the list below against your document and add anything missing before pricing.`,
      );
    }

    const summary = summarizeInventory(inventory);
    if (summary.failed > 0) {
      result.documentNotes.push(
        `${summary.failed} of ${summary.totalPages} page(s) could not be read: ` +
          summary.failedPages.map((p) => `${p.filename} page ${p.pageInFile}`).join(", ") +
          ". Anything on those pages is NOT in this price.",
      );
    }

    return { ok: true, result, inventory, trail, duplicates, quantityConflicts, usage };
  } catch (err) {
    return { ...classifyError(err, "re10Extract"), inventory };
  }
}

class TruncatedError extends Error {}
class RefusedError extends Error {}

/**
 * The model counted more requests on the page than it listed.
 *
 * Treated exactly like truncation: halve the bite and read it again. It is a
 * different cause with the same cure, and the same consequence if ignored - a
 * quote for a fraction of the work the customer asked about.
 */
class ShortReadError extends Error {
  /** The list we did get. Kept when even a single page cannot do better. */
  partial?: ExtractionResult;
  constructor(readonly counted: number, readonly extracted: number, label: string) {
    super(`${label}: counted ${counted} requests, extracted ${extracted}`);
  }
}

async function extractChunk(
  chunk: PageChunk,
  client: Anthropic,
): Promise<{ result: ExtractionResult; tokens: { inputTokens: number; outputTokens: number } }> {
  const stream = client.beta.messages.stream({
    model: DEEP_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: EXTRACTION_SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: EXTRACTION_SCHEMA as unknown as Record<string, unknown> },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `--- ${chunk.label} ---` },
          chunk.mimeType === PDF_TYPE
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
          {
            type: "text",
            text:
              "Extract every repair request on THESE pages only. Copy each request verbatim, never invent a measurement, " +
              "and flag anything that needs an onsite evaluation. If a request continues from a previous page, capture " +
              "what is written here; do not guess at the missing part. Read handwritten annotations as carefully as printed text.",
          },
        ],
      },
    ],
  } as Anthropic.Beta.Messages.MessageCreateParamsStreaming);

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") throw new RefusedError("classifier declined");

  /**
   * THE CHECK THAT WAS MISSING, AND THE REASON THIS FILE WAS REWRITTEN.
   *
   * A structured response that hits the token ceiling still parses: the decoder
   * closes the array and hands back a valid, shorter repair list. Without this
   * branch a sixty-item document silently became a twelve-item quote. Treat it
   * as a chunk failure so the retry ladder halves the bite and reads it again.
   */
  if (message.stop_reason === "max_tokens") throw new TruncatedError(chunk.label);

  const text = message.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("extraction returned no text");

  const result = JSON.parse(text.text) as ExtractionResult;

  /* RECONCILE THE COUNT AGAINST THE LIST. The model counts the requests on the
     page before extracting them, and counting is much easier than extracting -
     so when the two disagree, the count is the one to believe and the list is
     short. Measured at 52 of 65 on a three-page document with no truncation
     anywhere near the token ceiling. */
  const counted = result.requestCountOnPages ?? 0;
  const extracted = result.repairs.length + result.unmapped.length;
  if (counted > extracted) {
    const short = new ShortReadError(counted, extracted, chunk.label);
    short.partial = result;
    throw short;
  }

  return {
    result,
    tokens: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
  };
}

/**
 * Fold per-chunk reads into one result.
 *
 * Repairs are CONCATENATED, not merged: two chunks reading the same page range
 * is impossible by construction, and two genuinely similar repairs on different
 * pages are usually two repairs. Restatements are found afterwards by
 * `findDuplicatePairs` and put to the customer as a question, because silently
 * dropping one would be the same silent-vanish bug in a new coat.
 *
 * Document-level fields take the first confident answer and record the rest in
 * the trail, so a deadline printed on page 1 is not overwritten by a blank on
 * page 40.
 */
function mergeExtractions(
  collected: { chunk: PageChunk; result: ExtractionResult }[],
  inventory: PageInventory,
): { result: ExtractionResult; trail: AuditTrail } {
  const trail = emptyTrail();
  const repairs: ExtractedRepair[] = [];
  const unmapped: UnmappedItem[] = [];
  const documentNotes: string[] = [];
  let propertyAddress: string | null = null;
  let closingDate: string | null = null;
  let repairDeadline: string | null = null;
  let looksLikeRe10 = false;

  // Deterministic order regardless of which chunk finished first.
  const ordered = [...collected].sort(
    (a, b) => (a.chunk.pageIndices[0] ?? 0) - (b.chunk.pageIndices[0] ?? 0),
  );

  for (const { chunk, result } of ordered) {
    const firstPage = chunk.pageIndices[0];
    const page = inventory.pages.find((p) => p.index === firstPage);
    const source = {
      pageIndex: firstPage ?? 0,
      filename: page?.filename ?? chunk.label,
      sheet: page?.sheet ?? null,
      quote: null as string | null,
    };

    for (const repair of result.repairs) {
      repairs.push(repair);
      addFact(trail, {
        key: normalizeKey(repair.kind, repair.location ?? "", repair.verbatim),
        label: repair.verbatim.slice(0, 120),
        factType: "repair",
        value: repair.quantity ?? null,
        unit: null,
        derivation:
          repair.quantity == null
            ? "No measurement stated in the document; the engine prices the typical size and says so."
            : `Measurement stated in the document: ${repair.quantity}.`,
        status: repair.quantity == null ? "assumed" : "confirmed",
        sources: [{ ...source, quote: repair.verbatim.slice(0, 200) }],
      });
    }

    for (const item of result.unmapped) {
      unmapped.push(item);
      addFact(trail, {
        key: normalizeKey("unmapped", item.verbatim),
        label: item.verbatim.slice(0, 120),
        factType: "not-priced",
        value: null,
        unit: null,
        derivation: item.reason,
        status: "excluded",
        sources: [{ ...source, quote: item.verbatim.slice(0, 200) }],
      });
    }

    for (const note of result.documentNotes) {
      if (!documentNotes.includes(note)) documentNotes.push(note);
    }
    if (!propertyAddress && result.propertyAddress) propertyAddress = result.propertyAddress;
    if (!closingDate && result.closingDate) closingDate = result.closingDate;
    if (!repairDeadline && result.repairDeadline) repairDeadline = result.repairDeadline;
    if (result.looksLikeRe10) looksLikeRe10 = true;
  }

  return {
    result: { repairs, unmapped, propertyAddress, closingDate, repairDeadline, looksLikeRe10, documentNotes },
    trail,
  };
}

export function classifyError(
  err: unknown,
  tag: string,
): { ok: false; reason: ExtractionFailure; message: string } {
  if (err instanceof Anthropic.RateLimitError) {
    return { ok: false, reason: "busy", message: "Document analysis is busy. Try again in a moment." };
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    console.error(`[${tag}] credentials rejected:`, err);
    return { ok: false, reason: "not-configured", message: "Document analysis is not configured correctly." };
  }
  if (err instanceof Anthropic.InternalServerError) {
    return { ok: false, reason: "busy", message: "Document analysis is temporarily unavailable. Try again shortly." };
  }
  // APIConnectionError subclasses APIError in the TS SDK, so it must be checked
  // before the base class or it is never reached.
  if (err instanceof Anthropic.APIConnectionError) {
    return { ok: false, reason: "busy", message: "Could not reach the analysis service. Try again shortly." };
  }
  console.error(`[${tag}] extraction failed:`, err);
  return {
    ok: false,
    reason: "failed",
    message: "We could not read those documents. A clearer scan or a photo of each page usually fixes it.",
  };
}
