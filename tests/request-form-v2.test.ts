import test from "node:test";
import assert from "node:assert/strict";

/**
 * Quote form v2 (owner, 1 November 2026): step 1 captures the lead, files upload after it, and
 * step 2 adds details to the SAME lead. These pin the pieces that do not need a server: the token,
 * the merge, file validation and the p5 intake payloads (initial and details).
 */

import { issueRequestDetailsToken, verifyRequestDetailsToken, REQUEST_DETAILS_TOKEN_TTL_SECONDS } from "../server/services/requestDetailsToken.ts";
import { mergeRequestDetails, cleanDetails } from "../server/services/requestDetailsMerge.ts";
import { checkRequestFile, contentMatchesType, safeRequestFileName, MAX_REQUEST_FILE_BYTES, MAX_REQUEST_FILES, REQUEST_FILE_ACCEPT } from "../shared/requestFiles.ts";
import { buildP5IntakeBody, P5_PROJECT_TYPE_BY_VISITOR_LABEL } from "../server/services/p5IntakeBridge.ts";
import { dashboardDetailsPayload, buildDetailsEmailHtml } from "../server/services/requestDetailsDelivery.ts";
import { zipFrom, DETAIL_PROJECT_TYPES } from "../shared/requestDetails.ts";

// The token module reads the secret on each call.
process.env.SESSION_SECRET = "request-form-v2-test-secret-0123456789";

const stored = {
  id: "7d1c3f7e-0000-4000-8000-000000000001",
  inquiryId: "11111111-1111-4111-8111-111111111111",
  name: "Jordan Example",
  phone: "(208) 555-0199",
  email: "",
  address: "",
  zip: "",
  city: "",
  projectType: "Home repair or remodel",
  message: "Kitchen counters and a leaking sink\n\nPreferred contact: Text me",
};

test("the details token opens only its own request, and only until it expires", () => {
  const now = Date.UTC(2026, 10, 1, 12);
  const token = issueRequestDetailsToken(stored.id, now);
  assert.ok(token);
  assert.deepEqual(verifyRequestDetailsToken(stored.id, token!, now), { ok: true });
  assert.deepEqual(verifyRequestDetailsToken(stored.id, token!, now + (REQUEST_DETAILS_TOKEN_TTL_SECONDS - 5) * 1000), { ok: true });
  assert.deepEqual(verifyRequestDetailsToken(stored.id, token!, now + (REQUEST_DETAILS_TOKEN_TTL_SECONDS + 5) * 1000), { ok: false, reason: "expired" });
  assert.deepEqual(verifyRequestDetailsToken("another-request", token!, now), { ok: false, reason: "mismatch" });
  const [body, sig] = token!.split(".");
  assert.equal(verifyRequestDetailsToken(stored.id, `${body}.${sig.slice(0, -2)}xx`, now).ok, false, "a changed signature fails");
  const forgedBody = Buffer.from(`${stored.id}|${Math.floor(now / 1000) + 10 ** 7}`).toString("base64url");
  assert.equal(verifyRequestDetailsToken(stored.id, `${forgedBody}.${sig}`, now).ok, false, "a longer expiry cannot be written in");
  assert.deepEqual(verifyRequestDetailsToken(stored.id, "", now), { ok: false, reason: "missing" });
  assert.equal(REQUEST_DETAILS_TOKEN_TTL_SECONDS, 7200, "short-lived: two hours");
  const secret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "";
  assert.equal(issueRequestDetailsToken(stored.id, now), null, "no secret: no token, step 2 is simply not offered");
  assert.deepEqual(verifyRequestDetailsToken(stored.id, token!, now), { ok: false, reason: "missing" });
  process.env.SESSION_SECRET = secret;
});

