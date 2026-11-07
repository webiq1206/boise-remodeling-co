/**
 * Meta Lead Ads attribution: which brand, service, campaign, ad set, ad and
 * form a Facebook or Instagram Instant Form lead came from.
 *
 * Every P5 brand advertises from the one "P5 Home Co" Page, so every Instant
 * Form lead for every brand arrives at the same webhook. Without this mapping a
 * Cabinet lead and a Handyman lead were indistinguishable in the CRM: both were
 * stored as "facebook-lead-ad" with no campaign, ad set or ad id. This module is
 * pure (no I/O) so `verify:meta-lead-attribution` can pin it without Meta.
 *
 * Resolution order, most to least reliable:
 *   1. The form id. Each brand has its own Instant Form, and a form id never
 *      changes, so the table below is the source of truth.
 *   2. The campaign name, for a form created later and not yet added here.
 *      P5 campaigns are named "P5 | <Brand> | ...", so the brand survives
 *      even when the form table is stale.
 *   3. Unknown. The lead is still stored and forwarded; it is labelled
 *      "unattributed" rather than guessed into a brand.
 */

export type P5BrandKey =
  | "p5-home-co"
  | "boise-construction-co"
  | "boise-remodeling-co"
  | "boise-cabinet-co"
  | "boise-handyman-co";

export const P5_BRAND_NAMES: Record<P5BrandKey, string> = {
  "p5-home-co": "P5 Home Co",
  "boise-construction-co": "Boise Construction Co",
  "boise-remodeling-co": "Boise Remodeling Co",
  "boise-cabinet-co": "Boise Cabinet Co",
  "boise-handyman-co": "Boise Handyman Co",
};

export interface MetaLeadFormEntry {
  brand: P5BrandKey;
  /** The offer the form sells, e.g. "repair-list". */
  service: string;
  /** Form name as created in Meta, for humans reading the CRM. */
  formName: string;
}

/**
 * Instant Forms on the P5 Home Co Page (1228704823655951), created 2026-11-07
 * for the November carousel campaigns. Add a row whenever a form is created.
 */
export const META_LEAD_FORMS: Record<string, MetaLeadFormEntry> = {
  "3570634953094714": {
    brand: "boise-handyman-co",
    service: "repair-list",
    formName: "Boise Handyman Co | Repair List Quote | 2026-11",
  },
  "1152385197288111": {
    brand: "boise-remodeling-co",
    service: "remodel",
    formName: "Boise Remodeling Co | Remodel Quote | 2026-11",
  },
  "965115442960999": {
    brand: "boise-construction-co",
    service: "custom-home",
    formName: "Boise Construction Co | Custom Home Consult | 2026-11",
  },
  "1636211868536619": {
    brand: "boise-cabinet-co",
    service: "cabinetry",
    formName: "Boise Cabinet Co | Cabinetry Quote | 2026-11",
  },
  "1807836587099476": {
    brand: "p5-home-co",
    service: "routing",
    formName: "P5 Home Co | Find Your Specialist | 2026-11",
  },
};

/**
 * Lead fields requested from the Graph API. The ad hierarchy fields are what
 * make a lead traceable to the campaign, ad set and ad that produced it; a
 * lead fetched without them can only ever be attributed to a form.
 */
export const GRAPH_LEAD_FIELDS = [
  "id",
  "created_time",
  "form_id",
  "field_data",
  "ad_id",
  "ad_name",
  "adset_id",
  "adset_name",
  "campaign_id",
  "campaign_name",
  "platform",
  "is_organic",
] as const;

export interface GraphLeadAttributionInput {
  form_id?: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  platform?: string;
  is_organic?: boolean;
}

export interface MetaLeadAttribution {
  brand: P5BrandKey | "unattributed";
  brandName: string;
  service: string;
  /** How the brand was resolved: by form id, by campaign name, or not at all. */
  resolvedBy: "form" | "campaign-name" | "none";
  formId: string;
  formName: string;
  campaignId: string;
  campaignName: string;
  adsetId: string;
  adsetName: string;
  adId: string;
  adName: string;
  /** "fb" or "ig" when Meta reports it. */
  platform: string;
  isOrganic: boolean;
}

/** Match the brand segment of a "P5 | <Brand> | ..." campaign name. */
export function brandFromCampaignName(campaignName: string | undefined): P5BrandKey | null {
  if (!campaignName) return null;
  const segments = campaignName.split("|").map((s) => s.trim().toLowerCase());
  for (const [key, name] of Object.entries(P5_BRAND_NAMES) as Array<[P5BrandKey, string]>) {
    if (segments.includes(name.toLowerCase())) return key;
  }
  return null;
}

export function resolveMetaLeadAttribution(
  lead: GraphLeadAttributionInput,
  webhookFormId?: string,
): MetaLeadAttribution {
  const formId = lead.form_id || webhookFormId || "";
  const fromForm = formId ? META_LEAD_FORMS[formId] : undefined;
  const fromCampaign = fromForm ? null : brandFromCampaignName(lead.campaign_name);

  const brand: MetaLeadAttribution["brand"] = fromForm?.brand ?? fromCampaign ?? "unattributed";
  return {
    brand,
    brandName: brand === "unattributed" ? "Unattributed brand" : P5_BRAND_NAMES[brand],
    service: fromForm?.service ?? "unknown",
    resolvedBy: fromForm ? "form" : fromCampaign ? "campaign-name" : "none",
    formId,
    formName: fromForm?.formName ?? "",
    campaignId: lead.campaign_id ?? "",
    campaignName: lead.campaign_name ?? "",
    adsetId: lead.adset_id ?? "",
    adsetName: lead.adset_name ?? "",
    adId: lead.ad_id ?? "",
    adName: lead.ad_name ?? "",
    platform: lead.platform ?? "",
    isOrganic: lead.is_organic === true,
  };
}

/** Value stored in consultation_requests.project_type, e.g. "facebook-lead-ad:boise-handyman-co". */
export function metaLeadProjectType(attribution: MetaLeadAttribution): string {
  return `facebook-lead-ad:${attribution.brand}`;
}

/** CRM `source`, readable at a glance in the lead list. */
export function metaLeadSource(attribution: MetaLeadAttribution): string {
  return `Facebook Lead Ad | ${attribution.brandName}`;
}

/**
 * Attribution lines for the stored note and the CRM. Empty values are left
 * out so an organic or test lead does not print a column of blanks.
 */
export function metaLeadAttributionLines(attribution: MetaLeadAttribution): string[] {
  const line = (label: string, name: string, id: string) => {
    if (!name && !id) return null;
    if (name && id) return `${label}: ${name} (${id})`;
    return `${label}: ${name || id}`;
  };
  return [
    `Brand: ${attribution.brandName}`,
    attribution.service !== "unknown" ? `Service: ${attribution.service}` : null,
    line("Form", attribution.formName, attribution.formId),
    line("Campaign", attribution.campaignName, attribution.campaignId),
    line("Ad set", attribution.adsetName, attribution.adsetId),
    line("Ad", attribution.adName, attribution.adId),
    attribution.platform ? `Platform: ${attribution.platform}` : null,
    attribution.isOrganic ? "Organic (not from a paid ad)" : null,
  ].filter((value): value is string => Boolean(value));
}
