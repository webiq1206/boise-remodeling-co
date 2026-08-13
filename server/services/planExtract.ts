import Anthropic from "@anthropic-ai/sdk";
import {
  PLAN_EXTRACTION_SCHEMA,
  PLAN_EXTRACTION_SYSTEM_PROMPT,
  type PlanExtractionResult,
} from "@/shared/plans/extraction";
import { mergePlanReads, type ChunkedRead } from "@/shared/plans/merge";
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
import type { AuditTrail } from "@/shared/documents/auditTrail";
import { classifyError } from "@/server/services/re10Extract";

/**
 * Reading a plan set with Claude, at the size plan sets actually arrive in.
 *
 * WHAT THIS REPLACED. Every sheet went into ONE request. That could not work
 * and the evidence was already in the repo: a 13.2MB, 27-sheet scanned set
 * went through while a 4.7MB, 5-sheet vector set was rejected outright, even
 * though each of those five sheets read fine alone. The binding limit is the
 * RASTERISED weight of a 36x24 drawing, not bytes on disk, so no ceiling in
 * bytes could ever be tuned into correctness - and one heavy sheet took the
 * whole set down with it. A hundred-page permit set had no chance at all.
 *
 * Now the set is paginated, every page is indexed cheaply, and only the sheets
 * that carry quantities get the expensive read - in small parallel chunks, with
 * a retry ladder that halves a rejected chunk down to a single page. A sheet we
 * genuinely cannot read costs exactly that sheet, and is reported as such.
 */

export interface PlanInput {
  filename: string;
  mimeType: string;
  data: Buffer;
}

export interface PlanExtractionSuccess {
  ok: true;
  result: PlanExtractionResult;
  inventory: PageInventory;
  trail: AuditTrail;
  duplicateRoomsMerged: number;
  usage: { inputTokens: number; outputTokens: number };
}

export type PlanExtractionOutcome =
  | PlanExtractionSuccess
  | {
      ok: false;
      reason: "not-configured" | "busy" | "refused" | "too-large" | "failed";
      message: string;
      inventory?: PageInventory;
    };

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PDF_TYPE = "application/pdf";
const DEEP_MODEL = "claude-opus-5";
const DEEP_CONCURRENCY = 5;

export function isPlanExtractionConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

class TruncatedError extends Error {}
class RefusedError extends Error {}

export async function extractPlans(files: PlanInput[]): Promise<PlanExtractionOutcome> {
  if (!isPlanExtractionConfigured()) {
    return { ok: false, reason: "not-configured", message: "Plan analysis is not configured on this environment." };
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
        "That plan set is larger than we can accept in one upload. Send it in two batches and we will read both.",
    };
  }

  const client = new Anthropic();
  const inventory = await buildInventory(usable);

  if (inventory.pages.length === 0) {
    return {
      ok: false,
      reason: "failed",
      message:
        "We could not open any pages from those files. A PDF exported from the drawing software usually works best.",
      inventory,
    };
  }

  try {
    // Pass one: index every sheet. Cheap, complete, and the evidence that the
    // whole set was looked at rather than sampled.
    await censusPages(usable, inventory, client);

    // Pass two: the expensive read, only where the index found quantities.
    const targets = inventory.pages.filter((p) => p.status === "read" && p.pricingRelevant);
    if (targets.length === 0) {
      const coverage = summarizeInventory(inventory);
      return {
        ok: false,
        reason: "failed",
        message:
          coverage.read === 0
            ? "We could not read those drawings."
            : `We read all ${coverage.totalPages} sheets, but none of them carry the room areas or schedules we price from. The floor plans, the demolition plan and any schedules are the sheets that do.`,
        inventory,
      };
    }

    const chunks = await buildChunks(usable, inventory, targets.map((p) => p.index), DEEP_CHUNK_PAGES);
    const reads: ChunkedRead[] = [];
    const usage = { inputTokens: 0, outputTokens: 0 };
    let refusals = 0;

    const queue: PageChunk[] = [...chunks];
    while (queue.length > 0) {
      const wave = queue.splice(0, queue.length);
      const retries = await mapWithConcurrency(wave, DEEP_CONCURRENCY, async (chunk) => {
        try {
          const { result, tokens } = await extractChunk(chunk, client);
          const first = inventory.pages.find((p) => p.index === chunk.pageIndices[0]);
          reads.push({
            result,
            pageIndices: chunk.pageIndices,
            filename: first?.filename ?? chunk.label,
            sheet: first?.sheet ?? null,
          });
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
          const smaller = await subdivideChunk(usable, inventory, chunk);
          if (smaller && smaller.length > 0) return smaller;
          for (const index of chunk.pageIndices) {
            const page = inventory.pages.find((p) => p.index === index);
            if (page) {
              page.status = "failed";
              page.failureReason =
                err instanceof TruncatedError
                  ? "This sheet carried more than we could read in one pass."
                  : "This sheet could not be read in detail.";
            }
          }
          console.error(`[planExtract] gave up on ${chunk.label}:`, err);
          return null;
        }
      });
      for (const more of retries) if (more) queue.push(...more);
    }

    if (reads.length === 0) {
      return {
        ok: false,
        reason: refusals > 0 ? "refused" : "failed",
        message:
          refusals > 0
            ? "We could not analyze those drawings automatically. Send them over and we will review them by hand."
            : "We could not read those drawings.",
        inventory,
      };
    }

    const merged = mergePlanReads(reads);
    const coverage = summarizeInventory(inventory);
    if (coverage.failed > 0) {
      merged.result.warnings.push(
        `${coverage.failed} of ${coverage.totalPages} sheet(s) could not be read: ` +
          coverage.failedPages.map((p) => `${p.filename} page ${p.pageInFile}`).join(", ") +
          ". Anything shown only on those sheets is NOT in this estimate.",
      );
    }

    return {
      ok: true,
      result: merged.result,
      inventory,
      trail: merged.trail,
      duplicateRoomsMerged: merged.duplicateRoomsMerged,
      usage,
    };
  } catch (err) {
    const classified = classifyError(err, "planExtract");
    return { ...classified, inventory };
  }
}

async function extractChunk(
  chunk: PageChunk,
  client: Anthropic,
): Promise<{ result: PlanExtractionResult; tokens: { inputTokens: number; outputTokens: number } }> {
  const stream = client.beta.messages.stream({
    model: DEEP_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: PLAN_EXTRACTION_SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: PLAN_EXTRACTION_SCHEMA as unknown as Record<string, unknown> },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `--- ${chunk.label} ---` },
          {
            type: "document" as const,
            source: { type: "base64" as const, media_type: "application/pdf" as const, data: chunk.data.toString("base64") },
          },
          {
            type: "text",
            text:
              "Read ONLY the sheets above and return what they state. This is part of a larger set, so do not " +
              "infer anything about sheets you cannot see, and do not report a total for the project unless a sheet " +
              "here prints one. Tag every number with how you got it, and return null rather than a number you are " +
              "unsure of. Read handwritten markup and revision clouds as carefully as printed text.",
          },
        ],
      },
    ],
  } as Anthropic.Beta.Messages.MessageCreateParamsStreaming);

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") throw new RefusedError("classifier declined");
  // Truncated JSON parses as a smaller house. Retry at a smaller bite instead.
  if (message.stop_reason === "max_tokens") throw new TruncatedError(chunk.label);

  const text = message.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("plan extraction returned no text");

  return {
    result: JSON.parse(text.text) as PlanExtractionResult,
    tokens: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
  };
}
