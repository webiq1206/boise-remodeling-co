import { PILLAR_COST, type ContentSection } from './wave1/snippets';
import {permitGuidanceHtml} from '../../lib/permitGuidance';

/** City- and neighborhood-specific sections (not shared templates). */

const CITY_SNIPPETS: Record<string, ContentSection[]> = {
  'meridian-remodeling-guide': [
    {
      h2: 'Meridian subdivisions and open-kitchen demand',
      paragraphs: [
        '1990s–2010s builder-grade kitchens and baths are the most common upgrade path - homeowners want islands, pantry storage, and better connection to family rooms without leaving the subdivision aesthetic.',
        'Rear-entry mudrooms and drop-zone storage are popular where garage traffic meets kitchen clutter.',
      ],
    },
    {
      h2: 'Meridian housing stock by era',
      paragraphs: [
        'Meridian grew from under 10,000 residents in 1990 to well over 100,000 today, so most of its housing is production-built from three distinct waves. Early-1990s homes around the old downtown core often have compartmentalized kitchens, oak trim, and original electrical panels worth evaluating. The 2000s wave - Lochsa Falls, Paramount, and the subdivisions feeding The Village at Meridian - delivered open-ish great rooms that still hide undersized islands and builder-grade baths. Post-2015 construction near Ten Mile and Chinden mostly needs finish-level upgrades rather than layout surgery.',
        'Because so many Meridian homes share the same few floor plans, we can often show you a finished remodel of nearly your exact layout before design begins. ZIP codes 83642 and 83646 are both fully inside our service area.',
      ],
    },
    {
      h2: 'What Meridian homeowners remodel most',
      paragraphs: [
        'Kitchen opening and island upsizing lead inquiries, followed by primary bath upgrades from garden-tub-and-stall layouts to walk-in shower suites. Bonus-room conversions over garages make strong home offices, and larger Tuscany and Meridian Ranch lots support room additions when families outgrow the footprint but want to keep their schools.',
      ],
    },
    {
      h2: 'Meridian permits and trade scheduling',
      paragraphs: [
        'Ada County review applies for structural and MEP changes. Peak summer trade demand can extend construction - book design before spring if you want fall completion.',
      ],
    },
  ],
  'eagle-remodeling-guide': [
    {
      h2: 'Eagle finish level and HOA design review',
      paragraphs: [
        'Larger footprints and premium materials are normal here - budget for architectural review time and exterior material boards in Harris Ranch, Hidden Springs, and Foothills communities.',
        'Roof and stone tie-ins matter when additions must match executive streetscapes.',
      ],
    },
    {
      h2: 'Eagle housing stock and what drives remodels',
      paragraphs: [
        'Eagle (ZIP 83616) carries the highest median finish level in our service area. Estates along the Boise River corridor and golf-course communities like Banbury and Eagle Hills date largely from the 1990s and 2000s: big footprints with dated kitchens, sunken living rooms, and primary baths built around corner garden tubs. Newer foothills construction in Shadow Valley and The Estates trends contemporary and usually needs personalization rather than reconfiguration.',
        'The common thread in Eagle remodels is bringing 1990s-2000s luxury up to current-decade luxury: panel-ready appliances, full-height backsplashes, curbless wet-room baths, and outdoor living that takes advantage of larger lots near Eagle Island State Park.',
      ],
    },
    {
      h2: 'Eagle additions and master suites',
      paragraphs: [
        'Second stories and master-suite expansions are common; engineering and longer Ada review should be in the calendar from day one.',
        'Floating Feather corridor properties on acreage are also strong ADU and guest-house candidates, with setback room that smaller in-town lots lack.',
      ],
    },
  ],
  'kuna-remodeling-guide': [
    {
      h2: 'Kuna growth and family-focused layouts',
      paragraphs: [
        'Newer inventory favors kitchen refreshes, laundry/mudroom upgrades, and ADU feasibility on larger lots with alley access.',
        'Open kitchen conversions are frequent where builder layouts still feel compartmentalized.',
      ],
    },
    {
      h2: 'Kuna housing stock: young city, young homes',
      paragraphs: [
        'Kuna (ZIP 83634) is one of Idaho\'s fastest-growing cities, and most of its housing postdates 2000. Subdivisions like Crimson Point and developments along the Indian Creek and Ten Mile Creek corridors deliver solid bones with builder-grade everything: laminate counters, basic stall showers, and kitchens that face away from the living space. That makes Kuna remodels efficient - structure rarely needs correction, so budget goes into the finishes and flow homeowners actually feel.',
        'Older properties near the original downtown grid by Indian Creek Plaza are the exception, where 20th-century homes can need electrical and layout work alongside cosmetic updates.',
      ],
    },
    {
      h2: 'Why Kuna families remodel instead of move',
      paragraphs: [
        'Kuna offers some of the valley\'s most attainable lots, and many owners bought intending to grow into the home. Kitchen-and-bath packages timed a few years after purchase are the standard path, and larger lots make room additions and ADUs feasible where Boise infill lots are too tight.',
      ],
    },
  ],
  'star-remodeling-guide': [
    {
      h2: 'Star housing and commuter-friendly upgrades',
      paragraphs: [
        'Smaller footprints benefit from smart storage and efficient kitchen layouts. Outdoor connection to patios is a common second phase after interior work.',
      ],
    },
    {
      h2: 'Star housing stock along the river corridor',
      paragraphs: [
        'Star (ZIP 83669) doubled in population over the last decade, and its housing splits into riverside acreage properties near Star Riverfront Park and newer subdivisions like Star River Ranch built since the mid-2000s. The newer stock needs the familiar builder-grade upgrade path: kitchen islands, pantry storage, and primary bath improvements. Acreage properties along the Boise River often support additions, shops, and guest quarters that subdivision lots cannot.',
        'Star sits at the Ada-Canyon county line, so the permit jurisdiction for your address is worth confirming before design - we handle both and check this on the first visit.',
      ],
    },
  ],
  'middleton-remodeling-guide': [
    {
      h2: 'Middleton and Canyon County permitting',
      paragraphs: [
        'Canyon County portals and review cadence differ from Ada - confirm jurisdiction early if your address is near county lines.',
        'Cross-county trade coordination can add mobilization time; plan one contract with a team that works both corridors regularly.',
      ],
    },
    {
      h2: 'Middleton housing stock and remodel patterns',
      paragraphs: [
        'Middleton (ZIP 83644) mixes century-old farmhouse stock near the original townsite with newer subdivisions like Middleton Heights and acreage properties toward Purple Sage. Farmhouse-era homes reward careful remodeling: original footprints are small, so kitchen openings and primary suite additions deliver outsized livability gains, but knob-and-tube wiring and undersized panels should be budgeted for upgrade when walls open.',
        'Newer Middleton subdivisions follow the standard builder-grade path - kitchen, bath, and storage upgrades - while acreage owners frequently add shops, guest quarters, and outdoor living that town lots cannot fit.',
      ],
    },
  ],
  'nampa-remodeling-guide': [
    {
      h2: 'Nampa housing mix: bungalows to new build',
      paragraphs: [
        'Older bungalows may need electrical and layout creativity; newer sections allow faster cosmetic-to-full-gut paths. Canyon County submission rules apply throughout.',
        'Kitchen and bath still dominate inquiries - whole-home refreshes are growing in established neighborhoods.',
      ],
    },
    {
      h2: 'Nampa neighborhoods and housing eras',
      paragraphs: [
        'Nampa is the second-largest city in the Treasure Valley, and its housing spans a full century. Early-1900s bungalows and cottages around Downtown Nampa and the Nampa Train Depot have charm and small, divided rooms; opening them up takes structural diligence and almost always reveals electrical work worth doing while walls are open. Mid-century neighborhoods like Greenhurst offer ranch layouts that convert beautifully to open plans. The Karcher corridor and newer south-side subdivisions near Lake Lowell follow the modern builder-grade pattern where finish-level upgrades go furthest.',
        'ZIP codes 83651, 83686, and 83687 are all in our regular rotation, and Nampa\'s lower entry prices mean remodel budgets often stretch further here than anywhere else in the valley.',
      ],
    },
    {
      h2: 'Value math in Nampa',
      paragraphs: [
        'Because Nampa home values trail Boise and Eagle, the over-improvement risk is real: a luxury-tier kitchen can exceed what the street supports at resale. We design to your neighborhood comps - mid-range packages with durable finishes are usually the sweet spot, and our ROI guidance covers when to stretch and when to hold.',
      ],
    },
  ],
  'caldwell-remodeling-guide': [
    {
      h2: 'Caldwell housing stock and downtown revival',
      paragraphs: [
        'Caldwell ranges from historic homes near Cleveland Blvd and the College of Idaho to newer construction in Ustick and Wilson - older properties often need electrical, layout, and window updates when kitchens or baths open up.',
        'The downtown revival around Indian Creek Plaza has renewed interest in remodeling established homes rather than relocating, with kitchen, bath, and whole-home refreshes leading inquiries.',
      ],
    },
    {
      h2: 'What Caldwell remodels typically involve',
      paragraphs: [
        'In the College of Idaho and Cleveland Blvd districts (ZIP 83605), early-20th-century homes carry original hardwood, plaster walls, and small service kitchens. The winning approach opens the kitchen to dining while preserving the trim and proportions that make these streets desirable. Out toward Ustick and the newer west side (ZIP 83607), production homes from the 2000s onward follow the standard upgrade arc: island kitchens, walk-in showers, and storage.',
        'Caldwell\'s value pricing also makes it the valley\'s strongest market for whole-home refreshes - buying an established home below Boise prices and putting the difference into a remodel designed around how you live.',
      ],
    },
    {
      h2: 'Caldwell permits and Canyon County coordination',
      paragraphs: [
        'Caldwell remodels route through Canyon County plan review, which uses different portals and inspection cadence than Ada County - confirm jurisdiction early if your address sits near county or city lines.',
        'We design for the local semi-arid high-desert climate, planning insulation, ventilation, and exterior materials that handle Treasure Valley freeze-thaw cycles.',
      ],
    },
  ],
  'north-end-remodeling-guide': [
    {
      h2: 'North End scale and character',
      paragraphs: [
        'Bungalow footprints reward creative storage, respectful additions, and electrical upgrades when walls open. Oversized additions can fight neighborhood rhythm - design for the street.',
        'Galley-to-open plans need beam and permit diligence in Ada County.',
      ],
    },
    {
      h2: 'Remodeling around historic-district review',
      paragraphs: [
        'Parts of the North End fall inside Boise historic districts, where exterior changes - additions, window replacements, porch work - go through a certificate-of-appropriateness review before building permits. Interior remodels generally do not trigger historic review, which is why kitchen, bath, and basement projects are the North End\'s bread and butter. We flag district boundaries during feasibility so review time is in the schedule, not a surprise.',
        'Common scope in these 1900s-1940s homes near Hyde Park: opening a galley kitchen to the dining room with a properly engineered beam, adding a primary bath where a closet or porch allows, and panel upgrades from 60-amp services that predate modern loads. Basements with decent ceiling height are the cheapest square footage in the neighborhood.',
      ],
    },
  ],
  'boise-bench-remodeling-guide': [
    {
      h2: 'Bench ranches and open kitchen conversions',
      paragraphs: [
        'Mid-century ranches are prime for opening kitchen to living space when structure allows. Insulation and panel updates often appear once drywall is removed.',
        'Window and exterior upgrades sometimes pair with interior remodels for comfort in older building envelopes.',
      ],
    },
    {
      h2: 'Why the Bench is the valley\'s best remodel value',
      paragraphs: [
        'The Bench (largely ZIPs 83705 and 83709) is stacked with 1950s-1970s ranches and split-levels on real lots, minutes from downtown, at prices well under the North End. These homes were built with straightforward framing that takes well to open-concept conversion: kitchen walls are often non-bearing or easily beamed, and single-level layouts adapt naturally for aging in place with curbless showers and widened doorways.',
        'Plan for the era\'s known conditions: 100-amp panels that need upsizing for induction ranges and heat pumps, minimal insulation in 2x4 walls worth addressing while drywall is open, and original galvanized supply lines in pre-1960 homes. None are dealbreakers - they are just line items an experienced local team budgets up front rather than discovering mid-build.',
      ],
    },
  ],
  'harris-ranch-remodeling-guide': [
    {
      h2: 'Harris Ranch builder-grade upgrades',
      paragraphs: [
        'Islands, mudrooms, and outdoor entertaining upgrades are common. HOAs may review exterior materials - start design before ordering stone or roofing tie-ins.',
      ],
    },
    {
      h2: 'Remodeling in a master-planned community',
      paragraphs: [
        'Harris Ranch in East Boise (ZIP 83716) is one of the valley\'s premier master-planned communities, built mostly since the mid-2000s along the Boise River and Greenbelt. Structures are young, so remodels here are about elevation, not correction: taking builder-spec kitchens to chef-grade with panel-ready appliances and full-height splash, converting tub-and-stall primary baths to wet rooms, and building out covered outdoor kitchens that use the foothills views.',
        'The community\'s design standards mean exterior changes need architectural review alongside city permits. We prepare the material boards and submittals as part of design, and interior-only projects skip that layer entirely.',
      ],
    },
  ],
  'east-boise-remodeling-guide': [
    {
      h2: 'East Boise infill and newer construction',
      paragraphs: [
        'Primary suite upgrades, open kitchens, and media/flex rooms are frequent. Lot coverage and setback checks matter on infill lots before addition pricing is firm.',
      ],
    },
    {
      h2: 'East Boise housing range: Warm Springs to the foothills',
      paragraphs: [
        'East Boise (ZIPs 83712 and 83716) spans more housing eras than any other part of the city: stately early-1900s homes along the Warm Springs corridor with its geothermal heating district, mid-century neighborhoods toward Table Rock, and contemporary construction in Harris Ranch and the river corridor. Each calls for a different remodel playbook - preservation-minded updates near Warm Springs, open-concept conversions in mid-century stock, and finish-level elevation in newer builds.',
        'Proximity to the Greenbelt and foothills trailheads keeps East Boise demand strong, which supports more ambitious remodel budgets than most of the valley. Additions still need early setback and lot-coverage checks on the older, tighter lots.',
      ],
    },
  ],
  'hidden-springs-remodeling-guide': [
    {
      h2: 'Hidden Springs HOA and exterior coordination',
      paragraphs: [
        'Architectural review adds calendar time. Exterior remodels should match community standards for stone, roofing, and color palettes.',
        'Interior kitchen and bath work still dominates, often with premium fixture levels.',
      ],
    },
    {
      h2: 'Hidden Springs homes, twenty years on',
      paragraphs: [
        'Hidden Springs is a planned village in the Boise foothills (ZIP 83714) built mostly between the late 1990s and 2010s, with traditional architecture and tight community design standards. The first generation of homes is now at the classic remodel age: kitchens and primary baths that were premium in 2002 read dated next to current finishes, and owners who love the community\'s schools, trails, and village core are upgrading in place rather than leaving.',
        'Typical scope runs kitchen refreshes with island reconfiguration, wet-room primary bath conversions, and basement build-outs. Anything touching the exterior - windows, doors, rooflines, additions - goes through the community\'s architectural review first, and we build that step into every Hidden Springs schedule.',
      ],
    },
  ],
  'eagle-foothills-remodeling-guide': [
    {
      h2: 'Foothills lots, soil, and structural complexity',
      paragraphs: [
        'Hillside and view lots can move foundation and retaining requirements early. Additions and outdoor living should plan drainage and access for equipment.',
        'Expect engineering and Ada review for structural tie-ins to existing framing.',
      ],
    },
    {
      h2: 'Designing for view lots and hillside sites',
      paragraphs: [
        'Eagle foothills properties trade flat-lot simplicity for views, privacy, and acreage - and their remodels reflect it. Window-wall conversions that open great rooms to the view, outdoor living terraces engineered into the slope, and primary suite relocations to the view side of the house are the signature projects. Site access for equipment, drainage management, and retaining structures belong in the budget conversation on day one, not as change orders.',
        'Larger parcels here are also strong candidates for detached ADUs and guest houses, with the setback room that valley-floor subdivisions lack. Engineering and Ada County review timelines run longer for hillside structural work, so we sequence design and permitting to keep construction inside the dry season when slopes are most workable.',
      ],
    },
  ],
};

