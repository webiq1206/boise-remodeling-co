import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientKeyFrom, rateLimit } from "@/lib/rateLimit";
import { loadAcceptedRequest, saveAcceptedRequest } from "@/server/services/inquiryAcceptance";
import { verifyRequestDetailsToken } from "@/server/services/requestDetailsToken";
import { cleanDetails, mergeRequestDetails } from "@/server/services/requestDetailsMerge";
import { deliverRequestDetails } from "@/server/services/requestDetailsDelivery";
import { describeRequestFiles } from "@/server/services/requestFiles";
import { MAX_REQUEST_FILES } from "@/shared/requestFiles";

/**
 * Step 2 of the short request, and the attach step for its files.
 *
 * Posts {requestId, token, details, files} where the id and token came back from step 1 of
 * /api/consultation. The token is checked before anything is read; the details are merged into
 * that same stored lead (never overwriting a step 1 answer, never with a blank, and a repeat of
 * the same post changes nothing), and the addition is forwarded to every destination the lead
 * went to. No second conversion is recorded anywhere.
 */

const bodySchema = z.object({
  requestId: z.string().min(1).max(64),
  token: z.string().min(1).max(400),
  details: z
    .object({
      projectType: z.string().max(80).optional(),
      address: z.string().max(300).optional(),
      timing: z.string().max(40).optional(),
      email: z.string().max(200).optional(),
    })
    .optional(),
  files: z.array(z.string().max(300)).max(MAX_REQUEST_FILES).optional(),
});

export async function POST(request: NextRequest) {
  const byIp = rateLimit(clientKeyFrom(request.headers, "request-details"), 30, 15 * 60 * 1000);
  if (!byIp.ok) {
    return NextResponse.json(
      { saved: false, message: "Too many tries. Wait a moment, or call us." },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfterSeconds) } },
    );
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ saved: false, message: "We could not read that." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ saved: false, message: "We could not read that." }, { status: 400 });
  }
  const { requestId, token, details, files: fileKeys } = parsed.data;
  const check = verifyRequestDetailsToken(requestId, token);
  if (!check.ok) {
    return NextResponse.json(
      {
        saved: false,
        message:
          check.reason === "expired"
            ? "This page has been open a while, so we cannot add to your request from here. Call or text us and we will add it."
            : "We could not match this to your request. Call or text us and we will add it.",
      },
      { status: check.reason === "expired" ? 410 : 403 },
    );
  }
  const perRequest = rateLimit(`request-details-id:${requestId}`, 12, 60 * 60 * 1000);
  if (!perRequest.ok) {
    return NextResponse.json(
      { saved: false, message: "Too many tries. Wait a moment, or call us." },
      { status: 429, headers: { "Retry-After": String(perRequest.retryAfterSeconds) } },
    );
  }

  try {
    const stored = await loadAcceptedRequest(requestId);
    if (!stored) {
      return NextResponse.json(
        { saved: false, message: "We could not find your request. Call or text us and we will add it." },
        { status: 404 },
      );
    }
    const files = await describeRequestFiles(requestId, fileKeys ?? []);
    const merge = mergeRequestDetails(stored, details, files);
    if (!merge.changed) {
      if (merge.reason === "empty") {
        return NextResponse.json({ saved: false, message: "Add a detail first, or skip this step." }, { status: 400 });
      }
      return NextResponse.json({ saved: true, unchanged: true, files: files.map((file) => file.name) });
    }
    await saveAcceptedRequest(requestId, merge.patch);
    const delivery = deliverRequestDetails({
      request: merge.merged,
      block: merge.block,
      timing: cleanDetails(details).timing,
      projectType: cleanDetails(details).projectType,
      files,
    }).catch((error) => console.error("[request-details] Delivery failed:", error));
    try {
      after(() => delivery);
    } catch {
      /* outside a request scope (route verifier): the promise is already running */
    }
    return NextResponse.json({ saved: true, unchanged: false, files: files.map((file) => file.name) });
  } catch (error) {
    console.error("[request-details] Failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { saved: false, message: "We could not save that just now. Try again, or call us." },
      { status: 503 },
    );
  }
}
