import { CITIES_LIST, PILLAR_COST, type ContentSection } from './wave1/snippets';
import { getClustersForHub } from '../contentHubs';

/** Compact essentials - link out for valley-wide permit/cost depth. */
export function pillarEssentialsSection(topic: string): ContentSection {
  const t = topic.toLowerCase();
  return {
    h2: 'Planning essentials',
    paragraphs: [
      `Budget, permits, and selections drive ${t} timelines in ${CITIES_LIST} - not a single sticker price.`,
      `Use the <a href="${PILLAR_COST}">Boise Remodeling Cost Guide</a> for ranges, the <a href="/guides/treasure-valley-remodeling-guide">Treasure Valley guide</a> for Ada vs Canyon context, and the <a href="/guides/boise-remodeling-process-guide">process guide</a> for milestones.`,
    ],
    list: [
      'Hold 10–15% contingency in older homes',
      'Lock layout and MEP before finish orders',
      'Match contractor bids with identical scope and permits',
    ],
    subsections: [
      {
        h3: `Common ${t} planning questions`,
        subAnswers: [
          {
            h4: `How long does a ${t} take in the Treasure Valley?`,
            text: `Most ${t} projects run several weeks of design and permitting followed by weeks to months of construction, depending on scope, selections, and whether layout or structural changes trigger plan review.`,
          },
          {
            h4: `Do I need permits for a ${t}?`,
            text: `Cosmetic updates often do not, but changes to layout, structure, plumbing, or electrical require permits through Ada or Canyon County. We coordinate submissions and inspections as part of the design-build contract.`,
          },
          {
            h4: `How do I keep a ${t} on budget?`,
            text: `Define scope in writing, lock selections before construction, hold a 10–15% contingency for concealed conditions in older homes, and compare bids only when allowances and permits match.`,
          },
        ],
      },
    ],
  };
}

