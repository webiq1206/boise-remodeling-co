import { buildSectionsHtml, CITIES_LIST, PILLAR_TV, PILLAR_BOISE, type ContentSection } from './snippets';

const sections: ContentSection[] = [
  {
    h2: 'What should Treasure Valley homeowners budget for a remodel in 2026?',
    paragraphs: [
      `Most residential remodels we scope across ${CITIES_LIST} fall into planning bands - not single sticker prices. A guest bath refresh in Meridian is not priced like a full kitchen gut in the North End. National averages rarely account for Ada County plan review, Canyon County submission portals, Idaho labor markets, or the finish level common in Eagle and Hidden Springs.`,
      `This guide is the pillar for our <strong>Boise Remodeling Costs</strong> hub. Use it to understand typical ranges, then read the linked articles on kitchen, bathroom, whole-home, addition, and luxury costs for project-specific detail.`,
      `For a rough planning number before design, start with our <a href="/#calculator">project estimator</a>, then schedule an in-home consultation for a written scope.`,
    ],
  },
  {
    h2: 'Typical remodeling cost ranges by project type in Boise',
    paragraphs: [
      'The table below reflects planning ranges we use with homeowners in design-build consultations. Your home, existing conditions, and selections will move you within or beyond these bands.',
    ],
    table: {
      className: 'cost-table',
      headers: ['Project type', 'Typical planning range', 'Typical timeline'],
      rows: [
        ['Kitchen remodel (full)', '$37,000 – $110,000+', '8 – 16 weeks'],
        ['Bathroom (guest)', '$18,000 – $45,000', '4 – 8 weeks'],
        ['Bathroom (master)', '$35,000 – $85,000+', '6 – 12 weeks'],
        ['Whole-home remodel', '$180,000 – $425,000+', '4 – 12 months'],
        ['Room addition', '$93,000 – $189,000+', '4 – 9 months'],
        ['ADU / guest house', '$149,000 – $364,000', '6 – 12 months'],
        ['Luxury remodel', '$136,000 – $816,000+', '6 – 18 months'],
      ],
    },
  },
  {
    h2: 'How much does a kitchen remodel cost in Boise?',
    paragraphs: [
      'Kitchen remodels are the most common inquiry in Boise and Meridian. Layout changes - moving the sink wall, adding an island, or opening to the family room - drive both design fees and permit time. Cabinetry line (stock, semi-custom, custom), countertop material, and lighting layers compound quickly.',
      'Appliances are typically client-supplied; we guide selection and coordinate rough-in but do not purchase or install appliances. Budget them separately, often $8,000–$25,000 for a full suite.',
      'Read our dedicated article: <a href="/blog/kitchen-remodel-cost-boise">Kitchen Remodel Cost Boise</a>. Explore <a href="/services/kitchen-remodel">kitchen remodeling services</a> and <a href="/services/kitchen-remodel/boise">kitchen remodels in Boise</a>.',
    ],
  },
  {
    h2: 'How much does a bathroom remodel cost in the Treasure Valley?',
    paragraphs: [
      'Powder rooms and guest baths in Star, Middleton, and Kuna often land in the mid five figures for a full refresh with new tile, vanity, lighting, and ventilation. Master baths with curbless showers, radiant heat, and layout changes commonly reach higher five-figure or six-figure ranges.',
      'Walk-in and curbless showers require slope, drain, and waterproofing details that affect both labor and inspection. Aging-in-place features (grab bars, comfort-height vanities, wider doorways) are increasingly requested in Boise Bench and North End homes.',
      'See <a href="/blog/bathroom-remodel-cost-boise">Bathroom Remodel Cost Boise</a> and <a href="/services/bathroom-remodel/nampa">bathroom remodeling in Nampa</a>.',
    ],
  },
  {
    h2: 'Whole-home remodel costs across Ada and Canyon County',
    paragraphs: [
      'Whole-home programs coordinate flooring, lighting, layout, and often multiple wet areas under one contract. Sequencing matters: structural and MEP decisions should be locked before finish selections to avoid rework.',
      'Homes built in the 1970s–1990s in the Treasure Valley frequently need panel updates, insulation improvements, or asbestos/lead assessments when walls are opened. Hold a 10–15% contingency for unknowns behind drywall.',
      'Our <a href="/blog/whole-home-remodel-cost-boise">whole-home remodel cost guide</a> and <a href="/services/whole-home-remodel/meridian">whole-home remodeling in Meridian</a> pages go deeper.',
    ],
  },
  {
    h2: 'Home addition and ADU costs in Idaho',
    paragraphs: [
      'Additions that look original require early design, soil and setback research, and realistic permit schedules. Second-story additions in Boise and Eagle trigger structural engineering and often longer Ada County review.',
      'ADUs and guest houses are popular in Boise’s infill-friendly climate and in Meridian lots with alley access. Utility tie-ins, fire separation, and parking rules vary by jurisdiction.',
      'Review <a href="/blog/home-addition-cost-boise">home addition cost in Boise</a> and <a href="/services/room-addition/eagle">room additions in Eagle</a>, plus <a href="/services/adu">ADU design-build</a>.',
    ],
  },
  {
    h2: 'What does luxury remodeling cost in Eagle and the Foothills?',
    paragraphs: [
      'Luxury remodels emphasize custom millwork, premium stone, integrated lighting, and meticulous tie-ins to existing architecture. HOA design review in Harris Ranch, Hidden Springs, and Eagle Foothills adds weeks to front-end scheduling.',
      'Expect dedicated design development, material mock-ups, and white-glove protection of occupied areas. Single-room luxury baths or kitchens can exceed mid-range whole-home budgets when finishes and engineering are complex.',
      'Read <a href="/blog/luxury-remodel-cost-boise">luxury remodel cost in Boise</a> for finish-level breakdowns.',
    ],
  },
  {
    h2: 'Remodel cost per square foot in Boise - is it useful?',
    paragraphs: [
      'Cost per square foot is a shorthand, not a contract price. It varies wildly by project type: open kitchen/living remodels include expensive MEP and cabinetry; carpet and paint refresh a different metric entirely.',
      'For whole-home or large addition planning, many homeowners ask for a $/SF range after preliminary design. We publish realistic bands in <a href="/blog/remodel-cost-per-square-foot-boise">cost per square foot to remodel in Boise</a>.',
    ],
    table: {
      className: 'cost-table',
      headers: ['Project context', 'Planning $/SF (finished area affected)'],
      rows: [
        ['Cosmetic refresh (paint, trim, fixtures)', '$15 – $40'],
        ['Mid-range kitchen or bath remodel', '$250 – $450+ (room SF)'],
        ['Whole-home remodel (major)', '$100 – $200+'],
        ['Addition (new construction portion)', '$200 – $350+'],
      ],
    },
  },
  {
    h2: 'What impacts remodeling costs in Boise more than anywhere else?',
    paragraphs: [
      'Local drivers include: Ada vs Canyon permit paths, availability of trade partners, material lead times, existing home conditions, and whether you choose design-build or separate design and GC contracts.',
      'Layout changes, structural work, and panel upgrades add design and inspection cycles. Finish level (tile size, custom cabinetry, specialty glass) moves budget without changing square footage.',
      'Our article <a href="/blog/what-impacts-remodeling-costs-boise">what impacts remodeling costs in Boise</a> ranks the top variables homeowners control.',
    ],
  },
  {
    h2: 'How to budget for a remodel in the Treasure Valley',
    paragraphs: [
      'Start with priorities: which rooms are must-haves vs phased later. Allocate design, permits, construction, finishes, appliances (if kitchen), and contingency separately instead of one opaque number.',
      'Financing, temporary housing, and storage are often overlooked. If you are comparing bids, ensure scope alignment before price - not all estimates include the same allowances.',
      'Follow the step-by-step framework in <a href="/blog/how-to-budget-remodel-boise">how to budget for a remodel in Boise</a>.',
    ],
    list: [
      'Define must-have scope and phased work',
      'Get a planning range from a written preliminary scope',
      'Hold 10–15% contingency for concealed conditions',
      'Budget appliances and furnishings separately where applicable',
      'Plan for permit and selection timelines before demo day',
    ],
  },
  {
    h2: 'Remodeling timeline expectations in Boise, Meridian, and Nampa',
    paragraphs: [
      'Timelines depend on design duration, permit lead time, material lead times, and trade sequencing - not just construction days. Kitchen and bath projects with layout changes in Ada County often need several weeks of plan review.',
    ],
    table: {
      className: 'timeline-table',
      headers: ['Phase', 'Typical duration'],
      rows: [
        ['Design & selections', '4 – 12 weeks'],
        ['Permitting (layout/MEP changes)', '2 – 8+ weeks'],
        ['Construction (kitchen)', '6 – 12 weeks'],
        ['Construction (addition)', '3 – 7 months'],
      ],
    },
  },
  {
    h2: 'Permits and fees: Ada County vs Canyon County',
    paragraphs: [
      'Boise, Meridian, Eagle, Kuna, and Star fall under Ada County for most unincorporated and city-integrated permitting paths. Nampa, Middleton, and Caldwell are in Canyon County with different portals and review cadence.',
      'Cosmetic updates without structural or MEP changes may move quickly. Kitchen relocations, wall removals, and additions almost always require stamped plans and inspections.',
      'We include permits in our design-build scope. See also <a href="/resources/ada-canyon-permit-flow">Ada vs Canyon County permit timelines</a>.',
    ],
  },
  {
    h2: 'Design-build vs bidding out: what it means for your number',
    paragraphs: [
      'Design-build consolidates design, estimating, and construction under one agreement with a single point of accountability. Competitive bid chains can look cheaper on paper but often shift risk to the homeowner via allowances and change orders.',
      'When comparing proposals, match line items: demo, haul-off, protection, permits, engineering, and finish install. Our <a href="/guides/choose-remodeling-contractor-boise">contractor selection guide</a> (publishing soon) covers vetting in depth.',
    ],
  },
  {
    h2: 'How Boise housing stock affects remodel price',
    paragraphs: [
      'North End bungalows and Boise Bench ranches often need electrical updates and creative layout solutions. 1990s–2010s subdivisions in Meridian, Kuna, and Star may have builder-grade cabinets and hollow-core doors worth upgrading in place.',
      'Eagle and Foothills homes frequently feature larger footprints, three-car garages, and HOA architectural standards that influence exterior material choices and timeline.',
    ],
  },
  {
    h2: 'Climate and seasonal considerations in Idaho',
    paragraphs: [
      'Dry summers favor exterior work and additions; winter remodels require heat and humidity control for flooring and millwork. Freeze-thaw cycles matter for exterior concrete and drainage near additions.',
      'Book design early if you want construction complete before holidays or school years - trade schedules tighten in peak months across the valley.',
    ],
  },
  {
    h2: 'ROI and resale: what remodels return in the Treasure Valley',
    paragraphs: [
      'Kitchen and bath updates generally offer strong lifestyle return; resale math depends on neighborhood comps in Boise, Meridian, and Eagle. Over-improving relative to the street rarely pays off.',
      'Energy efficiency (windows, insulation, HVAC) can improve comfort and operating cost; ROI varies by home age. We address ROI by project type in our upcoming ROI hub.',
    ],
  },
  {
    h2: 'Common budgeting mistakes Treasure Valley homeowners make',
    paragraphs: [
      'Underestimating contingency, delaying selections until construction, and assuming the lowest bid is complete scope are the top three issues we see after a project starts.',
      'Another mistake is ignoring temporary living costs during a whole-home or major kitchen remodel. Phased work can reduce disruption but may extend calendar time.',
    ],
    list: [
      'Skipping written scope before signing',
      'Comparing bids with different allowances',
      'Leaving selections to “later”',
      'Forgetting permits and engineering in the schedule',
      'No contingency for concealed conditions',
    ],
  },
  {
    h2: 'Expert recommendations from Boise Remodeling Co',
    paragraphs: [
      'We are a design-build remodeling team serving homeowners throughout the Treasure Valley. Our process: in-home consultation, preliminary scope, design development, fixed-scope agreement, permits, construction, and warranty walkthrough.',
      'We do not publish bait pricing or “starting at” numbers without seeing your home. We do publish honest planning ranges so you can decide whether to invest in design before you commit to construction.',
    ],
  },
  {
    h2: 'Boise-specific considerations for 2026 remodel planning',
    paragraphs: [
      'Interest rates, insurance rebuild costs, and local labor demand all influence 2026 budgets. Material tariffs and supply chains still affect cabinetry and appliance lead times - lock long-lead items early in design.',
      'If you are in a mapped floodplain or hillside overlay (common near the Bench and Foothills), feasibility studies may be required before addition pricing is firm.',
      `For city-level context, read <a href="${PILLAR_BOISE}">Boise Remodeling Guide</a> and the <a href="${PILLAR_TV}">Treasure Valley Remodeling Guide</a>.`,
    ],
  },
  {
    h2: 'Next steps: from planning range to written scope',
    paragraphs: [
      'Use the cost cluster articles linked from this hub for room-by-room detail. When you are ready, schedule a consultation - we will walk your home, discuss goals, and outline a realistic path from design through construction.',
      'Explore services by city: <a href="/areas">service areas</a>, <a href="/services/kitchen-remodel/meridian">Meridian kitchen remodels</a>, <a href="/services/bathroom-remodel/eagle">Eagle bathroom remodels</a>, and <a href="/services/whole-home-remodel/boise">whole-home remodeling in Boise</a>.',
    ],
  },
];

