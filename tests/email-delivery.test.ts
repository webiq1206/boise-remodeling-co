import { test } from "node:test";
import assert from "node:assert/strict";
import { assertEmailAccepted, assertSenderDomain, checkedEmailSender } from "../lib/emailDelivery";

test("sender validation blocks foreign domains, lookalikes, multiple mailboxes and header injection", () => {
  for (const from of ["hello@brand.co", "Nick <hello@outreach.brand.co>"]) assertSenderDomain(from, "brand.co");
  for (const from of ["hello@evilbrand.co", "hello@brand.co.evil", "a@brand.co,b@brand.co", "a@brand.co\r\nBcc: b@evil.co", "a@@brand.co", "Name <a@brand.co> extra"]) {
    assert.throws(() => assertSenderDomain(from, "brand.co"));
  }
});

test("provider rejection, missing IDs and simulation cannot count as accepted", () => {
  for (const result of [null, {}, { error: { message: "rejected" } }, { data: null }, { data: { id: "" } }, { data: { id: "noop" } }, { id: "abc", skipped: true }, { data: { id: "abc" }, error: { message: "rejected" } }]) {
    assert.throws(() => assertEmailAccepted(result));
  }
  assertEmailAccepted({ data: { id: "real-provider-id" }, error: null });
});

test("transport preserves attachments and idempotency options and blocks invalid senders before dispatch", async () => {
  let calls = 0;
  const payload = { from: "hello@brand.co", attachments: [{ filename: "estimate.pdf", content: Buffer.from("test") }] };
  const options = { idempotencyKey: "lead-123" };
  const accepted = { data: { id: "accepted-123" }, error: null };
  const send = checkedEmailSender(async (input: typeof payload, config?: typeof options) => {
    calls++;
    assert.equal(input, payload);
    assert.equal(config, options);
    return accepted;
  }, "brand.co");
  assert.equal(await send(payload, options), accepted);
  await assert.rejects(() => send({ ...payload, from: "hello@other.co" }, options));
  assert.equal(calls, 1);
  const rejected = checkedEmailSender(async (_input: { from: string }) => ({ error: { message: "quota exceeded" } }), "brand.co");
  await assert.rejects(() => rejected({ from: "hello@brand.co" }));
});