export function hubTopicSections(hubSlug: string, topic: string): ContentSection[] {
  const t = topic.toLowerCase();
  switch (hubSlug) {
    case 'kitchen-remodeling':
      return [
        {
          h2: 'Kitchen layouts that work in Boise homes',
          paragraphs: [
            'Ranches, split-levels, and 1990s subdivisions each have different wall and panel constraints. Opening a kitchen often means beams, Ada County sheets, and revised electrical - not just cabinetry.',
            '<a href="/blog/kitchen-layout-ideas-boise-homes">Layout ideas</a> · <a href="/blog/open-concept-kitchen-remodeling">Open concept guide</a>.',
          ],
        },
        {
          h2: 'Cabinets, islands, and appliance planning',
          paragraphs: [
            'Order cabinets at design lock; lead times often exceed eight weeks. Islands need clearance for dishwasher swings and walkways - not just catalog depth.',
            'Appliances are usually client-supplied; we coordinate rough-in. Budget suites separately, often $8,000–$25,000 for a full kitchen.',
          ],
        },
        {
          h2: 'Typical kitchen timeline',
          table: {
            className: 'timeline-table',
            headers: ['Phase', 'Duration'],
            rows: [
              ['Design & selections', '4–10 weeks'],
              ['Permits (layout/MEP)', '2–8 weeks'],
              ['Construction', '8–16 weeks'],
            ],
          },
          paragraphs: [
            '<a href="/blog/kitchen-remodel-timeline-boise">Kitchen remodel timeline</a> · <a href="/blog/kitchen-remodel-cost-boise">Kitchen cost in Boise</a>.',
          ],
        },
      ];
    case 'bathroom-remodeling':
      return [
        {
          h2: 'Guest bath vs master bath scope',
          paragraphs: [
            'Guest refreshes and master suites should not share one budget - waterproofing, layout, and fixture level differ dramatically in Treasure Valley homes.',
          ],
        },
        {
          h2: 'Showers, curbless design, and inspections',
          paragraphs: [
            'Walk-in and curbless showers need slope, drain, and liner systems that pass inspection before tile.',
            '<a href="/blog/walk-in-shower-guide">Walk-in shower guide</a> · <a href="/blog/curbless-shower-guide">Curbless shower guide</a>.',
          ],
        },
        {
          h2: 'Aging-in-place without institutional design',
          paragraphs: [
            'Comfort-height vanities, blocking for grab bars, and wider doorways can look residential - common on the Boise Bench and in North End updates.',
            '<a href="/blog/aging-in-place-bathroom-design">Aging-in-place design</a>.',
          ],
        },
      ];
    case 'home-additions':
      return [
        {
          h2: 'Setbacks, soil, and feasibility',
          paragraphs: [
            'Eagle Foothills and hillside lots may change foundation type early. ADUs need utility, fire separation, and zoning study - not just desired square footage.',
          ],
        },
        {
          h2: 'Second story vs rear addition',
          paragraphs: [
            'Second stories require engineering and longer Ada review. Rear mudrooms and family entries are common in Meridian lots with side or alley access.',
            '<a href="/blog/home-addition-cost-boise">Addition cost planning</a> · <a href="/services/adu">ADU design-build</a>.',
          ],
        },
        {
          h2: 'Addition planning timeline',
          table: {
            className: 'timeline-table',
            headers: ['Phase', 'Duration'],
            rows: [
              ['Feasibility & design', '4–12 weeks'],
              ['Permits', '2–10+ weeks'],
              ['Construction', '3–9 months'],
            ],
          },
          paragraphs: [],
        },
      ];
    case 'whole-home-remodeling':
      return [
        {
          h2: 'Whole-home sequencing',
          paragraphs: [
            'Lock structural, panel, and HVAC decisions before house-wide finish selections. Phasing spreads cost but adds mobilization - use a master finish plan.',
          ],
        },
        {
          h2: 'Living through construction',
          paragraphs: [
            'Temporary kitchens, dust barriers, and utility shutoffs should be planned before demo - not negotiated mid-project.',
            '<a href="/blog/whole-home-remodel-cost-boise">Whole-home cost guide</a>.',
          ],
        },
        {
          h2: 'When contingency matters most',
          paragraphs: [
            '1970s–1990s valley homes often need surprises addressed behind drywall - hold 10–15% until conditions are documented.',
          ],
        },
      ];
    case 'contractor-selection':
      return [
        {
          h2: 'Align scope before price',
          paragraphs: [
            'Demolition, haul-off, permits, engineering, and allowances must match across bids. Ask who owns communication during construction.',
          ],
        },
        {
          h2: 'Vetting questions for Boise-area contractors',
          list: [
            'Written scope and change-order terms',
            'Ada or Canyon permit experience on your address',
            'Design-build vs separate designer and GC',
            'Insurance, license, and reference checks',
            'Warranty language at closeout',
          ],
          paragraphs: [],
        },
        {
          h2: 'Red flags to avoid',
          paragraphs: [
            'Bait pricing, verbal-only scope, and teams that cannot explain jurisdiction for your lot.',
          ],
        },
      ];
    case 'remodeling-process':
      return [
        {
          h2: 'Design-build milestones',
          paragraphs: [
            'Consultation → preliminary scope → design development → agreement → permits → construction → punch list → warranty walkthrough.',
          ],
        },
        {
          h2: 'Permits and selections order',
          paragraphs: [
            'Submit permits when layout is stable; order long-lead items after rough-in requirements are known.',
            '<a href="/blog/boise-permit-guide">Boise permit guide</a> · <a href="/resources/ada-canyon-permit-flow">County timelines</a>.',
          ],
        },
        {
          h2: 'Inspections and closeout',
          paragraphs: [
            'Failed rough inspections should be cleared before cover-up. Punch lists belong in writing before final payment.',
          ],
        },
      ];
    case 'remodeling-roi':
      return [
        {
          h2: 'Match comps on your street',
          paragraphs: [
            'Boise and Meridian resale math depends on subdivision comps - not broad regional averages. Avoid finishing above the street.',
          ],
        },
        {
          h2: 'Pre-sale vs long-term living',
          paragraphs: [
            'Pre-sale updates should mirror buyer expectations. Long-term owners may accept lower resale payback for layout and comfort wins.',
            '<a href="/blog/kitchen-remodel-roi">Kitchen ROI</a> · <a href="/blog/bathroom-remodel-roi">Bathroom ROI</a>.',
          ],
        },
        {
          h2: 'Projects with mixed return',
          paragraphs: [
            'Energy upgrades and outdoor living return varies by buyer pool - prioritize what you will enjoy if payback is uncertain.',
          ],
        },
      ];
    case 'outdoor-living':
      return [
        {
          h2: 'Utilities before hardscape',
          paragraphs: [
            'Outdoor kitchens need gas, electric, and drainage resolved before pavers or concrete. Covered structures tied to the home may need structural permits.',
          ],
        },
        {
          h2: 'Idaho seasons and scheduling',
          paragraphs: [
            'Book exterior concrete and masonry in stable weather windows; plan winter pauses for outdoor kitchens in use.',
            '<a href="/blog/decks-vs-patios-boise">Decks vs patios</a> · <a href="/blog/outdoor-kitchens-boise">Outdoor kitchens</a>.',
          ],
        },
        {
          h2: 'Coordinate with indoor remodels',
          paragraphs: [
            'Shared utilities and traffic flow are easier when indoor kitchen or addition scope is planned together with outdoor entertaining.',
          ],
        },
      ];
    default:
      return [
        {
          h2: `Key topics for ${t}`,
          paragraphs: [
            `Use the articles linked below and our <a href="${PILLAR_COST}">cost guide</a> for Treasure Valley-specific planning.`,
          ],
        },
      ];
  }
}

export function clusterLinksSection(hubSlug: string, linkedSlugs?: string[]): ContentSection | null {
  const clusters = getClustersForHub(hubSlug, true);
  const slugs = linkedSlugs?.length ? new Set(linkedSlugs) : null;
  const items = clusters
    .filter((c) => !slugs || slugs.has(c.slug))
    .slice(0, 8)
    .map((c) => `<a href="/blog/${c.slug}">${c.title}</a>`);
  if (items.length === 0) return null;
  return {
    h2: 'Go deeper: related articles',
    paragraphs: ['Topic-specific articles with more detail than this overview:'],
    list: items,
  };
}