// Weave a few on-brand sage callouts into the assembled HTML by inserting them
// before stable section headings (buildSectionsHtml emits clean <h2>/<p> blocks,
// so callouts sit between blocks - never nested inside a paragraph).
const COST_CALLOUTS: Array<[string, string]> = [
  [
    '<h2>How much does a kitchen remodel cost in Boise?</h2>',
    '<div class="callout tip"><p class="callout-label">Read the ranges as bands, not quotes</p><p>The table above reflects <span class="sage">planning ranges</span> we use in design-build consultations. Your home\'s condition, layout changes, and finish level move you within - or beyond - these bands. A written scope after a walk-through is the only way to a real number.</p></div>',
  ],
  [
    '<h2>Remodel cost per square foot in Boise - is it useful?</h2>',
    '<div class="callout note"><p class="callout-label">Key point</p><p>Cost per square foot is a shorthand, <span class="sage">not a contract price</span>. It swings wildly by project type - an open kitchen with new cabinetry and MEP is nothing like a paint-and-carpet refresh - so use it only for rough planning, never as a fixed bid.</p></div>',
  ],
  [
    '<h2>How to budget for a remodel in the Treasure Valley</h2>',
    '<div class="callout warning"><p class="callout-label">Always hold a contingency</p><p>Older Treasure Valley homes routinely hide outdated wiring, worn plumbing, or damage behind drywall. Budget a <strong>10-15% contingency</strong> for concealed conditions - it is the single best protection against a surprise derailing your project.</p></div>',
  ],
  [
    '<h2>Design-build vs bidding out: what it means for your number</h2>',
    '<div class="callout tip"><p class="callout-label">Compare apples to apples</p><p>A lower bid is often a smaller scope. Before comparing prices, match the line items - <span class="sage">demo, haul-off, protection, permits, engineering, allowances, and finish install</span>. Bids only mean something when the scope behind them is the same.</p></div>',
  ],
];

export const BOISE_REMODELING_COST_GUIDE_HTML = COST_CALLOUTS.reduce(
  (html, [anchor, callout]) => html.replace(anchor, callout + anchor),
  buildSectionsHtml(sections),
);

export const BOISE_REMODELING_COST_QUICK_ANSWER =
  'Treasure Valley remodels in 2026 typically range from about $18,000 for a small bath refresh to $425,000+ for whole-home or luxury programs, with most full kitchens between $37,000 and $110,000 and master baths from $35,000 to $85,000+. Exact cost depends on layout changes, finishes, permits (Ada or Canyon County), and existing home conditions - not national averages.';

export const BOISE_REMODELING_COST_TAKEAWAYS = [
  'Use planning ranges by project type, not a single $/SF number for every remodel.',
  'Layout, structural, and MEP changes drive permits and timeline in Boise and Meridian.',
  'Hold 10–15% contingency for concealed conditions in older Treasure Valley homes.',
  'Appliances and furnishings are often separate from construction contracts.',
  'Compare bids only after scope, allowances, and permits are aligned.',
];
