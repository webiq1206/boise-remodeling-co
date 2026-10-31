import { buildSectionsHtml, CITIES_LIST, PILLAR_COST, type ContentSection } from './snippets';

function clusterSections(topic: string, extra: ContentSection[]): ContentSection[] {
  const intro: ContentSection[] = [
    {
      h2: `Quick planning overview for ${topic}`,
      paragraphs: [
        `Homeowners in ${CITIES_LIST} ask us about ${topic.toLowerCase()} more than almost any other line item on a remodel budget. This article is part of our <a href="${PILLAR_COST}">Boise Remodeling Cost Guide</a> - the definitive hub for Treasure Valley remodeling costs.`,
        `Numbers below are planning ranges from design-build consultations, not advertisements. Your home, layout, and finish level will move you within or beyond these bands.`,
        `Use our <a href="/#calculator">project estimator</a> for a rough range, then request an in-home visit for written scope.`,
      ],
    },
  ];
  return [...intro, ...extra];
}

const kitchenExtra: ContentSection[] = [
  {
    h2: 'What is a typical kitchen remodel budget in Boise?',
    paragraphs: [
      'Most full kitchen remodels we plan in Ada County fall between roughly $37,000 and $110,000+, with layout changes and custom cabinetry at the upper end. Cosmetic refreshes - doors, counters, backsplash - can land lower if plumbing and gas stay put.',
      'Meridian and Eagle kitchens often include larger islands, walk-in pantries, and panel-ready appliances. Kuna and Star homes may have builder-grade layouts worth reconfiguring for open concept living.',
    ],
  },
  {
    h2: 'Cost breakdown: cabinets, counters, and labor',
    paragraphs: [
      'Cabinetry commonly represents 30–40% of a full kitchen construction budget. Semi-custom lines balance selection flexibility with lead time; fully custom shops extend design time but fit odd ceiling lines in North End homes.',
      'Quartz and quartzite countertops range widely; waterfall edges and thick mitered builds add fabrication labor. Tile backsplashes, under-cabinet lighting, and recessed cans are frequently underestimated.',
    ],
    table: {
      className: 'cost-table',
      headers: ['Line item', 'Typical share of kitchen budget'],
      rows: [
        ['Cabinetry & install', '30 – 40%'],
        ['Countertops & backsplash', '15 – 20%'],
        ['Labor (demo, MEP, finish)', '25 – 35%'],
        ['Flooring, paint, trim', '10 – 15%'],
        ['Appliances (client-supplied)', 'Separate budget'],
      ],
    },
  },
  {
    h2: 'When layout changes increase price in the Treasure Valley',
    paragraphs: [
      'Moving the sink, dishwasher, or range requires plumbing and often electrical panel work. Removing a wall may need a beam, engineering, and Ada County plan review.',
      'Open concept requests from Boise Bench homeowners frequently combine kitchen, dining, and living flooring transitions - another cost layer beyond cabinets.',
    ],
  },
  {
    h2: 'Timeline and how it affects cash flow',
    paragraphs: [
      'Kitchen remodels typically run 8–16 weeks after permits and materials are released. Long-lead cabinets can add 8–12 weeks to the front of the schedule - order at design lock.',
    ],
    table: {
      className: 'timeline-table',
      headers: ['Phase', 'Duration'],
      rows: [
        ['Design & selections', '4 – 8 weeks'],
        ['Permits (if layout/MEP)', '2 – 6 weeks'],
        ['Construction', '6 – 12 weeks'],
      ],
    },
  },
  {
    h2: 'Boise, Meridian, Eagle, and Nampa: local notes',
    paragraphs: [
      'Ada County cities share many permit conventions; Canyon County (Nampa, Middleton, Caldwell) uses different portals. HOA review in Eagle may add design time without changing construction unit costs dramatically.',
      'Links: <a href="/services/kitchen-remodel/boise">Boise</a>, <a href="/services/kitchen-remodel/meridian">Meridian</a>, <a href="/services/kitchen-remodel/eagle">Eagle</a>, <a href="/services/kitchen-remodel/nampa">Nampa</a>, <a href="/areas/kuna">Kuna</a>, <a href="/areas/star">Star</a>.',
    ],
  },
  {
    h2: 'How to avoid budget surprises',
    paragraphs: [
      'Lock appliance models before rough-in. Confirm soft-close hardware, crown, and filler details at cabinet sign-off. Hold contingency for drywall and subfloor after demo.',
    ],
    list: [
      'Written scope before construction contract',
      'Selection schedule with long-lead tracking',
      'Panel check if adding circuits',
      'Contingency for concealed damage',
    ],
  },
  {
    h2: 'Related cost guides',
    paragraphs: [
      'Compare <a href="/blog/bathroom-remodel-cost-boise">bathroom costs</a>, <a href="/blog/whole-home-remodel-cost-boise">whole-home ranges</a>, and <a href="/blog/what-impacts-remodeling-costs-boise">cost drivers</a> in our cost hub.',
    ],
  },
];

