import { buildSectionsHtml, CITIES_LIST, PILLAR_COST, type ContentSection } from './snippets';
import { expandLocation } from '../contentFactory';

const tvSections: ContentSection[] = [
  {
    h2: 'Why the Treasure Valley is a distinct remodeling market',
    paragraphs: [
      `We serve ${CITIES_LIST} across Ada and Canyon Counties with design-build kitchen, bathroom, whole-home, addition, and ADU work.`,
      'Costs, permits, housing stock, and HOA rules vary by city - use this hub to pick your city guide, then the topic guide that matches your project.',
    ],
  },
  {
    h2: 'City and neighborhood guides',
    list: [
      '<a href="/guides/boise-remodeling-guide">Boise</a>',
      '<a href="/guides/meridian-remodeling-guide">Meridian</a>',
      '<a href="/guides/eagle-remodeling-guide">Eagle</a>',
      '<a href="/guides/kuna-remodeling-guide">Kuna</a>',
      '<a href="/guides/nampa-remodeling-guide">Nampa</a>',
      '<a href="/guides/star-remodeling-guide">Star</a>',
      '<a href="/guides/middleton-remodeling-guide">Middleton</a>',
      '<a href="/guides/caldwell-remodeling-guide">Caldwell</a>',
    ],
    paragraphs: ['Each guide links local housing notes, permits, and service URLs.'],
  },
  {
    h2: 'Ada County vs Canyon County',
    paragraphs: [
      'Boise, Meridian, Eagle, Kuna, and Star primarily use Ada County for many residential permits. Nampa, Middleton, and Caldwell are in Canyon County.',
      '<a href="/resources/ada-canyon-permit-flow">Permit timeline comparison</a>',
    ],
  },
  {
    h2: 'Planning ranges by project type',
    table: {
      className: 'cost-table',
      headers: ['Project', 'Planning note'],
      rows: [
        ['Kitchen', 'Layout and cabinets drive budget'],
        ['Bathroom', 'Master vs guest baths differ'],
        ['Whole-home', 'Sequence MEP before finishes'],
        ['Addition', 'Setbacks and soil matter early'],
      ],
    },
    paragraphs: [`Full bands: <a href="${PILLAR_COST}">Boise Remodeling Cost Guide</a>.`],
  },
  {
    h2: 'Hub guides by project',
    list: [
      '<a href="/guides/boise-kitchen-remodeling-guide">Kitchen</a>',
      '<a href="/guides/boise-bathroom-remodeling-guide">Bathroom</a>',
      '<a href="/guides/boise-home-addition-guide">Additions</a>',
      '<a href="/guides/whole-home-remodeling-guide">Whole-home</a>',
      '<a href="/guides/choose-remodeling-contractor-boise">Contractor selection</a>',
      '<a href="/guides/boise-remodeling-process-guide">Process</a>',
      '<a href="/guides/best-remodeling-roi-boise">ROI</a>',
      '<a href="/guides/outdoor-living-remodeling-guide">Outdoor living</a>',
    ],
    paragraphs: [],
  },
  {
    h2: 'Next steps',
    paragraphs: [
      '<a href="/#calculator">Estimator</a> · <a href="/contact">Consultation</a> · <a href="/areas">Service areas</a>.',
    ],
  },
];

const boiseSections: ContentSection[] = [
  {
    h2: 'What to know about remodeling a home in Boise',
    paragraphs: [
      'Boise spans more housing eras than any other city in the valley: North End bungalows, Bench ranches, mid-century East Boise and master-planned Harris Ranch. The era of the house drives the structural, electrical and layout work a remodel needs more than anything else.',
      'Property inside Boise city limits starts with the City of Boise building department; unincorporated property follows the Ada County process. Valley-wide planning lives in the <a href="/guides/treasure-valley-remodeling-guide">Treasure Valley remodeling guide</a>.',
    ],
  },
  {
    h2: 'North End and Bench',
    paragraphs: [
      'Smaller footprints and galley kitchens are common, so creative storage and panel upgrades matter when walls open. Parts of the North End sit in Boise historic districts, where exterior changes need a certificate of appropriateness before a building permit.',
      '<a href="/guides/north-end-remodeling-guide">North End remodeling guide</a> · <a href="/guides/boise-bench-remodeling-guide">Boise Bench remodeling guide</a>.',
    ],
  },
  {
    h2: 'Harris Ranch, East Boise and Hidden Springs',
    paragraphs: [
      'Open kitchens, mudrooms and primary suites are frequent in newer neighborhoods, and community design review covers exterior materials in Harris Ranch and Hidden Springs. Older East Boise lots need setback and lot-coverage checks before an addition is priced.',
      '<a href="/guides/harris-ranch-remodeling-guide">Harris Ranch</a> · <a href="/guides/east-boise-remodeling-guide">East Boise</a> · <a href="/guides/hidden-springs-remodeling-guide">Hidden Springs</a>.',
    ],
  },
  {
    h2: 'Permits for a Boise remodel',
    paragraphs: [
      'Boise\'s homeowner guide exempts painting, floor covering, cabinets, countertops and wall coverings. A permit is needed once work exposes the framing, adds a wall, or moves a sink, and venting a new range hood takes its own mechanical permit.',
      'The <a href="/resources/ada-canyon-permit-flow">Ada vs Canyon County permit flow</a> walks through each step, and the <a href="/blog/boise-permit-guide">Boise permit guide</a> covers common projects.',
    ],
  },
  {
    h2: 'Budgeting a Boise remodel',
    paragraphs: [
      'As of 2026, a mid-range Treasure Valley kitchen plans $37,000 to $47,000, and pre-1990 homes deserve a 10 to 15 percent contingency for wiring, plumbing or framing found behind the walls.',
      `The <a href="${PILLAR_COST}">Boise remodeling cost guide</a> has planning ranges for every project type.`,
    ],
  },
  {
    h2: 'Boise planning checklist',
    list: [
      'Confirm the permit path for layout changes',
      'Hold contingency in pre-1990 homes',
      'Lock appliance rough-in before drywall',
      'Compare bids with identical scope',
    ],
    paragraphs: [],
  },
  {
    h2: 'Remodeling services in Boise',
    paragraphs: [
      'When you are ready to talk about a specific project, the Boise page covers how we work locally: <a href="/areas/boise">remodeling contractors in Boise</a>. Service pages: <a href="/services/kitchen-remodel/boise">kitchen remodeling in Boise</a>, <a href="/services/bathroom-remodel/boise">bathroom remodeling in Boise</a> and <a href="/services/whole-home-remodel/boise">whole-home remodeling in Boise</a>.',
    ],
  },
];

