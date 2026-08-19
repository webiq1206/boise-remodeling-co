import { NextRequest, NextResponse } from "next/server";
import { extractPlans, isPlanExtractionConfigured, type PlanInput } from "@/server/services/planExtract";
import { assessPlanQuality } from "@/shared/plans/extraction";
import { planMeasurements } from "@/shared/plans/estimateInput";
import {
  classifyUpload,
  resolveMimeType,
  MAX_UPLOAD_FILES,
  MAX_REQUEST_UPLOAD_BYTES,
  READABLE_FORMATS_LABEL,
} from "@/shared/re10/uploads";
import { uploadFile } from "@/lib/storage/blob";
import { clientKeyFrom, rateLimit } from "@/lib/rateLimit";
import { randomUUID } from "crypto";
import { summarizeInventory } from "@/shared/documents/pageInventory";
import { assessReadiness } from "@/shared/documents/readiness";
import { conflicts } from "@/shared/documents/auditTrail";

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

/**
 * THE UNIT CHANGED, SO THE LIMIT HAD TO.
 *
 * This was 6 per 10 minutes, set when one upload meant one request. Sets are
 * now split in the browser and arrive as a part per few sheets, so a single
 * legitimate 103-sheet submission is around 32 requests and the old ceiling
 * would have 429'd it from part seven onward - turning the fix for large sets
 * into a new way for large sets to fail. The limit is now high enough for two
 * full-size submissions and still bounds an abusive caller, and the real cost
 * control is MAX_PLAN_PAGES, which caps the sheets one visitor can send.
 */
const RATE_LIMIT = 150;
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

  /**
   * Custom instructions, and where this batch sits in the whole submission.
   *
   * A large set arrives as several parts, split in the browser (see
   * lib/planSplitter.ts). Each part is analysed on its own and the client
   * merges them, so nothing here has to hold a 124MB body in memory. The
   * offset keeps page numbers in the customer's own numbering.
   */
  const instructions = (form.get("instructions") ?? "").toString().slice(0, 2000).trim() || undefined;
  const pageOffsetRaw = Number(form.get("pageOffset") ?? 1);
  const pageOffset = Number.isFinite(pageOffsetRaw) && pageOffsetRaw >= 1 ? Math.floor(pageOffsetRaw) : 1;

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

  /**
   * A per-REQUEST guard, not a per-SET one.
   *
   * The browser splits a set into parts well under this, so a legitimate
   * upload never approaches it however many sheets it carries - the 123.8MB
   * commercial set that could not be uploaded at all arrives as twenty-odd
   * small parts. What remains here is a guard against a hand-crafted request,
   * where buffering an enormous body would cost the container rather than the
   * caller.
   */
  const total = uploaded.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_REQUEST_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: "too-large",
        message:
          "That batch is larger than we accept in one request. Reload the page and upload again; the drawings are split into batches automatically.",
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

  const outcome = await extractPlans(readable, { instructions, pageOffset });
  if (!outcome.ok) {
    const status = outcome.reason === "busy" || outcome.reason === "not-configured" ? 503 : 422;
    return NextResponse.json(
      {
        error: outcome.reason,
        message: outcome.message,
        batch,
        stored,
        coverage: outcome.inventory ? summarizeInventory(outcome.inventory) : null,
      },
      { status },
    );
  }

  const result = outcome.result;
  const coverage = summarizeInventory(outcome.inventory);

  /* Readiness is computed from the read itself: pages we could not open,
     values two sheets disagree about, and the stated total the whole
     cross-check depends on. A set can be perfectly legible and still not be
     ready, which is the case `assessPlanQuality` was already making about
     measurements and this extends to the document as a whole. */
  const readiness = assessReadiness({
    inventory: outcome.inventory,
    trail: outcome.trail,
    hasPriceableContent: result.rooms.length > 0 || result.scopeItems.length > 0,
    missingCriticalInputs:
      result.statedTotalSqFt == null
        ? [
            {
              label: "a stated total floor area",
              question: "What is the total square footage of the area being remodelled?",
              why:
                "No sheet in the set prints a total, so there is nothing to check our room-by-room read against. " +
                "Your number is genuinely independent of our reading of the drawings, which is exactly what makes it useful.",
            },
          ]
        : [],
  });

  console.info(
    `[plans/analyze] batch=${batch} pages=${coverage.totalPages} read=${coverage.read} ` +
      `failed=${coverage.failed} deep=${coverage.deepRead} rooms=${result.rooms.length} ` +
      `scope=${result.scopeItems.length} mergedRooms=${outcome.duplicateRoomsMerged} ` +
      `conflicts=${conflicts(outcome.trail).length}`,
  );

  return NextResponse.json({
    batch,
    stored,
    attachedOnly,
    ...result,
    /** Page-by-page proof the whole set was looked at, not sampled. */
    coverage,
    pages: outcome.inventory.pages.map((p) => ({
      index: p.index,
      filename: p.filename,
      page: p.pageInFile,
      status: p.status,
      kind: p.kind,
      medium: p.medium,
      sheet: p.sheet,
      title: p.title,
      deepRead: p.deepRead,
      failureReason: p.failureReason ?? null,
    })),
    /** Restated rooms counted once, and the count of how many that was. */
    duplicateRoomsMerged: outcome.duplicateRoomsMerged,
    /** Values two sheets disagree about. Asked, never silently resolved. */
    conflicts: conflicts(outcome.trail).map((c) => ({
      label: c.label,
      unit: c.unit,
      values: (c.competingValues ?? []).map((v) => ({
        value: v.value,
        sheet: v.source.sheet,
        page: v.source.pageIndex,
      })),
    })),
    readiness: {
      canFinalize: readiness.canFinalize,
      confidence: readiness.confidence,
      summary: readiness.summary,
      blockers: readiness.blockers,
      questions: readiness.questions,
    },
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
