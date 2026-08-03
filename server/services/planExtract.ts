import Anthropic from "@anthropic-ai/sdk";
import {
  PLAN_EXTRACTION_SCHEMA,
  PLAN_EXTRACTION_SYSTEM_PROMPT,
  type PlanExtractionResult,
} from "@/shared/plans/extraction";
import { MAX_TOTAL_UPLOAD_BYTES } from "@/shared/re10/uploads";

/**
 * Reading a plan set with Claude.
 *
 * Deliberately the same shape as the RE-10 extractor: one port, one outcome
 * type, every failure distinguishable. Plans differ in one way that matters -
 * they are big. A 42-sheet permit set at 36x24 inches is far more input than an
 * RE-10, so the ceilings here are about what fits rather than about format.
 */

export interface PlanInput {
  filename: string;
  mimeType: string;
  data: Buffer;
}

export type PlanExtractionOutcome =
  | { ok: true; result: PlanExtractionResult; usage: { inputTokens: number; outputTokens: number } }
  | { ok: false; reason: "not-configured" | "busy" | "refused" | "too-large" | "failed"; message: string };

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PDF_TYPE = "application/pdf";

export function isPlanExtractionConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function buildContent(files: PlanInput[]): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const file of files) {
    blocks.push({ type: "text", text: `--- ${file.filename} ---` });
    const data = file.data.toString("base64");
    if (file.mimeType === PDF_TYPE) {
      blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
    } else if (IMAGE_TYPES.has(file.mimeType)) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: file.mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data,
        },
      });
    }
  }
  blocks.push({
    type: "text",
    text: "Read these drawings and return the measurements needed to price the work. Tag every number with how you got it, and return null rather than a number you are unsure of.",
  });
  return blocks;
}

export async function extractPlans(files: PlanInput[]): Promise<PlanExtractionOutcome> {
  if (!isPlanExtractionConfigured()) {
    return { ok: false, reason: "not-configured", message: "Plan analysis is not configured on this environment." };
  }

  const usable = files.filter((f) => f.mimeType === PDF_TYPE || IMAGE_TYPES.has(f.mimeType));
  if (usable.length === 0) {
    return { ok: false, reason: "failed", message: "No readable PDF or image files were supplied." };
  }

  const total = usable.reduce((sum, f) => sum + f.data.byteLength, 0);
  if (total > MAX_TOTAL_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: "too-large",
      // Named advice, because "too large" alone leaves someone with a 40MB
      // permit set no idea what to do. The floor plans and schedules are the
      // sheets that matter; the structural details are not.
      message:
        "That plan set is too large to analyze in one go. Send the floor plans, the demolition plan and any schedules - those are the sheets we price from - rather than the full set.",
    };
  }

  const client = new Anthropic();

  try {
    const stream = client.beta.messages.stream({
      model: "claude-opus-5",
      // Roomier than the RE-10 extractor: a whole-house plan set can carry
      // thirty rooms plus door, window and fixture schedules, and a truncated
      // response would look like a small house rather than like an error.
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: PLAN_EXTRACTION_SYSTEM_PROMPT,
      output_config: {
        format: { type: "json_schema", schema: PLAN_EXTRACTION_SCHEMA as unknown as Record<string, unknown> },
      },
      messages: [{ role: "user", content: buildContent(usable) }],
    } as Anthropic.Beta.Messages.MessageCreateParamsStreaming);

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return {
        ok: false,
        reason: "refused",
        message: "We could not analyze those drawings automatically. Send them over and we will review them by hand.",
      };
    }
    // A plan set is the one input long enough to actually hit the ceiling, and
    // truncated JSON parses as nothing or, worse, as a smaller house.
    if (message.stop_reason === "max_tokens") {
      return {
        ok: false,
        reason: "too-large",
        message:
          "There was more in those drawings than we could read at once. Send the floor plans and schedules on their own and we will get a cleaner read.",
      };
    }

    const text = message.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return { ok: false, reason: "failed", message: "The analysis came back empty." };
    }

    return {
      ok: true,
      result: JSON.parse(text.text) as PlanExtractionResult,
      usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
    };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, reason: "busy", message: "Plan analysis is busy. Try again in a moment." };
    }
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error("[planExtract] credentials rejected:", err);
      return { ok: false, reason: "not-configured", message: "Plan analysis is not configured correctly." };
    }
    if (err instanceof Anthropic.InternalServerError) {
      return { ok: false, reason: "busy", message: "Plan analysis is briefly unavailable. Try again shortly." };
    }
    // APIConnectionError subclasses APIError in the TS SDK, so it must be
    // checked before the base class or it is never reached.
    if (err instanceof Anthropic.APIConnectionError) {
      return { ok: false, reason: "busy", message: "We could not reach the analysis service. Try again shortly." };
    }

    /**
     * THE CEILING THAT ACTUALLY BINDS IS NOT THE ONE WE MEASURE.
     *
     * Found by running four real sets: a 13.2MB, 27-sheet scanned permit set
     * went through, while a 4.7MB, 5-sheet stretch of a vector CAD remodel set
     * was rejected outright - and every one of those five sheets was read fine
     * on its own. Bytes on disk are a bad proxy, because what the API has to
     * carry is the RASTERISED sheet: a 36x24 inch drawing whose text has been
     * outlined to curves is enormously heavier than a scan of the same size.
     * So MAX_TOTAL_UPLOAD_BYTES cannot be retuned into correctness - a limit
     * in the wrong unit is wrong at every value.
     *
     * What can be fixed is the report. This landed in the generic catch below
     * and came back as "We could not read those drawings", which reads as "your
     * plans are bad" and leaves someone with nothing to do. It is the case the
     * "send the floor plans and schedules" advice was written for, so send them
     * there - and log enough to recognise the next one.
     */
    if (err instanceof Anthropic.APIError && (err.status === 413 || err.status === 400)) {
      console.error(
        `[planExtract] API rejected ${usable.length} file(s), ${(total / 1048576).toFixed(1)}MB: ${err.status} ${err.message}`,
      );
      return {
        ok: false,
        reason: "too-large",
        message:
          "There was more in those drawings than we could read at once. Send the floor plans, the demolition plan and any schedules - those are the sheets we price from - rather than the full set.",
      };
    }

    console.error(
      `[planExtract] failed on ${usable.length} file(s), ${(total / 1048576).toFixed(1)}MB:`,
      err,
    );
    return { ok: false, reason: "failed", message: "We could not read those drawings." };
  }
}