const bathroomExtra: ContentSection[] = [
  {
    h2: 'Guest bath vs master bath costs in Idaho',
    paragraphs: [
      'Guest baths and powder rooms in Star, Middleton, and Kuna often land between $18,000 and $45,000 for a full refresh. Master suites with curbless showers, niches, and premium tile commonly reach $35,000–$85,000+.',
    ],
  },
  {
    h2: 'Walk-in and curbless shower cost drivers',
    paragraphs: [
      'Linear drains, large-format tile, and frameless glass increase labor. Waterproofing and flood testing are non-negotiable for inspectors in Ada and Canyon County.',
    ],
  },
  {
    h2: 'Ventilation, heat, and electrical',
    paragraphs: [
      'Proper exhaust prevents mold in Idaho’s dry-but-steamy bath cycles. Radiant floor heat adds electrical load and thermostat zones - popular in Eagle and Boise Foothills master baths.',
    ],
  },
  {
    h2: 'Permits for layout changes',
    paragraphs: [
      'Relocating a toilet or expanding a footprint triggers plan review. Factor 2–6 weeks in Ada County depending on complexity.',
    ],
  },
  {
    h2: 'City-specific service links',
    paragraphs: [
      '<a href="/services/bathroom-remodel/boise">Boise bathroom remodel</a>, <a href="/services/bathroom-remodel/meridian">Meridian</a>, <a href="/services/bathroom-remodel/nampa">Nampa</a>, <a href="/services/bathroom-remodel/eagle">Eagle</a>, <a href="/areas/middleton">Middleton</a>, <a href="/areas/caldwell">Caldwell</a>.',
    ],
  },
  {
    h2: 'Budgeting tips',
    paragraphs: [
      'Bundle plumbing fixtures at one finish level. Use alcove tubs in guest baths to save space and cost. See <a href="/blog/how-to-budget-remodel-boise">budgeting guide</a>.',
    ],
  },
];

const wholeHomeExtra: ContentSection[] = [
  {
    h2: 'What defines a whole-home remodel budget?',
    paragraphs: [
      'Whole-home programs in Boise and Meridian often span $180,000–$425,000+ depending on square footage affected, structural work, and number of wet areas.',
    ],
  },
  {
    h2: 'Phasing vs single mobilization',
    paragraphs: [
      'Phasing can spread cash flow but adds mobilization cost. Single-phase work is efficient when temporary housing is arranged.',
    ],
  },
  {
    h2: 'Electrical, HVAC, and envelope upgrades',
    paragraphs: [
      'Older North End and Bench homes may need panel upgrades and insulation when walls are open - budget these early, not as change orders.',
    ],
  },
  {
    h2: 'Contingency for concealed conditions',
    paragraphs: [
      'Hold 10–15% for unknowns behind walls. Whole-home demos reveal framing, plumbing, and wiring surprises.',
    ],
  },
  {
    h2: 'Links',
    paragraphs: [
      '<a href="/services/whole-home-remodel">Whole-home remodeling</a>, <a href="/services/whole-home-remodel/boise">Boise</a>, <a href="/services/whole-home-remodel/meridian">Meridian</a>, <a href="/blog/remodeling-vs-moving">remodeling vs moving</a> (coming soon).',
    ],
  },
];

