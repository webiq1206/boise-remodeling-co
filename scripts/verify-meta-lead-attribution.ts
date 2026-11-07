/**
 * Build guard for Meta Lead Ads attribution (shared/metaLeadAttribution.ts).
 *
 * Run: npm run verify:meta-lead-attribution
 *
 * Every P5 brand advertises from the one P5 Home Co Page, so every Instant Form
 * lead lands on the same webhook. Before this guard existed the webhook fetched
 * only id, form_id and field_data: a Cabinet lead and a Handyman lead were both
 * stored as "facebook-lead-ad" with no campaign, ad set or ad id, so neither the
 * brand nor the ad that produced it could be recovered. This pins:
 *   - each live form id resolves to its own brand and service
 *   - the "P5 | <Brand> | ..." campaign name recovers the brand for a form not
 *     yet in the table, and an unknown lead is labelled, never guessed
 *   - the webhook actually requests the ad hierarchy fields from the Graph API
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  GRAPH_LEAD_FIELDS,
  META_LEAD_FORMS,
  P5_BRAND_NAMES,
  brandFromCampaignName,
  metaLeadAttributionLines,
  metaLeadProjectType,
  metaLeadSource,
  resolveMetaLeadAttribution,
  type P5BrandKey,
} from "../shared/metaLeadAttribution";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${label}${detail ? `: ${detail}` : ""}`);
  }
}

console.log("verify:meta-lead-attribution");

/* 1. The live forms, one per brand, each resolving to its own brand. */
const expected: Record<string, [P5BrandKey, string]> = {
  "3570634953094714": ["boise-handyman-co", "repair-list"],
  "1152385197288111": ["boise-remodeling-co", "remodel"],
  "965115442960999": ["boise-construction-co", "custom-home"],
  "1636211868536619": ["boise-cabinet-co", "cabinetry"],
  "1807836587099476": ["p5-home-co", "routing"],
};
for (const [formId, [brand, service]] of Object.entries(expected)) {
  const a = resolveMetaLeadAttribution({ form_id: formId });
  check(`form ${formId} -> ${brand}/${service}`, a.brand === brand && a.service === service && a.resolvedBy === "form", JSON.stringify(a));
}
const brandsWithForms = new Set(Object.values(META_LEAD_FORMS).map((f) => f.brand));
for (const brand of Object.keys(P5_BRAND_NAMES)) {
  check(`brand ${brand} has an Instant Form`, brandsWithForms.has(brand as P5BrandKey));
}

/* 2. The webhook's own form_id is used when the Graph payload omits one. */
const fromWebhook = resolveMetaLeadAttribution({}, "1636211868536619");
check("webhook form_id is a fallback for the Graph form_id", fromWebhook.brand === "boise-cabinet-co");

/* 3. Campaign-name fallback, using the real campaign names. */
const campaignNames: Record<string, P5BrandKey> = {
  "P5 | Boise Handyman Co | Instant Form Leads | Ada-Canyon-Gem | 2026-11": "boise-handyman-co",
  "P5 | Boise Remodeling Co | Instant Form Leads | Ada-Canyon-Gem | 2026-11": "boise-remodeling-co",
  "P5 | Boise Cabinet Co | Instant Form Leads | Ada-Canyon-Gem | 2026-11": "boise-cabinet-co",
  "P5 | Boise Construction Co | Instant Form Leads | Ada-Canyon-Gem | 2026-11": "boise-construction-co",
  "P5 | P5 Home Co | Instant Form Leads | Ada-Canyon-Gem | 2026-11": "p5-home-co",
};
for (const [name, brand] of Object.entries(campaignNames)) {
  check(`campaign name -> ${brand}`, brandFromCampaignName(name) === brand);
  const a = resolveMetaLeadAttribution({ form_id: "999", campaign_name: name });
  check(`unknown form + "${brand}" campaign resolves by campaign name`, a.brand === brand && a.resolvedBy === "campaign-name");
}
/* "P5 Home Co" must not match inside a longer brand segment. */
check("partial brand text does not match", brandFromCampaignName("P5 | Boise Remodeling Co Archive | x") === null);

/* 4. Unknown stays unknown: labelled, never guessed into a brand. */
const unknown = resolveMetaLeadAttribution({ form_id: "123", campaign_name: "Some other campaign" });
check("unknown lead is unattributed", unknown.brand === "unattributed" && unknown.resolvedBy === "none");
check("unattributed project type is explicit", metaLeadProjectType(unknown) === "facebook-lead-ad:unattributed");

/* 5. The ad hierarchy is carried into the stored note and the CRM. */
const full = resolveMetaLeadAttribution({
  form_id: "3570634953094714",
  campaign_id: "c1",
  campaign_name: "P5 | Boise Handyman Co | Instant Form Leads | Ada-Canyon-Gem | 2026-11",
  adset_id: "s1",
  adset_name: "Handyman | Ada-Canyon-Gem | Broad 25+ | Instant Form",
  ad_id: "a1",
  ad_name: "Handyman | Carousel 8 | A: Your list",
  platform: "ig",
});
const lines = metaLeadAttributionLines(full).join("\n");
for (const needle of ["Brand: Boise Handyman Co", "(c1)", "(s1)", "(a1)", "(3570634953094714)", "Platform: ig"]) {
  check(`attribution lines include ${needle}`, lines.includes(needle), lines);
}
check("project type names the brand", metaLeadProjectType(full) === "facebook-lead-ad:boise-handyman-co");
check("CRM source names the brand", metaLeadSource(full) === "Facebook Lead Ad | Boise Handyman Co");
const bare = metaLeadAttributionLines(resolveMetaLeadAttribution({ form_id: "3570634953094714" }));
check("blank ad fields are omitted, not printed empty", !bare.some((l) => l.startsWith("Campaign") || l.startsWith("Ad")), bare.join(" / "));

/* 6. The Graph request carries the hierarchy, and the route uses this list. */
for (const field of ["form_id", "field_data", "campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name"]) {
  check(`Graph request asks for ${field}`, (GRAPH_LEAD_FIELDS as readonly string[]).includes(field));
}
const route = readFileSync(join(process.cwd(), "app/api/facebook/leadgen/route.ts"), "utf8");
check("webhook requests GRAPH_LEAD_FIELDS", route.includes("GRAPH_LEAD_FIELDS.join"));
check("webhook stores the attributed project type", route.includes("metaLeadProjectType(attribution)"));
check("webhook no longer hardcodes the old field list", !route.includes("fields=id,created_time,form_id,field_data`"));

if (failures > 0) {
  console.error(`\nverify:meta-lead-attribution FAILED (${failures})`);
  process.exit(1);
}
console.log("\nverify:meta-lead-attribution passed");
