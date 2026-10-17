/**
 * Per-city area page copy for the eight Treasure Valley city pages.
 * `getAreaIntro` reads `intro`. The area page renders `faqs` in this order
 * for both the visible accordion and FAQPage schema.
 * Cities outside this map keep the shared template.
 * FAQ shape matches `FAQItem` in shared/seoContent.ts. This file does not
 * import that module, because seoContent imports this one.
 */
export interface AreaFaq {
  question: string;
  answer: string;
}

export interface AreaCityCopy {
  intro: string;
  faqs: AreaFaq[];
  /**
   * Extra neighborhoods-section paragraph. Indian Creek is the creek that
   * runs through Kuna, Nampa, and Caldwell, not a neighborhood name.
   */
  creekNote?: string;
}

const KUNA_CREEK_NOTE =
  'Indian Creek runs through Kuna and continues through Nampa and Caldwell. In Kuna, the Indian Creek Greenbelt follows the creek from Indian Creek Elementary to Orchard Street.';

const CALDWELL_CREEK_NOTE =
  'Indian Creek runs through Kuna and Nampa before it reaches Caldwell, where the creek flows through downtown past Indian Creek Plaza.';

export const AREA_CITY_COPY: Record<string, AreaCityCopy> = {
  boise: {
    intro:
      'Boise has about 106,000 housing units, and the median one was built in 1986 (Census ACS 2020–2024), so most remodels here start with a house that already has some history. Boise Remodeling Co does design-build remodeling for homeowners across Boise and Ada County: kitchen and bathroom renovations, whole-home remodels, and room additions, handled by one accountable team from the first consultation through the final walkthrough.',
    faqs: [
      {
        question: 'What remodeling services do you offer?',
        answer:
          'Four core project types for Boise homes: kitchens, bathrooms, whole-home renovations, and room additions. Each is managed design-build, so one team owns design, permits, and construction, with a written scope before work begins and a dedicated project manager.',
      },
      {
        question: 'Are you licensed and insured?',
        answer:
          "Yes. The company holds its license, bond, and insurance, and we'll provide Idaho contractor license details upon request. Every finished Boise project also comes with a written workmanship guarantee.",
      },
      {
        question: 'How do I start a project?',
        answer:
          'Call (208) 477-1169, run the project estimator for a budget range, or schedule a free consultation at your house via the website. That visit takes 60 to 90 minutes, and you leave with design direction and planning guidance, no obligation. Estimator figures are budget ranges, not quotes.',
      },
      {
        question: 'Do you serve Boise, Idaho?',
        answer:
          'Yes. Our Treasure Valley service area takes in all of Boise, including the North End, the Bench, and East Boise. We take on kitchens, bathrooms, whole-home remodels, and additions locally, and our North End, Bench, East Boise, Harris Ranch, and Hidden Springs remodeling guides go neighborhood by neighborhood.',
      },
      {
        question: 'Which Boise kitchen and bath remodels need a permit?',
        answer:
          "Boise's homeowner guide exempts interior finish work: paint, floor coverings, cabinets, countertops, and wall coverings. A building permit comes into play once a project exposes the framing, builds any wall or partition, or relocates sinks, tubs, showers, or toilets, and most bathroom remodels that replace fixtures need a plumbing permit. We file those permits as part of the design-build contract.",
      },
      {
        question: 'What changes when remodeling an older Boise home?',
        answer:
          "Age shows up in the plan. About 17% of Boise homes were built before 1960 (Census ACS 2020–2024), and layout, structure, and finishes get fitted to the age and style of the house during design. If the home is in a Boise historic district, exterior changes such as windows and siding first need a Certificate of Appropriateness from the Planning division, obtained before the building permit application.",
      },
    ],
  },
  meridian: {
    intro:
      "Most Meridian houses are 2000s-era or newer: about 70% were built in 2000 or after, by the Census Bureau's 2020–2024 survey estimates. Boise Remodeling Co, based in Meridian, delivers design-build remodeling to homeowners here and across Ada County, covering kitchens and bathrooms, full-home remodels, and room additions with one accountable team from consultation to final walkthrough.",
    faqs: [
      {
        question: 'What remodeling services do you offer?',
        answer:
          'Kitchen and bath remodels, renovations of the whole home, and room additions. For Meridian homeowners each project runs design-build, meaning one team carries it from design through construction, with a written progress update every Friday.',
      },
      {
        question: 'Are you licensed and insured?',
        answer:
          "Yes, we're a licensed, bonded, insured remodeler. Ask and we'll share our Idaho contractor license details, and a workmanship guarantee is part of every completed Meridian job.",
      },
      {
        question: 'How do I start a project?',
        answer:
          'Phone (208) 477-1169, try the project estimator, or set a date for a free consultation in your home on our site. The estimator prices the room, the scope, and the finish level rather than a flat cost per square foot, and a firm proposal follows the in-home visit.',
      },
      {
        question: 'Do you serve Meridian, Idaho?',
        answer:
          "Yes. We serve Meridian as part of the Treasure Valley, and it's where we're based, with Lochsa Falls, Tuscany, and Paramount on the map. Kitchen, bath, whole-home, and addition work in Meridian is local for us, and the Meridian remodeling guide has more.",
      },
      {
        question: 'What does Meridian charge to file a remodel permit?',
        answer:
          "Meridian's fee schedule lists a $50 application fee for residential additions and remodels, with the permit itself priced on project valuation. If work starts without a permit, the minimum charge doubles the regular fees, and permitting is already part of our design-build contract.",
      },
      {
        question: 'How old are Meridian homes?',
        answer:
          'Young. Census ACS 2020–2024 estimates put the median Meridian home at 2007, with only about 7% built before 1980 and roughly 30% built between 2000 and 2009, so many Meridian remodels start from a fairly young house. Design starts from your home\'s actual layout at the in-home visit.',
      },
    ],
  },
  eagle: {
    intro:
      "Eagle has roughly 13,500 homes, and about 23% of them date from 2000 through 2009, the Census Bureau's ACS figures for 2020–2024 show. Our design-build remodeling reaches homeowners in Eagle and the rest of Ada County, including room additions, whole-home remodels, and kitchen and bathroom renovations, with a single accountable team from your consultation to the final walkthrough.",
    faqs: [
      {
        question: 'What remodeling services do you offer?',
        answer:
          'Remodeled kitchens and baths, whole-house renovations, and room additions are our core Eagle work, each run design-build so one team answers for design, permitting, and the build.',
      },
      {
        question: 'Are you licensed and insured?',
        answer:
          'We are: licensed, bonded, and insured. Eagle homeowners can request our Idaho contractor license details at any time, and each finished project carries a written workmanship guarantee.',
      },
      {
        question: 'How do I start a project?',
        answer:
          'Call, open the project estimator, or ask for a free in-home consultation using the website. For hillside lots, our Eagle Foothills remodeling guide is a good read before that visit.',
      },
      {
        question: 'Do you serve Eagle, Idaho?',
        answer:
          'Yes. Eagle sits inside our Treasure Valley coverage, including Banbury and Floating Feather. We do kitchen, bathroom, whole-home, and addition remodels throughout Eagle, and the Eagle remodeling guide covers local specifics.',
      },
      {
        question: 'How long does Eagle take to review a room addition?',
        answer:
          "Eagle's Building Division currently lists six weeks (checked October 2026) for residential additions, the same window it gives new houses and shops, and that figure assumes plans need no revisions. Revisions add time, so our addition drawings go in complete.",
      },
      {
        question: 'Do repairs and replacements need an Eagle building permit?',
        answer:
          "Often. Eagle's Building Division requires a permit for additions, alterations, enlargement, replacement, repair, and demolition of residential structures, among other work, and enforces the 2018 International Residential Code. Which parts of your remodel count as permitted work gets sorted out during design.",
      },
    ],
  },
  nampa: {
    intro:
      "Nampa's homes span a wide range of ages: roughly 26% were built before 1980 and 28% from 2000 to 2009, per American Community Survey 2020–2024 estimates. Boise Remodeling Co serves Nampa and Canyon County homeowners with design-build remodeling, from kitchen and bath renovations to remodels of entire houses and room additions, and one accountable team runs each job from consultation through the final walkthrough.",
    faqs: [
      {
        question: 'What remodeling services do you offer?',
        answer:
          'In Nampa we remodel kitchens and bathrooms, renovate whole homes, and build room additions. Every project is design-build, with one team responsible for the drawings, the permit, and the construction.',
      },
      {
        question: 'Are you licensed and insured?',
        answer:
          "Yes. We're licensed, bonded, and insured; just ask for our Idaho contractor license details. Permits for your Nampa remodel are pulled in-house as part of our contract.",
      },
      {
        question: 'How do I start a project?',
        answer:
          'Ring us, try the project estimator for budget numbers, or set up a free in-home consultation online. Every Nampa project then gets a written scope before construction starts.',
      },
      {
        question: 'Do you serve Nampa, Idaho?',
        answer:
          'Yes, Nampa is one of our Treasure Valley cities, Downtown Nampa, Karcher, and Greenhurst included. Kitchens, baths, whole-home remodels, and additions are all local work for us here, and the Nampa remodeling guide goes deeper.',
      },
      {
        question: 'Which Nampa remodels need a building permit?',
        answer:
          "Per Nampa's residential FAQ, swapping cabinets, countertops, flooring, wall coverings, or paint needs no permit. Opening walls down to the framing, moving, removing, or adding walls, relocating sinks, tubs, showers, or toilets, and enlarging or shrinking a window or door opening all do, and so does turning an attic, garage, or basement into living space.",
      },
      {
        question: 'What if earlier work on a Nampa home was never permitted?',
        answer:
          "Nampa's FAQ warns that discovering non-permitted work can delay the sale of a home and may require permits and bringing the work up to code. Removal of the work may be required, and insurance may not cover problems caused by it. Our team permits all of its own work under the design-build contract.",
      },
    ],
  },
  kuna: {
    intro:
      "About a third of Kuna's homes (33%) were built from 2000 through 2009, and owners live in roughly 83% of them (Census ACS 2020–2024). Boise Remodeling Co offers Kuna homeowners design-build remodeling, spanning bathroom and kitchen updates, remodels of the whole house, and room additions throughout Ada County, and the same accountable team is with you from the consultation to the last walkthrough.",
    creekNote: KUNA_CREEK_NOTE,
    faqs: [
      {
        question: 'What remodeling services do you offer?',
        answer:
          'Kuna projects we take on: remodeled kitchens, remodeled bathrooms, whole-home renovations, and room additions. All of them are managed design-build by one team, with a written scope before construction.',
      },
      {
        question: 'Are you licensed and insured?',
        answer:
          'Yes, fully licensed, bonded and insured. Kuna clients can get our Idaho contractor license details on request, and our workmanship guarantee applies at completion.',
      },
      {
        question: 'How do I start a project?',
        answer:
          "Give us a call, use the project estimator, or grab a free in-home consultation slot from the website. Estimator results are budget ranges rather than quotes; the firm proposal comes after we've seen your Kuna home.",
      },
      {
        question: 'Do you serve Kuna, Idaho?',
        answer:
          'Yes. Our Treasure Valley service area includes Kuna, with Black Cat and Crimson Point. Our Kuna work covers kitchens, bathrooms, whole homes, and additions, all handled locally; see the Kuna remodeling guide too.',
      },
      {
        question: 'What does a Kuna permit cost for a remodel?',
        answer:
          "Kuna's Building Department fee schedule prices permits by project value. A project valued from $25,001 to $50,000 pays $326 for the first $25,001 plus $7.20 for each additional $1,000, and the $50,001 to $100,000 tier starts at $506. Mechanical work has separate fees on the same schedule.",
      },
      {
        question: 'When is the best time for a deck or patio project in Kuna?',
        answer:
          "Midsummer is the driest stretch. NOAA's 1991–2020 normals for a volunteer precipitation station just outside Kuna show July and August averaging about half an inch of precipitation combined, compared with more than 1.5 inches in May alone. Our outdoor living work, from decks to covered patios and outdoor kitchens, schedules most easily in those dry months.",
      },
    ],
  },
  star: {
    intro:
      "Roughly 83% of Star's homes were built in 2000 or later, going by five-year Census survey estimates for 2020–2024, which makes Star the newest housing market we work in. For homeowners in Star and greater Ada County, Boise Remodeling Co works as a design-build remodeler, whether that's a kitchen or bathroom renovation, a whole-home remodel, or a room addition, and one accountable team takes each project from consultation to the final walkthrough.",
    faqs: [
      {
        question: 'What remodeling services do you offer?',
        answer:
          'We remodel Star kitchens and bathrooms, take on whole-home renovations, and design and build room additions, managed design-build by one team from first sketch to finished room.',
      },
      {
        question: 'Are you licensed and insured?',
        answer:
          'Yes. We carry a license, a bond, and insurance, and any Star homeowner can have our Idaho contractor license details upon request.',
      },
      {
        question: 'How do I start a project?',
        answer:
          'Call (208) 477-1169, see a range from our project estimator, or line up a free in-home consultation on the website. Prefer to start from drawings? You can upload plans for a planning range, and you confirm every measurement before anything is priced.',
      },
      {
        question: 'Do you serve Star, Idaho?',
        answer:
          'Yes, we serve Star within the Treasure Valley, including Star River Ranch. Kitchen, bath, whole-home, and addition projects in Star are handled by our local team; the Star remodeling guide has details.',
      },
      {
        question: 'Which Star remodels need a permit?',
        answer:
          "Star's building FAQ lists structural additions and remodels, replacing windows or doors when the openings get bigger or smaller, siding replacement over 100 sq ft on an existing house, attached patio covers of any size, decks at least 30 inches above grade, and demolition, among other work. A concrete slab needs no building permit.",
      },
      {
        question: 'Who can pull a remodel permit in Star?',
        answer:
          "Architects, contractors, and homeowners can all apply for permits in Star, according to the city's FAQ, and a contractor applying must hold an Idaho license that is current and valid. As your design-build contractor, we pull the permits for your remodel.",
      },
    ],
  },
  middleton: {
    intro:
      "About 12% of Middleton's homes predate 1980, while nearly half went up in 2010 or after (ACS five-year data, 2020–2024). Boise Remodeling Co brings design-build remodeling to Middleton and Canyon County homeowners: kitchen renovations, bathroom renovations, room additions, and remodels of entire homes, guided by one accountable team from your consultation to the closing walkthrough.",
    faqs: [
      {
        question: 'What remodeling services do you offer?',
        answer:
          'Middleton homeowners hire us for kitchen and bath remodels, whole-house renovations, and added rooms. One design-build team manages the whole job, with a dedicated project manager as your contact.',
      },
      {
        question: 'Are you licensed and insured?',
        answer:
          "Yes: licensed, bonded, and insured. Our Idaho contractor license details are available to Middleton clients upon request, and Middleton's permit portal references Idaho Code 54-5209 for the registration number on building permits.",
      },
      {
        question: 'How do I start a project?',
        answer:
          "Call us, check the project estimator, or arrange a free in-home consultation through the site. A Middleton remodel then moves through the city's Citizenserve portal for permits and inspections, which we handle.",
      },
      {
        question: 'Do you serve Middleton, Idaho?',
        answer:
          'Yes. Middleton is on our Treasure Valley service map, including Middleton Heights. Kitchens, bathrooms, whole-home remodels, and additions in Middleton are local projects for our team, and the Middleton remodeling guide covers more.',
      },
      {
        question: 'When does a Middleton remodel need a building permit?',
        answer:
          "Middleton's city code (4-1-1) requires a building permit before any structure over 200 sq ft is constructed, remodeled, renovated, or added to. Its listed exceptions include replacing cabinets without changing plumbing or electrical, repairing but not replacing plumbing fixtures, and swapping exterior glass without changing the frame; other exemptions go to the building official.",
      },
      {
        question: 'Does partial demolition need a permit in Middleton?',
        answer:
          'Yes. Middleton code requires a demolition permit when only a portion of a non-agricultural structure is demolished, while tearing down an entire structure needs no demolition permit. We include any demolition permit in the remodel\'s permit set.',
      },
    ],
  },
  caldwell: {
    intro:
      "Owners occupy roughly 73% of Caldwell's homes, and the city's median house dates to 2003 (Census ACS 2020–2024). Caldwell and Canyon County homeowners get design-build remodeling from Boise Remodeling Co, with kitchen and bath projects, whole-home renovation, and additions of new rooms. One accountable team stays on a Caldwell project from the consultation until the final walkthrough.",
    creekNote: CALDWELL_CREEK_NOTE,
    faqs: [
      {
        question: 'What remodeling services do you offer?',
        answer:
          'Caldwell remodels we manage include kitchen remodels, bath remodels, full-house renovations, and room additions, every one delivered design-build so a single team handles design, permits, and construction.',
      },
      {
        question: 'Are you licensed and insured?',
        answer:
          'Yes. We are licensed, bonded, and insured, and Caldwell homeowners can ask for our Idaho contractor license details whenever they like.',
      },
      {
        question: 'How do I start a project?',
        answer:
          "Start with a call, a number from the project estimator, or a free in-home consultation booked online. You'll get a written scope before construction and a written progress update every Friday once work begins.",
      },
      {
        question: 'Do you serve Caldwell, Idaho?',
        answer:
          'Yes. Caldwell is within the Treasure Valley area we cover, Cleveland Blvd, Ustick, and Wilson among the parts of town we know. We take on kitchen, bath, whole-home, and addition remodels across Caldwell with our local team; see the Caldwell remodeling guide for more.',
      },
      {
        question: 'How much is a Caldwell building permit for a remodel?',
        answer:
          "Caldwell's FY2026 schedule (Resolution 300-25) works from project valuation: a $25,000 to $49,999 remodel starts at $326.54 plus 0.85% of the value above $25,000, and a $50,000 to $99,999 project starts at $549.65 plus 0.565% above $50,000. Building plan review is another 40% on top.",
      },
      {
        question: 'Do plumbing and electrical changes need separate permits in Caldwell?',
        answer:
          "Yes. Caldwell's residential permit packet calls for separate electrical, plumbing, and mechanical permits, and the FY2026 fee schedule prices that trade work on existing homes per item: a $34 base fee plus, for example, $15.75 per plumbing fixture or $22.25 per electrical circuit extension.",
      },
    ],
  },
};