test("details fill only blanks and placeholders, never overwrite step 1, and repeat as a no-op", () => {
  const file = { key: `requests/${stored.id}/abc-kitchen.jpg`, name: "kitchen.jpg", url: "https://boiseremodeling.co/api/documents/local/x", contentType: "image/jpeg", size: 2_400_000 };
  const first = mergeRequestDetails(stored, { projectType: "Kitchen remodel", address: "123 Main St, Boise, ID 83702", timing: "1 to 3 months", email: "jordan@example.com" }, [file]);
  assert.equal(first.changed, true);
  if (!first.changed) return;
  assert.deepEqual(Object.keys(first.patch).sort(), ["address", "email", "message", "projectType", "zip"]);
  assert.equal(first.patch.projectType, "Kitchen remodel");
  assert.equal(first.patch.zip, "83702");
  assert.match(first.patch.message!, /^Kitchen counters and a leaking sink\n\nPreferred contact: Text me\n\nDETAILS ADDED \(ref [0-9a-f]{12}\)\nProject: Kitchen remodel\nAddress: 123 Main St, Boise, ID 83702\nTiming: 1 to 3 months\nEmail: jordan@example.com\nPhotos and files \(1\):\nkitchen\.jpg \(2\.3 MB\): https:\/\/boiseremodeling\.co\/api\/documents\/local\/x$/);

  // The same post again changes nothing.
  const again = mergeRequestDetails(first.merged, { projectType: "Kitchen remodel", address: "123 Main St, Boise, ID 83702", timing: "1 to 3 months", email: "jordan@example.com" }, [file]);
  assert.deepEqual(again, { changed: false, ref: first.ref, reason: "repeat" });

  // Step 1 answers stay: a different email, address and project type do not overwrite them.
  const later = mergeRequestDetails(first.merged, { projectType: "Bathroom remodel", address: "9 Other Rd", email: "else@example.com" });
  assert.equal(later.changed, true);
  if (!later.changed) return;
  assert.deepEqual(Object.keys(later.patch), ["message"], "only the notes grow");
  assert.match(later.block, /Address: 9 Other Rd/, "a differing value is still visible to the team");

  // Blanks are not details, and unknown option values are dropped rather than stored.
  assert.deepEqual(mergeRequestDetails(stored, { projectType: "", address: "  ", timing: "", email: "" }).changed, false);
  assert.deepEqual(cleanDetails({ projectType: "Pool", timing: "Yesterday", email: "nope", address: "  83702 " }), { projectType: "", address: "83702", timing: "", email: "" });
  const zipOnly = mergeRequestDetails(stored, { address: "83702" });
  assert.ok(zipOnly.changed && zipOnly.patch.zip === "83702" && zipOnly.patch.address === undefined, "a bare ZIP fills the ZIP, not the street");

  // A project type the visitor chose is never replaced; only step 1's placeholder is.
  const chosen = mergeRequestDetails({ ...stored, projectType: "kitchen" }, { projectType: "Bathroom remodel" });
  assert.ok(chosen.changed && chosen.patch.projectType === undefined);
  const callback = mergeRequestDetails({ ...stored, projectType: "Callback request" }, { projectType: "Basement finishing" });
  assert.ok(callback.changed && callback.patch.projectType === "Basement finishing");
  assert.equal(zipFrom("PO Box 12345, Meridian ID 83642-1234"), "83642");
});

test("step 2 project types are labels p5 already maps for HubSpot", () => {
  for (const option of DETAIL_PROJECT_TYPES) {
    if (option.value === "Something else") continue;
    assert.ok(P5_PROJECT_TYPE_BY_VISITOR_LABEL[option.value], `${option.value} is a label p5IntakeBridge maps`);
  }
});

test("file checks: photos and PDFs up to 20 MB, plain words for anything else", () => {
  assert.equal(MAX_REQUEST_FILES, 10);
  assert.equal(MAX_REQUEST_FILE_BYTES, 20 * 1024 * 1024);
  assert.equal(REQUEST_FILE_ACCEPT, "image/*,application/pdf,.heic,.heif");
  assert.deepEqual(checkRequestFile({ name: "kitchen.jpg", type: "image/jpeg", size: 1000 }), { ok: true, ext: "jpg", contentType: "image/jpeg" });
  assert.deepEqual(checkRequestFile({ name: "plans.pdf", type: "application/pdf", size: 1000 }), { ok: true, ext: "pdf", contentType: "application/pdf" });
  assert.deepEqual(checkRequestFile({ name: "IMG_0001.HEIC", type: "", size: 1000 }), { ok: true, ext: "heic", contentType: "image/heic" }, "untyped HEIC from a phone");
  assert.deepEqual(checkRequestFile({ name: "IMG_0002.heic", type: "application/octet-stream", size: 1000 }).ok, true);
  const big = checkRequestFile({ name: "scan.pdf", type: "application/pdf", size: MAX_REQUEST_FILE_BYTES + 1 });
  assert.deepEqual(big, { ok: false, reason: "scan.pdf was not added. Each file can be up to 20 MB." });
  const wrong = checkRequestFile({ name: "plan.dwg", type: "image/vnd.dwg", size: 1000 });
  assert.deepEqual(wrong, { ok: false, reason: "plan.dwg was not added. Send photos (JPEG, PNG, WebP or HEIC) or PDFs." });
  assert.equal(checkRequestFile({ name: "page.jpg", type: "text/html", size: 10 }).ok, false, "a typed file is judged by its type");
  assert.equal(checkRequestFile({ name: "empty.png", type: "image/png", size: 0 }).ok, false);
  // The bytes must agree with the claimed type.
  assert.equal(contentMatchesType("pdf", new TextEncoder().encode("%PDF-1.7 rest")), true);
  assert.equal(contentMatchesType("jpg", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), true);
  assert.equal(contentMatchesType("png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])), true);
  assert.equal(contentMatchesType("jpg", new TextEncoder().encode("<html><script>")), false);
  assert.equal(contentMatchesType("heic", Uint8Array.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])), true);
  assert.equal(safeRequestFileName("../../My Kitchen (1).JPG", "jpg"), "My-Kitchen-1.jpg");
});

