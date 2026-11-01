import { NextRequest, NextResponse } from "next/server";
import { clientKeyFrom, rateLimit } from "@/lib/rateLimit";
import { loadAcceptedRequest } from "@/server/services/inquiryAcceptance";
import { verifyRequestDetailsToken } from "@/server/services/requestDetailsToken";
import { storeRequestFile } from "@/server/services/requestFiles";
import { MAX_REQUEST_FILE_BYTES, MAX_REQUEST_FILES } from "@/shared/requestFiles";

/**
 * One photo, plan or file for a short request that is already saved.
 *
 * Multipart {requestId, token, file}. The browser sends files one at a time AFTER step 1 was
 * accepted, so the lead never waits on an upload and one failed file costs only that file. The
 * stored key is returned to the browser, which attaches it through /api/consultation/details;
 * that is where the links reach the email, the lead dashboard and p5 intake.
 *
 * Messages name the problem only: the success screen follows each one with "Try again or text it
 * to us".
 */

/** A file plus the multipart envelope. Anything larger is refused before it is read. */
const MAX_BODY_BYTES = MAX_REQUEST_FILE_BYTES + 64 * 1024;

export async function POST(request: NextRequest) {
  const byIp = rateLimit(clientKeyFrom(request.headers, "request-files"), 40, 15 * 60 * 1000);
  if (!byIp.ok) {
    return NextResponse.json(
      { stored: false, message: "Too many uploads at once." },
      { status: 429, headers: { "Retry-After": String(byIp.retryAfterSeconds) } },
    );
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { stored: false, message: "That file is over 20 MB." },
      { status: 413 },
    );
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ stored: false, message: "We could not read that file." }, { status: 400 });
  }
  const requestId = String(form.get("requestId") ?? "").slice(0, 64);
  const token = String(form.get("token") ?? "").slice(0, 400);
  const check = verifyRequestDetailsToken(requestId, token);
  if (!check.ok) {
    return NextResponse.json(
      { stored: false, message: "We could not match this file to your request." },
      { status: check.reason === "expired" ? 410 : 403 },
    );
  }
  const perRequest = rateLimit(`request-files-id:${requestId}`, MAX_REQUEST_FILES * 2, 60 * 60 * 1000);
  if (!perRequest.ok) {
    return NextResponse.json(
      { stored: false, message: "Too many uploads for one request." },
      { status: 429 },
    );
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ stored: false, message: "No file arrived." }, { status: 400 });
  }
  try {
    if (!(await loadAcceptedRequest(requestId))) {
      return NextResponse.json(
        { stored: false, message: "We could not find your request." },
        { status: 404 },
      );
    }
    const result = await storeRequestFile(requestId, file);
    if (!result.ok) {
      return NextResponse.json({ stored: false, message: result.message }, { status: result.status });
    }
    return NextResponse.json({
      stored: true,
      file: { key: result.file.key, name: result.file.name, size: result.file.size, contentType: result.file.contentType },
    });
  } catch (error) {
    console.error("[request-files] Store failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { stored: false, message: "We could not save it just now." },
      { status: 503 },
    );
  }
}
