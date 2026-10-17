/** Rotating, topic-aware expansion paragraphs - avoids identical filler across 94 articles. */

const BASE_TOPICS = [
  'Ada County plan review often adds weeks when plumbing, electrical, or structural sheets are required - build that into your calendar before ordering demo.',
  'Canyon County projects in Nampa, Middleton, and Caldwell use different portals than Ada; your contractor should submit in the correct jurisdiction from day one.',
  'Treasure Valley ranches and split-levels from the 1970s–1990s frequently need panel and insulation upgrades when walls are opened - budget contingency accordingly.',
  'Eagle neighborhoods, and Hidden Springs in the Boise foothills, may require HOA architectural review in addition to county permits - start design early.',
  'Dry Idaho summers favor exterior concrete and roofing; schedule hardscape and addition work outside winter freeze-thaw cycles when possible.',
  'Design-build keeps design, permits, and construction under one contract - reducing gaps that cause change orders mid-project.',
  'Written scope with clear allowances beats a low bid that excludes haul-off, protection, or engineering.',
  'Kitchen appliance rough-in should be locked before drywall close-up - even when appliances are client-supplied.',
  'Curbless showers require precise slope and waterproofing - inspection failures delay master bath timelines.',
  'Whole-home programs succeed when structural and MEP decisions precede finish selections.',
  'Comparing remodel cost to moving should include commissions, moving costs, and emotional disruption - not just sticker price.',
  'ROI-focused updates should match neighborhood comps in Boise and Meridian - avoid over-improving for the street.',
  'Outdoor kitchens need utility planning for gas, electric, and drainage before pavers are installed.',
  'North End bungalows reward creative storage and respectful scale - forced oversized additions can hurt character.',
  'Meridian subdivisions often benefit from open kitchen conversions and mudroom additions at rear entries.',
];

const HUB_SNIPPETS: Record<string, string[]> = {
  'remodeling-costs': [
    'Use room-level budgets: kitchens, baths, and additions sit on different planning curves - see our cost tables.',
    'Hold 10–15% contingency for concealed conditions behind drywall in older Boise and Bench homes.',
  ],
  'kitchen-remodeling': [
    'Cabinet lead times can exceed eight weeks - order at design lock to protect your start date.',
    'Open concept requests should confirm beam sizing before demolition in Ada County homes.',
  ],
  'bathroom-remodeling': [
    'Guest baths and master suites should never share one budget number - scope differs dramatically.',
    'Ventilation and heat are part of comfort in Idaho baths - plan with layout, not as an afterthought.',
  ],
  'home-additions': [
    'Setbacks and soil conditions in Eagle Foothills can move foundation type and budget early.',
    'ADU feasibility depends on utilities, fire separation, and zoning - not just square footage goals.',
  ],
  'whole-home-remodeling': [
    'Phased work can spread cash flow but adds mobilization cost - decide intentionally.',
    'Temporary housing or dust barriers should be planned before demo day.',
  ],
  'contractor-selection': [
    'Interview at least two design-build firms with aligned scope before you sign.',
    'Ask who owns communication during construction - not only who sells the project.',
  ],
  'remodeling-process': [
    'Permit submission should precede long-lead material orders when layout changes are involved.',
    'Punch list and warranty terms belong in the contract, not verbal promises at closeout.',
  ],
  'remodeling-roi': [
    'Pre-sale remodels should target buyer expectations in your specific subdivision.',
    'Long-term living value may justify projects with modest resale payback.',
  ],
  'outdoor-living': [
    'Covered patios may need structural permits when tied to the home in Ada or Canyon County.',
    'Integrate outdoor scope with indoor kitchen remodels when utilities are shared.',
  ],
  'treasure-valley-locations': [
    'City-specific guides cover housing stock, permits, and links to local service pages.',
    'Start with the Treasure Valley master guide, then drill into your city or neighborhood.',
  ],
};

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i) * (i + 1)) % 9973;
  return h;
}

export function buildContextualExpansions(slug: string, hubSlug: string, count: number): string {
  const hubLines = HUB_SNIPPETS[hubSlug] ?? [];
  const pool = [...hubLines, ...BASE_TOPICS];
  const start = hashSlug(slug) % pool.length;
  let html = '';
  for (let i = 0; i < count; i++) {
    const line = pool[(start + i) % pool.length];
    const extra = pool[(start + i + 3) % pool.length];
    html += `<div class="summary-block"><p>${line} ${extra} <a href="/guides/treasure-valley-remodeling-guide">Treasure Valley</a> · <a href="/contact">Consultation</a>.</p></div>`;
  }
  return html;
}