export function getCitySpecificSections(slug: string): ContentSection[] {
  return CITY_SNIPPETS[slug] ?? [];
}

export function buildLocationGuideSections(
  slug: string,
  cityName: string,
  citySlug: string,
  county: 'ada' | 'canyon',
  housingNote: string,
  guideType: 'location' | 'neighborhood',
): ContentSection[] {
  const countyGuide =
    county === 'ada'
      ? '<a href="/blog/ada-vs-canyon-county-permit-timelines">Ada vs Canyon permit timelines</a>'
      : '<a href="/blog/ada-vs-canyon-county-permit-timelines">Canyon County permit timelines</a>';

  return [
    {
      h2: `Remodeling in ${cityName}`,
      paragraphs: [
        housingNote,
        `This ${guideType === 'neighborhood' ? 'neighborhood' : 'city'} guide links local housing context, permits, and services - start with the <a href="/guides/treasure-valley-remodeling-guide">Treasure Valley hub</a> for valley-wide planning.`,
      ],
    },
    ...getCitySpecificSections(slug),
    {
      h2: 'Services and planning ranges',
      paragraphs: [
        `<a href="/services/kitchen-remodel/${citySlug}">Kitchen</a> · <a href="/services/bathroom-remodel/${citySlug}">Bathroom</a> · <a href="/services/whole-home-remodel/${citySlug}">Whole-home</a> · <a href="/services/room-addition/${citySlug}">Additions</a> · <a href="/areas/${citySlug}">${cityName} area page</a>.`,
        `Planning bands: <a href="${PILLAR_COST}">Boise Remodeling Cost Guide</a>.`,
      ],
    },
    {
      h2: `Permits and property jurisdiction in ${cityName}`,
      paragraphs: [
        permitGuidanceHtml(cityName),
        countyGuide,
      ],
    },
    {
      h2: 'Next steps',
      paragraphs: [
        '<a href="/#calculator">Estimator</a> · <a href="/contact">Schedule consultation</a> · <a href="/guides">All guides</a>.',
      ],
    },
  ];
}