const additionExtra: ContentSection[] = [
  {
    h2: 'Room addition cost ranges in the Treasure Valley',
    paragraphs: [
      'Ground-floor additions often run $80,000–$250,000+ including design, permits, foundation, framing, MEP, and finish. Second stories can exceed this when structural retrofits are required.',
    ],
  },
  {
    h2: 'Foundation and site work',
    paragraphs: [
      'Soils, setbacks, and utility locations in Eagle and Hidden Springs affect foundation type. Rock and drainage add site cost in Foothills lots.',
    ],
  },
  {
    h2: 'Matching architecture',
    paragraphs: [
      'Roof lines, siding, and window rhythm must match or intentionally contrast per HOA and city design standards.',
    ],
  },
  {
    h2: 'ADU comparison',
    paragraphs: [
      'ADUs and guest houses overlap addition economics - see <a href="/services/adu">ADU services</a> and <a href="/blog/home-addition-cost-boise">this guide’s companion articles</a>.',
    ],
  },
  {
    h2: 'Service areas',
    paragraphs: [
      '<a href="/services/room-addition/boise">Boise additions</a>, <a href="/services/room-addition/eagle">Eagle</a>, <a href="/services/room-addition/kuna">Kuna</a>, <a href="/areas/nampa">Nampa area</a>.',
    ],
  },
];

const luxuryExtra: ContentSection[] = [
  {
    h2: 'What counts as a luxury remodel in Boise and Eagle?',
    paragraphs: [
      'Custom millwork, book-matched stone, integrated lighting scenes, and high-performance windows define luxury programs - often $200,000–$600,000+ for multi-room scope.',
    ],
  },
  {
    h2: 'Design development investment',
    paragraphs: [
      'Luxury projects require longer design phases, mock-ups, and vendor coordination. That front-loaded time reduces expensive field changes.',
    ],
  },
  {
    h2: 'HOA and design review',
    paragraphs: [
      'Harris Ranch, Hidden Springs, and Eagle Foothills HOAs add calendar time; budget holding costs if carrying two homes.',
    ],
  },
  {
    h2: 'Without a dedicated luxury service page',
    paragraphs: [
      'We deliver luxury work through our <a href="/services/kitchen-remodel">kitchen</a>, <a href="/services/bathroom-remodel">bathroom</a>, and <a href="/services/whole-home-remodel">whole-home</a> teams - one design-build contract.',
    ],
  },
];

const perSqFtExtra: ContentSection[] = [
  {
    h2: 'When cost per square foot helps - and when it misleads',
    paragraphs: [
      '$/SF is useful for whole-home and addition planning after preliminary design. It misleads when comparing a kitchen to a carpet refresh.',
    ],
  },
  {
    h2: 'Sample planning bands',
    paragraphs: ['See table in our <a href="' + PILLAR_COST + '">main cost guide</a>.'],
    table: {
      className: 'cost-table',
      headers: ['Context', '$/SF (indicative)'],
      rows: [
        ['Whole-home major remodel', '$100 – $200+'],
        ['Addition new construction portion', '$200 – $350+'],
        ['Mid kitchen (room SF only)', '$250 – $450+'],
      ],
    },
  },
  {
    h2: 'Boise market factors in 2026',
    paragraphs: [
      'Labor demand, material lead times, and insurance rebuild costs influence $/SF. Localize numbers - national blogs understate Idaho plumbing and electrical rates.',
    ],
  },
];