test("the p5 intake payload carries the v2 contract on the initial post and the details post", () => {
  const initial = buildP5IntakeBody({
    name: "Jordan Example",
    phone: "(208) 555-0199",
    projectType: "Not sure",
    message: "CALLBACK REQUEST: call Jordan Example at (208) 555-0199. Best time: Morning.",
    inquiryId: stored.inquiryId,
    requestKind: "callback",
    contactPreference: "call",
    bestTime: "Morning",
    submissionKind: "initial",
  });
  assert.deepEqual(initial, {
    brand: "Boise Remodeling Co",
    name: "Jordan Example",
    form: "Remodeling consultation",
    source: "Organic Website",
    sourceDetail: "boiseremodeling.co consultation",
    projectType: "Not sure",
    phone: "(208) 555-0199",
    summary: "CALLBACK REQUEST: call Jordan Example at (208) 555-0199. Best time: Morning.",
    externalLeadId: `boiseremodeling-consultation:${stored.inquiryId}`,
    external_id: `boiseremodeling-consultation:${stored.inquiryId}`,
    submission_kind: "initial",
    request_kind: "callback",
    contact_preference: "call",
    best_time: "Morning",
  });

  const file = { key: "k", name: "plans.pdf", url: "https://boiseremodeling.co/api/documents/local/requests%2Fid%2Fplans.pdf", contentType: "application/pdf", size: 52_000 };
  const details = buildP5IntakeBody({
    name: "Jordan Example",
    phone: "(208) 555-0199",
    address: "123 Main St, Boise",
    zip: "83702",
    projectType: "Kitchen remodel",
    message: "Details added\n\nDETAILS ADDED (ref abc)\nProject: Kitchen remodel",
    inquiryId: stored.inquiryId,
    timeline: "1 to 3 months",
    files: [file],
    submissionKind: "details",
  });
  assert.equal(details.submission_kind, "details");
  assert.equal(details.external_id, initial.external_id, "external_id is stable across step 1 and step 2");
  assert.equal(details.externalLeadId, initial.externalLeadId, "an older intake files it on the same deal");
  assert.equal(details.projectType, "kitchen");
  assert.equal(details.timeline, "1 to 3 months");
  assert.equal(details.address, "123 Main St, Boise, 83702");
  assert.deepEqual(details.files, [{ name: "plans.pdf", url: file.url, contentType: "application/pdf", size: 52_000 }], "the storage key never leaves");
  assert.equal(details.request_kind, undefined);
});

test("the dashboard and email follow-ups name the same request and carry the links", () => {
  const block = "DETAILS ADDED (ref 0123456789ab)\nTiming: Soon\nPhotos and files (1):\nkitchen.jpg (2.3 MB): https://boiseremodeling.co/f";
  const files = [{ key: "k", name: "kitchen.jpg", url: "https://boiseremodeling.co/f", contentType: "image/jpeg", size: 2_400_000 }];
  const payload = dashboardDetailsPayload({ request: stored, block, timing: "Soon", projectType: "", files });
  assert.equal(payload.email, "no-email+2085550199@boiseremodeling.co");
  assert.equal(payload.timeline, "Soon");
  assert.equal(payload.source, "boiseremodeling.co details");
  assert.match(payload.finalNotes, /^Same request as the earlier lead from Jordan Example\.\n\nDETAILS ADDED/);
  assert.deepEqual(payload.estimate, { submissionKind: "details", requestRef: stored.inquiryId });
  const html = buildDetailsEmailHtml({ request: stored, block, timing: "Soon", projectType: "", files });
  assert.match(html, /Details added/);
  assert.match(html, /<a href="https:\/\/boiseremodeling\.co\/f"[^>]*>kitchen\.jpg<\/a>/);
  assert.equal(html.includes("ref 0123456789ab"), false, "the idempotency ref is for the row, not the email");
});
