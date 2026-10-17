import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertAdditiveSql } from "../scripts/p5-schema-safety.mjs";
import {
  allowEnhancedConversions,
  normalizeSuppressionEmail,
  normalizeSuppressionPhone,
  sha256Hex,
  suppressionRecords,
} from "../shared/enhancedConversionSuppression.ts";

test("suppression hashes normalized emails and E.164 phones and keeps the raw value out", () => {
  assert.equal(normalizeSuppressionEmail("  Ada@Example.COM "), "ada@example.com");
  assert.equal(normalizeSuppressionEmail("not an email"), null);
  assert.equal(normalizeSuppressionPhone("(208) 555-0100"), "+12085550100");
  assert.equal(normalizeSuppressionPhone("1-208-555-0100"), "+12085550100");
  assert.equal(normalizeSuppressionPhone("2085550100"), "+12085550100");
  assert.equal(normalizeSuppressionPhone("555-0148"), null);
  assert.equal(normalizeSuppressionPhone("1-800-FLOWERS"), null);

  const records = suppressionRecords({ email: "  Ada@Example.COM ", phone: "(208) 555-0100" });
  assert.deepEqual(records.map((record) => record.kind), ["email", "phone"]);
  assert.deepEqual(Object.keys(records[0]).sort(), ["kind", "valueHash"]);
  assert.equal(records[0].valueHash, createHash("sha256").update("ada@example.com", "utf8").digest("hex"));
  assert.equal(records[1].valueHash, sha256Hex("+12085550100"));
  assert.equal(records[1].valueHash, suppressionRecords({ phone: "2085550100" })[0].valueHash);
  const encoded = JSON.stringify(records);
  assert.equal(encoded.includes("Ada"), false);
  assert.equal(encoded.includes("ada@example.com"), false);
  assert.equal(encoded.includes("2085550100"), false);
  assert.equal(encoded.includes("+12085550100"), false);
});

test("either matching hash blocks enhanced conversions and a miss does not", () => {
  const [email, phone] = suppressionRecords({ email: "ada@example.com", phone: "2085550100" }).map((record) => record.valueHash);
  assert.equal(allowEnhancedConversions([email, phone], new Set([phone])), false);
  assert.equal(allowEnhancedConversions([email], new Set([phone])), true);
  assert.equal(allowEnhancedConversions([], new Set([email, phone])), true);
});

test("the consultation response carries the flag and the lead path does not branch on it", () => {
  const route = readFileSync(new URL("../app/api/consultation/route.ts", import.meta.url), "utf8");
  const decided = route.indexOf("allowEnhancedConversions = await allowEnhancedConversionsForLead(data.email, data.phone)");
  const emailSend = route.indexOf("emails.send");
  assert.ok(decided > 0 && emailSend > decided);
  assert.equal(route.includes("if (allowEnhancedConversions"), false);
  assert.equal(route.split("allowEnhancedConversions,").length - 1, 2);
  const tracking = readFileSync(new URL("../lib/inquiryTracking.ts", import.meta.url), "utf8");
  const gate = tracking.indexOf("response.allowEnhancedConversions !== false");
  const userData = tracking.indexOf("applyGoogleAdsUserData(contact)");
  const conversion = tracking.indexOf('trackEvent("conversion"');
  const lead = tracking.indexOf('trackEvent("generate_lead"');
  assert.ok(lead > 0 && lead < gate && gate < userData && userData < conversion);
  const privacy = readFileSync(new URL("../app/privacy-policy/page.tsx", import.meta.url), "utf8");
  assert.equal(privacy.includes("allowEnhancedConversions"), false);
  assert.equal(privacy.includes("suppression"), false);
});

test("an admin insert and the operator script store the hash without echoing the raw value", () => {
  const admin = readFileSync(new URL("../app/api/admin/enhanced-conversion-suppressions/route.ts", import.meta.url), "utf8");
  assert.match(admin, /user\.role !== "admin"/);
  assert.match(admin, /kind: record\.kind, valueHash: record\.valueHash/);
  assert.equal(admin.includes("email: email"), false);
  assert.equal(admin.includes("phone: phone"), false);
  const script = readFileSync(new URL("../scripts/suppress-enhanced-conversion.ts", import.meta.url), "utf8");
  assert.match(script, /stored \$\{record\.kind\} \$\{record\.valueHash\}/);
  assert.equal(script.includes("console.log(email"), false);
  assert.equal(script.includes("console.log(phone"), false);
  assert.equal(script.includes("--email"), true);
  assert.equal(script.includes("--phone"), true);
});

test("the suppression migration is additive", () => {
  const sql = readFileSync(new URL("../migrations/0003_enhanced_conversion_suppressions.sql", import.meta.url), "utf8");
  assert.doesNotThrow(() => assertAdditiveSql(sql, "0003_enhanced_conversion_suppressions.sql"));
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "enhanced_conversion_suppressions"/);
  assert.equal(sql.toLowerCase().includes("email text"), false);
  assert.equal(sql.toLowerCase().includes("phone text"), false);
});