// Insert on-brand sage callouts between the assembled <h2>/<p> blocks by
// anchoring on stable section headings.
function injectCallouts(html: string, callouts: Array<[string, string]>): string {
  return callouts.reduce((acc, [anchor, callout]) => acc.replace(anchor, callout + anchor), html);
}

const TV_CALLOUTS: Array<[string, string]> = [
  [
    '<h2>Ada County vs Canyon County</h2>',
    '<div class="callout note"><p class="callout-label">Which county are you in?</p><p><strong>Ada County:</strong> Boise, Meridian, Eagle, Kuna, and Star. <strong>Canyon County:</strong> Nampa, Middleton, and Caldwell. The two use <span class="sage">different permit portals and review cadences</span>, which affects your timeline - your design-build contractor handles the right path for you.</p></div>',
  ],
  [
    '<h2>Planning ranges by project type</h2>',
    '<div class="callout tip"><p class="callout-label">Get a rough number first</p><p>Try the <a href="/#calculator">project estimator</a> for a quick planning range, then see the <a href="/guides/boise-remodeling-cost-guide">Boise Remodeling Cost Guide</a> for detailed bands by project. Read these as <span class="sage">planning ranges</span>, not quotes.</p></div>',
  ],
];

const BOISE_CALLOUTS: Array<[string, string]> = [
  [
    '<h2>North End and Bench</h2>',
    '<div class="callout tip"><p class="callout-label">Remodeling an older Boise home?</p><p>North End bungalows and Bench ranches are full of character - and often outdated wiring and plumbing behind the walls. Budget for <span class="sage">electrical and plumbing updates</span> and creative layout solutions, and hold a contingency for the surprises older homes reveal once opened.</p></div>',
  ],
  [
    '<h2>Boise planning checklist</h2>',
    '<div class="callout note"><p class="callout-label">Key point</p><p>The most successful Boise remodels lock scope, structure, and selections <span class="sage">before demolition</span>. Decisions made on paper are inexpensive; the same changes mid-construction become costly change orders.</p></div>',
  ],
];

export const TREASURE_VALLEY_GUIDE_HTML = expandLocation(
  injectCallouts(buildSectionsHtml(tvSections), TV_CALLOUTS),
  'treasure-valley-remodeling-guide',
);
export const BOISE_GUIDE_HTML = expandLocation(
  injectCallouts(buildSectionsHtml(boiseSections), BOISE_CALLOUTS),
  'boise-remodeling-guide',
);

export const TV_QUICK_ANSWER =
  'The Treasure Valley covers Boise, Meridian, Eagle, Kuna, Star, Middleton, Nampa, and Caldwell - Ada and Canyon Counties use different permit paths. Pick your city guide, then the topic guide for your project.';

export const BOISE_QUICK_ANSWER =
  'Remodeling in Boise starts with the age of the house: North End bungalows and Bench ranches often need electrical and layout work, while newer Harris Ranch homes need finish upgrades. Property inside city limits is permitted by the City of Boise, and pre-1990 homes deserve a 10 to 15 percent contingency.';

export const TV_TAKEAWAYS = [
  'Ada and Canyon Counties use different permit paths.',
  'Pick a city guide for local context.',
  'Use the cost guide for planning bands.',
];

export const BOISE_TAKEAWAYS = [
  'Neighborhood era drives electrical and layout scope.',
  'North End and Bench need creative kitchen plans.',
  'Link to city services for each project type.',
];
