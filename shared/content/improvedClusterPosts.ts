import type { ContentSection } from './wave1/snippets';

/**
 * Phase 4: eight factory cluster posts (260 to 280 words of template copy)
 * rewritten with substance. Every fact here already appears elsewhere in this
 * repository: the process, ROI and outdoor pillar guides, the service pages,
 * the homepage FAQ (two-year workmanship guarantee), the covered-patio and
 * outdoor-kitchen posts and the home-addition cost post. No new numbers.
 *
 * Each post links its pillar guide and one service page in the body, and the
 * sections replace the generic "Planning X in the Treasure Valley" template.
 */
export interface ImprovedClusterPost {
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  quickAnswer: string;
  takeaways: string[];
  serviceUrl: string;
  sections: ContentSection[];
}

const PROCESS = '/guides/boise-remodeling-process-guide';
const ROI = '/guides/best-remodeling-roi-boise';
const OUTDOOR = '/guides/outdoor-living-remodeling-guide';

export const IMPROVED_CLUSTER_POSTS: Record<string, ImprovedClusterPost> = {
  'punch-list-guide': {
    seoTitle: 'Remodel punch list: final walk-through',
    metaDescription:
      'A remodel punch list is the final details caught in a walk-through. What belongs on it, who writes it, and how it connects to sign-off and the warranty.',
    excerpt: 'What a remodel punch list is, what belongs on it, and how the final walk-through and sign-off work.',
    quickAnswer:
      'A punch list is the set of final details caught in a walk-through near the end of a remodel: touch-ups, adjustments and small corrections. A good contractor works through it before sign-off, and the contract should say from the start how the project is completed and supported.',
    takeaways: [
      'The punch list belongs in the contract, not in a hallway conversation.',
      'Walk the work with your project manager before you sign off.',
      'The warranty starts where the punch list ends.',
    ],
    serviceUrl: '/services/whole-home-remodel',
    sections: [
      {
        h2: 'What a punch list is',
        paragraphs: [
          'A remodel is not done when the last tile is set. Near the end of construction you and your project manager walk the finished work together and list everything that still needs attention: paint touch-ups, a cabinet door that needs adjusting, caulk lines, a missing cover plate, a scratch on new trim. That list is the punch list, and working through it is how a project moves from nearly finished to finished.',
          'Our <a href="' + PROCESS + '">Boise remodeling process guide</a> places the punch list where it belongs: after construction and before the warranty, as the last phase a contractor is accountable for.',
        ],
      },
      {
        h2: 'What belongs on the list, and what does not',
        paragraphs: [
          'The punch list is for completing the agreed scope to the agreed standard. It is not the place for new work. A request for an extra outlet or a different paint color is a change, and changes are priced and scheduled in writing like any other change order.',
        ],
        list: [
          'Finish defects: paint, caulk, grout and trim touch-ups.',
          'Adjustments: doors, drawers, hardware and fixtures that need tuning.',
          'Missing items: cover plates, stops, trim pieces and hardware.',
          'Clean-up: dust, labels and protective film left behind.',
        ],
      },
      {
        h2: 'Running the final walk-through',
        paragraphs: [
          'Walk the space in daylight and again with the lights on, open every door and drawer, run every faucet and fan, and note each item with its location. Your project manager remains the single point of contact for the list, so nothing depends on catching a trade on the way out.',
          'On our projects the final walkthrough is the last step of the process, and we review every detail with you before sign-off. That is true on a single <a href="/services/whole-home-remodel">whole-home remodel</a> phase or a one-room project.',
        ],
      },
      {
        h2: 'Sign-off, then the warranty',
        paragraphs: [
          'Once the punch list is complete, the project is signed off and the workmanship guarantee takes over. Boise Remodeling Co guarantees remodeling workmanship for two years and passes through manufacturer warranties on fixtures and cabinetry we install. Both the punch list and the warranty should be defined in your contract from the start, so you know exactly how the project will be completed and supported.',
        ],
      },
      {
        h2: 'Where the punch list sits in the schedule',
        paragraphs: [
          'Most of what makes a punch list short happens months earlier. Preconstruction is where the design is developed, every material is selected, the scope is priced and permits are secured; finalizing all of it before demolition lets construction run predictably, and a predictable build leaves fewer loose ends at the end.',
          'During construction you receive written schedule updates every week, and your project manager remains your single point of contact from the first visit to the final walkthrough. That continuity is what lets the punch list close quickly: the person walking the list with you is the person who managed the work.',
        ],
      },
      {
        h2: 'Questions to settle before the walk-through',
        paragraphs: ['Agree on these early, ideally in the contract:'],
        list: [
          'Who writes the punch list, and do I get a copy?',
          'How long will the punch list items take to complete?',
          'What counts as a punch list item, and what is a change order?',
          'When does sign-off happen, and when does the warranty start?',
        ],
      },
    ],
  },

  'warranty-guide-remodeling': {
    seoTitle: 'Remodeling warranty: what it covers',
    metaDescription:
      'How a remodeling workmanship guarantee works: what it covers, how long it runs, how manufacturer warranties fit in, and what to get in writing first.',
    excerpt: 'How a remodeling workmanship guarantee works and what to get in writing before you sign.',
    quickAnswer:
      'A remodeling warranty has two layers: the contractor guarantees its own workmanship, and manufacturers warrant the products. Boise Remodeling Co guarantees remodeling workmanship for two years in writing and passes through manufacturer warranties on fixtures and cabinetry it installs.',
    takeaways: [
      'Workmanship and product warranties are two different promises.',
      'Get the guarantee, its length and its process in writing.',
      'The warranty starts after the punch list is complete.',
    ],
    serviceUrl: '/services/bathroom-remodel',
    sections: [
      {
        h2: 'Two warranties, two promises',
        paragraphs: [
          'A workmanship guarantee covers how the work was done: the installation, the framing, the tile setting, the trim. A manufacturer warranty covers the product itself: the faucet, the cabinet box, the window unit. When something fails, the first question is which of the two it is, which is why both belong in your paperwork.',
          'Boise Remodeling Co guarantees remodeling workmanship for two years and passes through manufacturer warranties on fixtures and cabinetry we install.',
        ],
      },
      {
        h2: 'Get it in writing before you sign',
        paragraphs: [
          'Vague contracts are one of the biggest sources of remodeling disputes. Before you sign, the agreement should name the length of the workmanship guarantee, what it covers, and how you report a problem. A written scope before construction, clear allowances for selections and a written workmanship guarantee at the end are the three documents that make a remodel predictable.',
          'Our <a href="' + PROCESS + '">remodeling process guide</a> covers where the warranty sits in the sequence, and the <a href="/guides/choose-remodeling-contractor-boise">contractor selection guide</a> covers what else to get in writing.',
        ],
      },
      {
        h2: 'Where the warranty starts',
        paragraphs: [
          'The warranty takes over once the punch list is complete and the project is signed off. On a <a href="/services/bathroom-remodel">bathroom remodel</a>, for example, the final walkthrough reviews every detail before sign-off, and the two-year written workmanship guarantee on our labor starts from there.',
        ],
      },
      {
        h2: 'Questions to ask about any remodeling warranty',
        paragraphs: ['Ask every contractor you compare the same questions, so the answers line up:'],
        list: [
          'How long is the workmanship guarantee, and is it written into the contract?',
          'Which manufacturer warranties pass through to me, and who registers them?',
          'Who do I call, and how quickly will someone come out?',
          'What would void the guarantee?',
        ],
      },
      {
        h2: 'Who stands behind the work',
        paragraphs: [
          'A guarantee is only as good as the team behind it. At Boise Remodeling Co a core in-house team handles project management, design coordination and key trades, while plumbing, electrical and HVAC go to licensed trade partners we schedule and stand behind. Your project manager remains your single point of contact, during the build and after it.',
          'Boise Remodeling Co is an Idaho Registered Contractor (#8381215), bonded and insured. Ask any contractor you compare for the same facts, and check them before you sign.',
        ],
      },
    ],
  },

  'addition-roi-remodeling': {
    seoTitle: 'Home addition ROI in Boise',
    metaDescription:
      'When a home addition adds value in Boise: needs-driven space, permitted square footage, not over-improving the street, and how it compares with moving.',
    excerpt: 'When a home addition adds value in the Treasure Valley, and when it is better measured in years of use.',
    quickAnswer:
      'An addition is a strong investment when it fixes a real need, such as a missing bedroom, a primary suite or room for multigenerational living. Functional, permitted square footage raises value and appraisal, but spending far beyond what the street supports returns less at sale.',
    takeaways: [
      'Needs-driven additions return more than wish-list ones.',
      'Permitted square footage counts; unpermitted space does not.',
      'Match the scale of the addition to the neighborhood.',
    ],
    serviceUrl: '/services/room-addition',
    sections: [
      {
        h2: 'When an addition adds value',
        paragraphs: [
          'Additions can be a strong investment when they address a real need: a missing bedroom, a primary suite, or space for multigenerational living. Adding functional, permitted square footage raises a home\'s value and appraisal, and in a market where move-up inventory is limited, gaining the space you need where you already live is often the better financial move than buying.',
          'Our <a href="' + ROI + '">remodeling ROI guide</a> puts additions alongside kitchens, baths and exterior work, and the <a href="/blog/home-addition-cost-boise">home addition cost guide</a> covers 2026 planning ranges by type.',
        ],
      },
      {
        h2: 'Do not over-improve the street',
        paragraphs: [
          'A home\'s value is anchored to its neighborhood. Spending far more than the surrounding homes support means much of that premium is not recovered at sale. You can still go beyond what pure ROI suggests if you plan to stay and enjoy the space, but know that the extra spend returns less.',
        ],
      },
      {
        h2: 'The cheapest square footage is often already there',
        paragraphs: [
          'Converting existing space such as a garage or basement is the most affordable way to add a room, and a bump-out that extends a kitchen or bathroom a few feet is the most economical way to build out. Boise Remodeling Co plans and builds <a href="/services/room-addition">room additions and bump-outs</a> within the existing footprint; new-footprint and second-story additions are built by Boise Construction Co, our P5 Home Co sibling.',
        ],
      },
      {
        h2: 'Compare the addition with moving',
        paragraphs: [
          'The honest comparison is the full cost of remodeling against the full cost of moving: agent commissions, closing costs on both sides, moving expenses and usually a higher purchase price and property taxes for an upgraded home. Once those are counted, adding on where you already live often wins, and our <a href="/blog/remodeling-vs-moving">remodeling versus moving guide</a> walks through the math.',
        ],
      },
      {
        h2: 'What an addition costs to plan',
        paragraphs: [
          'As of 2026, room additions in the Boise area commonly plan $80,000 to $250,000 or more. Single-room bump-outs sit at the lower end; primary suite additions with bathrooms and second-story additions with structural upgrades reach the upper end. These are planning ranges, not bids: foundation, roof tie-in and whether plumbing is included drive the number.',
        ],
      },
      {
        h2: 'Multigenerational living and ADUs',
        paragraphs: [
          'Two of the fastest-growing reasons to add space are accessory dwelling units and multigenerational living. An ADU can house family, generate rental income or add long-term value, and a garage or basement conversion is often the most affordable route. If the space will house aging parents, build in accessibility from the start. See <a href="/services/adu">ADU conversions</a> and the <a href="/blog/multigenerational-living-remodels">multigenerational living guide</a>.',
        ],
      },
    ],
  },

  'outdoor-living-roi': {
    seoTitle: 'Outdoor living ROI in Boise',
    metaDescription:
      'Does outdoor living add value in Boise? How decks, covered patios and outdoor kitchens return value, why integration matters, and why use is the payoff.',
    excerpt: 'How outdoor living returns value in the Treasure Valley, and why the main payoff is often enjoyment.',
    quickAnswer:
      'A quality, well-integrated outdoor living space can add appeal and value, especially where outdoor living is prized, because it extends usable living and entertaining space. The return varies more than for interior projects and favors tasteful, well-built builds over elaborate personalized ones.',
    takeaways: [
      'Integrated, well-built outdoor space returns more than elaborate features.',
      'A covered structure extends the season and the value.',
      'For most households the main payoff is use, not resale.',
    ],
    serviceUrl: '/services/outdoor-living',
    sections: [
      {
        h2: 'How outdoor living returns value',
        paragraphs: [
          'Outdoor living extends the usable living and entertaining space of a home, and buyers notice it, especially in a valley with long spring, summer and fall seasons. The return varies more than for interior projects, though, and it favors tasteful, well-built and integrated builds over elaborate, personalized ones.',
          'Our <a href="' + ROI + '">remodeling ROI guide</a> compares outdoor work with kitchens, baths and exterior projects, and the <a href="' + OUTDOOR + '">outdoor living remodeling guide</a> covers how to plan the space itself.',
        ],
      },
      {
        h2: 'Cover and shade carry the most weight',
        paragraphs: [
          'A covered structure, whether a solid-roof patio cover, pavilion or pergola, is one of the highest-impact outdoor investments. It provides shade in summer and shelter from rain, protects furniture and an outdoor kitchen, and with heaters extends use into cooler months. A well-built covered patio can add appeal and some resale value; because it is an engineered structure that needs a permit and snow-load design, it is closer in nature to a small addition than to a purchase.',
        ],
      },
      {
        h2: 'Build for Idaho, or the value does not last',
        paragraphs: [
          'Boise\'s freeze-thaw cycles, snow and strong sun quickly destroy materials meant only for mild climates. Outdoor-rated materials, proper base and drainage under hardscape, and plumbing designed to winterize are what make outdoor living last decades here rather than failing in a few seasons, and that durability is part of what a buyer is paying for.',
        ],
      },
      {
        h2: 'Value beyond resale',
        paragraphs: [
          'For most households the primary payoff is enjoyment: how often you gather and spend time outdoors. As of 2026, decks and outdoor living projects in the Boise area commonly plan $25,000 to $75,000 or more, and our <a href="/services/outdoor-living">decks and outdoor living</a> page covers what a design-build outdoor project includes.',
        ],
      },
      {
        h2: 'Outdoor kitchens: build what you will use',
        paragraphs: [
          'An outdoor kitchen turns a patio into an entertaining hub. At minimum it includes a grill, prep counter and storage; common additions are a sink, a refrigerator, a side burner and bar seating. For value as much as enjoyment, build it around what you will actually use rather than loading it with appliances that sit idle, and place it conveniently to the house so it gets used.',
          'Plan gas, water, electrical and drainage early, and design any plumbing to winterize. Utilities and permits planned from the start, ideally with the same team doing any indoor remodel, keep the project smooth and code-compliant.',
        ],
      },
    ],
  },

  'remodeling-before-selling': {
    seoTitle: 'Remodeling before selling in Boise',
    metaDescription:
      'Remodeling before you sell in Boise: which updates pay back, why mid-range beats luxury, fixing what buyers deduct for, and when not to remodel at all.',
    excerpt: 'Which updates pay back before a sale in the Treasure Valley, and which ones to skip.',
    quickAnswer:
      'Before a sale, mid-range updates to what buyers notice most, kitchens, bathrooms and curb appeal, recoup more of their cost than luxury work, and fixing genuine problems removes what buyers would otherwise deduct for. Keep every update appropriate to the neighborhood.',
    takeaways: [
      'Fix genuine problems first: buyers deduct for them.',
      'Mid-range finishes recoup more than luxury ones.',
      'Stay within what the street supports.',
    ],
    serviceUrl: '/services/kitchen-remodel',
    sections: [
      {
        h2: 'Fix what buyers would deduct for',
        paragraphs: [
          'Not all value is cosmetic. Fixing genuine problems, a bad layout, failing systems or moisture issues, adds value by removing what buyers would otherwise deduct for. Before you choose finishes, list what an inspector or a buyer would flag.',
          'Our <a href="' + ROI + '">remodeling ROI guide</a> covers which projects reliably return the most and why.',
        ],
      },
      {
        h2: 'Mid-range beats luxury for a sale',
        paragraphs: [
          'Mid-range remodels recoup a higher percentage of their cost than luxury ones. A quality mid-range kitchen or bath delivers the fresh, functional, broadly appealing result buyers want without an extravagant price, while a high-end remodel recoups a smaller share because its cost climbs faster than the value buyers assign, unless the home and neighborhood are high-end.',
        ],
      },
      {
        h2: 'Where to spend',
        paragraphs: ['The strongest returns generally come from the rooms and surfaces buyers notice first:'],
        list: [
          'Kitchens, the room buyers scrutinize most. As of 2026, a mid-range Treasure Valley kitchen plans $37,000 to $47,000; see <a href="/services/kitchen-remodel">kitchen remodeling</a>.',
          'Bathrooms, and adding one where a home has too few.',
          'Curb appeal: doors, siding, paint and landscaping.',
          'Energy efficiency: air sealing, insulation and efficient HVAC.',
        ],
      },
      {
        h2: 'When not to remodel before selling',
        paragraphs: [
          'A home\'s value is anchored to its neighborhood, so spending far beyond what surrounding homes support means much of that premium is not recovered at sale. If you are deciding whether to stay or go, our <a href="/blog/remodeling-vs-moving">remodeling versus moving guide</a> compares the full costs of each.',
        ],
      },
      {
        h2: 'Invisible upgrades that buyers still pay for',
        paragraphs: [
          'Energy-efficiency upgrades pay back three ways: lower utility bills every month, greater comfort, and growing buyer demand for efficient homes. Air sealing and insulation offer the best return, followed by efficient HVAC and a smart thermostat; new windows add comfort and appeal but have a longer payback. A remodel is the ideal time to do them, because walls may already be open.',
        ],
      },
      {
        h2: 'Value beyond the sale price',
        paragraphs: [
          'Most remodels return a large portion of their cost, not all of it; the rest comes back in a home that shows well and sells faster and more competitively. If you are selling soon, choose quality, timeless updates appropriate to the home and the street, and leave the personal, high-end choices to the next owner.',
        ],
      },
    ],
  },

  'decks-vs-patios-boise': {
    seoTitle: 'Decks vs patios in Boise',
    metaDescription:
      'Deck or patio in Boise? Compare composite and wood decking, hardscape that survives freeze-thaw, covers and permits, and how each fits your yard.',
    excerpt: 'How to choose between a deck and a patio for a Treasure Valley yard.',
    quickAnswer:
      'Decks and patios are the foundation of most outdoor living. The right choice follows your yard and how the space connects to the house, and either one has to be built for Idaho: decking that handles sun and snow, and hardscape with proper base and drainage so water does not sit and freeze.',
    takeaways: [
      'Let the yard and the door to the house decide.',
      'Composite costs more up front and less over time.',
      'Covered structures and raised decks need permits.',
    ],
    serviceUrl: '/services/outdoor-living',
    sections: [
      {
        h2: 'Start with the yard and the house',
        paragraphs: [
          'Decks and patios are the foundation of most outdoor living, and the best one is the one that connects naturally to how you use the house. Think about the flow from indoors to out, zones for cooking, dining and lounging, and how the materials relate to your home. Our <a href="' + OUTDOOR + '">outdoor living remodeling guide</a> covers planning the whole space.',
        ],
      },
      {
        h2: 'Decking: composite or wood',
        paragraphs: [
          'Both work well here. Composite resists Treasure Valley sun, snow and moisture with almost no maintenance and lasts decades, at a higher upfront cost. Cedar and hardwood cost less to install but need regular sealing. As of 2026, a new deck in the Treasure Valley commonly plans $25,000 to $60,000 or more, depending on size, height, railing and material.',
        ],
      },
      {
        h2: 'Patios: hardscape that survives freeze-thaw',
        paragraphs: [
          'Boise\'s freeze-thaw cycles are unforgiving. Hardscape needs a proper base and drainage so water does not sit and freeze, and any plumbing run to an outdoor kitchen must be designed to winterize. Built that way, a patio lasts decades rather than a few seasons.',
        ],
      },
      {
        h2: 'Covers, permits and engineering',
        paragraphs: [
          'Decks above a certain height, attached decks and covered structures require permits in Ada and Canyon County, and a cover must be engineered for snow loads. A covered patio or pergola over either surface is one of the highest-impact outdoor investments. Our <a href="/services/outdoor-living">decks and outdoor living</a> team handles permitting and inspections as part of the scope.',
        ],
      },
      {
        h2: 'Shade decides how much either one gets used',
        paragraphs: [
          'Whichever surface you choose, a covered structure is what makes it usable in far more weather. A solid-roof cover, pavilion or pergola provides shade in summer and shelter from rain, and with heaters extends comfort into cooler months. Lighting makes the space usable after dark, and ceiling fans add comfort on hot days.',
          'As of 2026, decks and outdoor living projects in the Boise area commonly plan $25,000 to $75,000 or more: ground-level wood decks sit at the lower end, while large composite decks, covered patios and outdoor kitchens reach the upper end.',
        ],
      },
    ],
  },

  'outdoor-fireplaces-boise': {
    seoTitle: 'Outdoor fireplaces in Boise',
    metaDescription:
      'Outdoor fireplaces and fire features for Boise homes: extending the season into cool evenings, pairing fire with a covered patio, materials and permits.',
    excerpt: 'How fire features extend outdoor living into cool Treasure Valley evenings.',
    quickAnswer:
      'Fire features and heaters extend outdoor living into cool evenings and the shoulder seasons. They work best as part of one designed space, often under a covered patio, built with outdoor-rated materials and with gas or electrical runs planned and permitted from the start.',
    takeaways: [
      'Fire extends the season; a cover extends it further.',
      'Plan gas and electrical runs during design.',
      'Use materials rated for freeze-thaw.',
    ],
    serviceUrl: '/services/outdoor-living',
    sections: [
      {
        h2: 'Why add fire to an outdoor space',
        paragraphs: [
          'The Treasure Valley\'s spring, summer and fall make outdoor living worth investing in, and fire features and heaters extend the season into cool evenings and the shoulder seasons, even mild winter days. A fireplace or fire feature gives a patio a focal point and a reason to stay outside after dark.',
          'Our <a href="' + OUTDOOR + '">outdoor living remodeling guide</a> covers fire features alongside covered patios, outdoor kitchens and decks.',
        ],
      },
      {
        h2: 'Pair it with cover and shade',
        paragraphs: [
          'A covered patio becomes far more than shelter when it is outfitted: lighting for after dark, ceiling fans for hot days, and heaters or a fire feature for cool evenings. Together, a cover and a fire feature dramatically extend how often the space gets used. Any cover must be engineered for snow loads.',
        ],
      },
      {
        h2: 'Materials and utilities',
        paragraphs: [
          'Boise\'s freeze-thaw cycles, snow and strong sun quickly destroy materials meant only for mild climates. Use outdoor-rated stone and finishes, and plan gas and electrical runs during design so the feature is fully functional and permitted. Requirements vary across the Treasure Valley, and the permitting belongs in the project scope.',
        ],
      },
      {
        h2: 'Design it as one experience',
        paragraphs: [
          'The best outdoor spaces are designed as one experience rather than a collection of features: zones for cooking, dining and lounging, shade and lighting, and materials that relate to your home. Our <a href="/services/outdoor-living">outdoor living</a> page covers the decks, covered patios, pergolas and outdoor kitchens we design and build, with an optional fireplace or built-in seating.',
        ],
      },
      {
        h2: 'Cost and value',
        paragraphs: [
          'Outdoor living cost varies widely with size, features, materials and structure. As of 2026, decks and outdoor living projects in the Boise area commonly plan $25,000 to $75,000 or more, with covered patios and outdoor kitchens at the upper end. A quality, well-integrated outdoor space can add appeal and value, though the return favors tasteful, well-built builds over elaborate personalized ones; for most households the payoff is how often the space gets used.',
        ],
      },
    ],
  },

  'outdoor-entertaining-spaces': {
    seoTitle: 'Outdoor entertaining spaces, Boise',
    metaDescription:
      'Plan an outdoor entertaining space in Boise: zones for cooking, dining and lounging, outdoor kitchens, covered patios, Idaho-rated materials and permits.',
    excerpt: 'How to plan a backyard entertaining space that gets used across the Treasure Valley seasons.',
    quickAnswer:
      'A great outdoor entertaining space is designed as an extension of the home: zones for cooking, dining and lounging, shade and lighting, outdoor-rated materials, and utilities planned early. Built for the local climate, it gets used across much of the year, not just a few summer weekends.',
    takeaways: [
      'Plan zones for cooking, dining and lounging.',
      'Cover and lighting decide how often it is used.',
      'Plan utilities and permits with any indoor remodel.',
    ],
    serviceUrl: '/services/outdoor-living',
    sections: [
      {
        h2: 'Design it as an extension of the home',
        paragraphs: [
          'Great outdoor living is a true extension of the home, designed together with your indoor entertaining flow, built for the local climate, and outfitted so you use it across much of the year. Think about the path from the kitchen to the patio, zones for cooking, dining and lounging, and how the style relates to the house. Full backyard transformations integrate all three.',
          'Our <a href="' + OUTDOOR + '">outdoor living remodeling guide</a> covers every outdoor project type, from decks and patios to fire features.',
        ],
      },
      {
        h2: 'The outdoor kitchen',
        paragraphs: [
          'An outdoor kitchen turns a patio into an entertaining hub. At minimum it includes a grill, prep counter and storage; common additions are a sink, a refrigerator, a side burner and bar seating. Build it around what you will actually use and place it conveniently to the house; our <a href="/blog/outdoor-kitchens-boise">outdoor kitchens guide</a> covers features, materials and utilities.',
        ],
      },
      {
        h2: 'Cover, shade and light',
        paragraphs: [
          'A covered structure provides shade in summer and shelter from rain, and with heaters extends comfort into cooler months. Lighting makes the space usable after dark, ceiling fans add comfort on hot days, and a fire feature extends evenings into the shoulder seasons. See <a href="/blog/covered-patios-boise">covered patios</a> for roof types, snow loads and permits.',
        ],
      },
      {
        h2: 'Materials, utilities and permits',
        paragraphs: [
          'Outdoor kitchens need outdoor-rated stainless, stone and weatherproof cabinetry, hardscape needs proper base and drainage, and plumbing must be designed to winterize. Gas, water, electrical and drainage should be planned from the start, and covered structures typically need a permit and snow-load engineering. Our <a href="/services/outdoor-living">outdoor living</a> team plans utilities and permitting as part of one design-build scope, ideally alongside any indoor remodel.',
        ],
      },
      {
        h2: 'Cost and value',
        paragraphs: [
          'As of 2026, decks and outdoor living projects in the Boise area commonly plan $25,000 to $75,000 or more. Ground-level wood decks sit at the lower end; large composite decks, covered patios and outdoor kitchens reach the upper end. These are planning ranges, not bids.',
          'A quality, tasteful outdoor space can add appeal and value, especially where outdoor living is prized, but for most households the primary payoff is enjoyment: transforming how you gather and spend time outdoors through the Treasure Valley seasons.',
        ],
      },
    ],
  },
};