const impactsExtra: ContentSection[] = [
  {
    h2: 'Top 10 variables that move your remodel price',
    paragraphs: ['Ranked from what we see on Treasure Valley jobs:'],
    list: [
      'Layout and structural changes',
      'Cabinetry and millwork level',
      'Tile complexity and wet-area waterproofing',
      'Existing conditions (rot, panel, asbestos surveys)',
      'Permit jurisdiction and review cycles',
      'Material lead times and freight',
      'Finish level (fixtures, lighting, hardware)',
      'Occupied vs vacant construction',
      'Design-build vs separated contracts',
      'Change orders from late selections',
    ],
  },
  {
    h2: 'Ada vs Canyon permit cost and time',
    paragraphs: [
      'Plan review fees and timelines differ. Structural additions almost always extend both counties’ schedules.',
      '<a href="/resources/ada-canyon-permit-flow">Permit timeline article</a>.',
    ],
  },
  {
    h2: 'How to control cost without cutting quality',
    paragraphs: [
      'Lock scope early, batch selections, and avoid layout changes after permit submission. Value-engineer finishes before shrinking waterproofing or structure.',
    ],
  },
];

const budgetExtra: ContentSection[] = [
  {
    h2: 'Step-by-step remodeling budget framework',
    paragraphs: [
      '1) Define must-haves. 2) Get planning ranges per room. 3) Add soft costs (housing, storage). 4) Hold contingency. 5) Compare only aligned bids.',
    ],
  },
  {
    h2: 'Sample budget allocation',
    paragraphs: ['Illustrative split for a $120,000 kitchen + bath program:'],
    table: {
      className: 'cost-table',
      headers: ['Category', 'Share'],
      rows: [
        ['Construction contract', '70 – 75%'],
        ['Appliances & furnishings', '10 – 15%'],
        ['Contingency', '10 – 15%'],
        ['Temporary housing (if any)', 'Case by case'],
      ],
    },
  },
  {
    h2: 'Financing and timing',
    paragraphs: [
      'HELOCs and renovation loans are common. Align draw schedules with construction milestones in your contract.',
    ],
  },
  {
    h2: 'Work with a local design-build team',
    paragraphs: [
      '<a href="/contact">Contact Boise Remodeling Co</a> for a consultation across Boise, Meridian, Eagle, Kuna, Star, Middleton, Nampa, and Caldwell.',
    ],
  },
];

export const COST_CLUSTER_CONTENT: Record<
  string,
  { html: string; quickAnswer: string; takeaways: string[] }
