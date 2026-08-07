import { NextRequest, NextResponse } from "next/server";
import { extractPlans, isPlanExtractionConfigured, type PlanInput } from "@/server/services/planExtract";
import { assessPlanQuality } from "@/shared/plans/extraction";
import { planMeasurements } from "@/shared/plans/estimateInput";
import {
  classifyUpload,
  resolveMimeType,
  MAX_UPLOAD_FILES,
  MAX_TOTAL_UPLOAD_BYTES,
  READABLE_FORMATS_LABEL,
} from "@/shared/re10/uploads";
import { uploadFile } from "@/lib/storage/blob";
import { clientKeyFrom, rateLimit } from "@/lib/rateLimit";
import { randomUUID } from "crypto";

/**
 * Upload a plan set, get back measurements - and an honest verdict on whether
 * they are good enough to tighten a price.
 *
 * NO PRICE IS RETURNED HERE. Same split as the RE-10 flow: read first, let the
 * customer correct what we read, price afterwards. On plans the correction step
 * matters more, not less - these are the numbers the whole estimate rests on,
 * and the person uploading them knows their own house better than we do.
 *
 * THE VERDICT IS THE POINT. `narrowing` says how far the range may tighten on
 * the strength of this read, and it is computed here from the extraction's own
 * self-reported sources rather than assumed from the fact that a file arrived.
 * A plan set whose dimensions were paced off a scale bar earns nothing.
 */

export const runtime = "nodejs";
// A 40-sheet permit set takes real time to read.
export const maxDuration = 300;

/* Same reasoning as the RE-10 analyze limit: unauthenticated route, real model
   tokens per accepted request. Plan sets are heavier and retried less often. */
const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  const limit = rateLimit(clientKeyFrom(request.headers, "plans-analyze"), RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate-limited", message: "Too many uploads in a short time. Wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (!isPlanExtractionConfigured()) {
    return NextResponse.json(
      {
        error: "not-configured",
        message: "Plan analysis is not switched on yet. Send your plans over and we will price them by hand.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "failed", message: "Could not read the upload." }, { status: 400 });
  }

  const uploaded = form.getAll("files").filter((f): f is File => f instanceof File);
  if (uploaded.length === 0) {
    return NextResponse.json({ error: "failed", message: "No files were attached." }, { status: 400 });
  }
  if (uploaded.length > MAX_UPLOAD_FILES) {
    return NextResponse.json(
      { error: "failed", message: `Please send at most ${MAX_UPLOAD_FILES} files at a time.` },
      { status: 400 },
    );
  }

  const rejected = uploaded.filter((f) => classifyUpload(f.name, f.type) === "rejected");
  if (rejected.length > 0) {
    return NextResponse.json(
      {
        error: "failed",
        message: `We can read ${READABLE_FORMATS_LABEL}. These are not supported: ${rejected.map((f) => f.name).join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const total = uploaded.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_TOTAL_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: "too-large",
        message:
          "That plan set is too large to analyze in one go. Send the floor plans, the demolition plan and any schedules - those are the sheets we price from - rather than the full set.",
      },
      { status: 400 },
    );
  }

  const files: PlanInput[] = [];
  for (const f of uploaded) {
    files.push({
      filename: f.name,
      mimeType: resolveMimeType(f.name, f.type),
      data: Buffer.from(await f.arrayBuffer()),
    });
  }

  const readable = files.filter((f) => classifyUpload(f.filename, f.mimeType) === "readable");
  const attachedOnly = files
    .filter((f) => classifyUpload(f.filename, f.mimeType) === "attachment")
    .map((f) => f.filename);

  // Keep the originals. Non-fatal, same as the RE-10 route: a storage problem
  // must not cost someone the read they waited two minutes for.
  const batch = randomUUID();
  const stored: { filename: string; url: string }[] = [];
  await Promise.all(
    files.map(async (f, i) => {
      try {
        stored.push({ filename: f.filename, url: await uploadFile(`plans/${batch}/${i}-${f.filename}`, f.data, f.mimeType) });
      } catch (err) {
        console.error("[plans/analyze] could not store upload:", err);
      }
    }),
  );

  if (readable.length === 0) {
    return NextResponse.json(
      {
        error: "nothing-readable",
        message: `We have got ${attachedOnly.join(", ")}, but we cannot read ${attachedOnly.length === 1 ? "that format" : "those formats"} automatically. Send the drawings as a PDF and we will read them.`,
        batch,
        stored,
        attachedOnly,
      },
      { status: 422 },
    );
  }

  const outcome = await extractPlans(readable);
  if (!outcome.ok) {
    const status = outcome.reason === "busy" || outcome.reason === "not-configured" ? 503 : 422;
    return NextResponse.json({ error: outcome.reason, message: outcome.message, batch, stored }, { status });
  }

  const result = outcome.result;

  return NextResponse.json({
    batch,
    stored,
    attachedOnly,
    ...result,
    /** Diagnostics, shown to the customer as plainly as they are computed. */
    quality: assessPlanQuality(result),
    /**
     * What the estimator may use, or null when the read did not earn it.
     *
     * STILL NO PRICE HERE. These are the measurements only, so the customer can
     * confirm or correct them before anything is priced on them - the same read
     * first, price after split the RE-10 flow uses, and it matters more here
     * because these numbers ARE the estimate. Nothing customer-facing in this
     * block can carry a cost or a margin; it is floor area, ceiling height and
     * room counts.
     */
    measurements: planMeasurements(result),
    usage: outcome.usage,
  });
}
