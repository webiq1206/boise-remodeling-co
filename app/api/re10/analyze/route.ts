import { NextRequest, NextResponse } from "next/server";
import { extractRepairs, isExtractionConfigured, type ExtractionInput } from "@/server/services/re10Extract";
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
import { summarizeInventory, describeCoverage } from "@/shared/documents/pageInventory";
import { renderAuditTrail } from "@/shared/documents/auditTrail";
import { assessReadiness } from "@/shared/documents/readiness";

/**
 * Upload an RE-10 and get back the repairs it contains.
 *
 * NO PRICE IS RETURNED HERE, and that is the point. The homeowner uploads,
 * sees what we read, and corrects it - all before giving us a phone number.
 * Pricing lives behind /api/re10/estimate, which requires contact details.
 * Splitting the two is what makes the gate honest: they are not paying with
 * their contact information for the privilege of finding out we misread their
 * document.
 *
 * Files are stored as well as analyzed, because the team needs the original
 * RE-10 attached to the lead. Storage failures are non-fatal - a homeowner who
 * uploaded a valid document should get their repair list even if our blob
 * store is having a bad day.
 *
 * READABLE AND ATTACHED ARE DIFFERENT THINGS. A Word copy of a repair addendum
 * or a HEIC straight off a phone cannot be sent to the model, but it is still
 * the document the team needs. Those are stored and named back to the uploader
 * as attached-not-read, rather than rejected at the door or - worse - accepted
 * silently and left out of the analysis.
 */

export const runtime = "nodejs";
// Analysis of a long inspection report with photos genuinely takes a while.
export const maxDuration = 300;

/* Each accepted request spends real model tokens on up to 12 files, with no
   login in front of it. Per-IP fixed window: generous enough for a homeowner
   re-trying a failed read, hostile to a loop. */
const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  const limit = rateLimit(clientKeyFrom(request.headers, "re10-analyze"), RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate-limited", message: "Too many uploads in a short time. Wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (!isExtractionConfigured()) {
    // 503, not 500: the code is fine, the environment is not configured. The
    // UI uses this to offer the manual path instead of showing an error.
    return NextResponse.json(
      {
        error: "not-configured",
        message:
          "Automatic document review is not switched on yet. Send your RE-10 to us directly and we will review it by hand.",
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
        error: "failed",
        message:
          "Those files are too large together. The RE-10 plus the relevant inspection pages is usually enough - the full report rarely is.",
      },
      { status: 400 },
    );
  }

  const files: ExtractionInput[] = [];
  for (const f of uploaded) {
    files.push({
      filename: f.name,
      // Resolved from the extension when the browser declares nothing. Files
      // dropped from an email client or a scanner folder routinely arrive as
      // `application/octet-stream`, and taking that at face value would make a
      // dropped PDF unreadable while the same PDF picked from a dialog worked.
      mimeType: resolveMimeType(f.name, f.type),
      data: Buffer.from(await f.arrayBuffer()),
    });
  }

  const readable = files.filter((f) => classifyUpload(f.filename, f.mimeType) === "readable");
  const attachedOnly = files
    .filter((f) => classifyUpload(f.filename, f.mimeType) === "attachment")
    .map((f) => f.filename);

  // Keep the originals so the team has the actual RE-10 on the lead. Deliberately
  // not awaited-and-failed: a storage outage must not cost the homeowner their
  // analysis, and we would rather have the repair list than the file.
  const batch = randomUUID();
  const stored: { filename: string; url: string }[] = [];
  await Promise.all(
    files.map(async (f, i) => {
      try {
        const url = await uploadFile(`re10/${batch}/${i}-${f.filename}`, f.data, f.mimeType);
        stored.push({ filename: f.filename, url });
      } catch (err) {
        console.error("[re10/analyze] could not store upload:", err);
      }
    }),
  );

  // Nothing to send the model. The files are already stored, so the team still
  // has them - say that, and ask for the one format that unblocks the range,
  // rather than reporting a generic failure over a document we do hold.
  if (readable.length === 0) {
    return NextResponse.json(
      {
        error: "nothing-readable",
        message: `We have got ${attachedOnly.join(", ")} and our team can open ${attachedOnly.length === 1 ? "it" : "them"}, but we cannot read ${attachedOnly.length === 1 ? "that format" : "those formats"} automatically. Add a PDF or a photo of the RE-10 for an instant range, or send it over and we will price it by hand.`,
        batch,
        stored,
        attachedOnly,
      },
      { status: 422 },
    );
  }

  const outcome = await extractRepairs(readable);

  if (!outcome.ok) {
    const status = outcome.reason === "busy" ? 503 : outcome.reason === "not-configured" ? 503 : 422;
    return NextResponse.json(
      {
        error: outcome.reason,
        message: outcome.message,
        batch,
        stored,
        // Even a failed read reports what it managed to open, so the customer
        // is told which pages were the problem rather than that "it" failed.
        coverage: outcome.inventory ? summarizeInventory(outcome.inventory) : null,
      },
      { status },
    );
  }

  const readiness = assessReadiness({
    inventory: outcome.inventory,
    trail: outcome.trail,
    hasPriceableContent: outcome.result.repairs.length > 0 || outcome.result.unmapped.length > 0,
  });

  const coverage = summarizeInventory(outcome.inventory);

  /* The audit trail is INTERNAL. It names sheets, quotes source text and shows
     how each quantity was arrived at - useful to an estimator checking a
     number, and noise to a customer looking at a price. It rides the lead, not
     this response. */
  console.info(
    `[re10/analyze] batch=${batch} pages=${coverage.totalPages} read=${coverage.read} ` +
      `failed=${coverage.failed} deep=${coverage.deepRead} repairs=${outcome.result.repairs.length} ` +
      `unmapped=${outcome.result.unmapped.length} duplicates=${outcome.duplicates.length} ` +
      `conflicts=${outcome.quantityConflicts.length}`,
  );

  return NextResponse.json({
    batch,
    stored,
    // Named back so nobody believes a file was analysed when it was only filed.
    attachedOnly,
    ...outcome.result,
    /* Page-by-page evidence that the whole document was read. This is the
       answer to "did you look at all 104 sheets", and it is a fact rather
       than a reassurance. */
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
    /* Restatements and contradictions are put to the customer as questions
       rather than resolved behind their back: silently merging two repairs
       loses scope, and silently picking one of two quantities is a guess. */
    duplicates: outcome.duplicates.map((d) => ({
      a: d.a,
      b: d.b,
      reason: d.reason,
      descriptionA: outcome.result.repairs[d.a]?.verbatim ?? "",
      descriptionB: outcome.result.repairs[d.b]?.verbatim ?? "",
    })),
    quantityConflicts: outcome.quantityConflicts.map((c) => ({
      a: c.a,
      b: c.b,
      quantityA: c.quantityA,
      quantityB: c.quantityB,
      descriptionA: outcome.result.repairs[c.a]?.verbatim ?? "",
      descriptionB: outcome.result.repairs[c.b]?.verbatim ?? "",
    })),
    /* Provenance, round-tripped so it can ride the lead. Descriptive only:
       nothing here reaches the pricing engine, so a client that edits it
       changes what the team reads about where a number came from and cannot
       change the number. The customer is never shown it. */
    coverageSummary: describeCoverage(outcome.inventory),
    auditTrail: renderAuditTrail(outcome.trail),
    readiness: {
      canFinalize: readiness.canFinalize,
      confidence: readiness.confidence,
      summary: readiness.summary,
      blockers: readiness.blockers,
      questions: readiness.questions,
    },
  });
}