> = {
  'kitchen-remodel-cost-boise': {
    html: buildSectionsHtml(clusterSections('kitchen remodel cost', kitchenExtra)),
    quickAnswer:
      'Full kitchen remodels in Boise and the Treasure Valley typically range from about $45,000 to $120,000+, driven by layout changes, cabinetry level, and finishes. Appliances are usually budgeted separately.',
    takeaways: [
      'Layout and structural changes are the largest cost swing.',
      'Cabinetry is often 30–40% of the construction budget.',
      'Order long-lead cabinets at design lock.',
      'Compare bids only with matching scope and allowances.',
    ],
  },
  'bathroom-remodel-cost-boise': {
    html: buildSectionsHtml(clusterSections('bathroom remodel cost', bathroomExtra)),
    quickAnswer:
      'Guest bath remodels often run $18,000–$45,000; master baths with layout changes and curbless showers commonly reach $35,000–$85,000+ in Idaho.',
    takeaways: [
      'Master and guest baths should not share one budget number.',
      'Curbless showers add waterproofing and labor.',
      'Ventilation and heat are worth planning upfront.',
    ],
  },
  'whole-home-remodel-cost-boise': {
    html: buildSectionsHtml(clusterSections('whole-home remodel cost', wholeHomeExtra)),
    quickAnswer:
      'Whole-home remodels in the Treasure Valley often range from $180,000 to $425,000+ depending on scope, structural work, and number of wet areas.',
    takeaways: [
      'Treat whole-home work as one program with phases.',
      'Hold 10–15% contingency.',
      'Panel and envelope upgrades are common in older Boise homes.',
    ],
  },
  'home-addition-cost-boise': {
    html: buildSectionsHtml(clusterSections('home addition cost', additionExtra)),
    quickAnswer:
      'Room additions in Boise, Eagle, and Meridian commonly plan between $80,000 and $250,000+ including foundation, structure, MEP, and finish - with second stories often higher.',
    takeaways: [
      'Site and foundation conditions move price early.',
      'HOA review adds time in many Eagle neighborhoods.',
      'Match architecture to protect resale.',
    ],
  },
  'luxury-remodel-cost-boise': {
    html: buildSectionsHtml(clusterSections('luxury remodel cost', luxuryExtra)),
    quickAnswer:
      'Luxury remodels in Eagle, the Foothills, and premium Boise neighborhoods often exceed $200,000 for multi-room scope, with heavy design development and custom finishes.',
    takeaways: [
      'Design time is part of the investment.',
      'HOA review affects calendar, not just aesthetics.',
      'Luxury is delivered through kitchen, bath, and whole-home programs.',
    ],
  },
  'remodel-cost-per-square-foot-boise': {
    html: buildSectionsHtml(clusterSections('remodel cost per square foot', perSqFtExtra)),
    quickAnswer:
      'Remodel cost per square foot in Boise varies by project type: whole-home major work often plans at $100–$200+ per affected SF; room-specific remodels should not use whole-house $/SF alone.',
    takeaways: [
      'Use $/SF only with a defined scope.',
      'Kitchen $/SF is based on room size, not home SF.',
      'Local labor and permits differ from national charts.',
    ],
  },
  'what-impacts-remodeling-costs-boise': {
    html: buildSectionsHtml(clusterSections('remodeling cost drivers', impactsExtra)),
    quickAnswer:
      'The biggest cost drivers for Treasure Valley remodels are layout/structural changes, cabinetry and tile level, existing home conditions, permits (Ada vs Canyon), and late selections - not just square footage.',
    takeaways: [
      'Scope alignment matters more than a low bid.',
      'Permits and engineering are real schedule and cost items.',
      'Finish level moves budget without adding SF.',
    ],
  },
  'how-to-budget-remodel-boise': {
    html: buildSectionsHtml(clusterSections('remodel budgeting', budgetExtra)),
    quickAnswer:
      'Budget a Treasure Valley remodel by defining must-have scope, getting room-level planning ranges, adding appliances and soft costs separately, holding 10–15% contingency, and comparing only aligned written scopes.',
    takeaways: [
      'Separate construction, furnishings, and contingency.',
      'Lock selections before demo to limit change orders.',
      'Use local planning ranges, not national averages.',
    ],
  },
};

const CLUSTER_LINK_FOOTER = `
<h2>More planning resources</h2>
<p>Explore our <a href="/guides/boise-remodeling-cost-guide">Boise Remodeling Cost Guide</a>, <a href="/guides/treasure-valley-remodeling-guide">Treasure Valley guide</a>, <a href="/guides/boise-remodeling-guide">Boise remodeling guide</a>, <a href="/areas">service areas</a>, <a href="/services/kitchen-remodel/boise">Boise kitchen remodels</a>, <a href="/services/bathroom-remodel/meridian">Meridian bathrooms</a>, <a href="/services/whole-home-remodel/eagle">Eagle whole-home</a>, <a href="/services/room-addition/nampa">Nampa additions</a>, <a href="/contact">schedule a consultation</a>, and <a href="/#calculator">project estimator</a>.</p>`;

export function getExpandedClusterHtml(slug: string): string {
  const base = COST_CLUSTER_CONTENT[slug]?.html ?? '';
  return base + CLUSTER_LINK_FOOTER;
}
