/** Hub-specific FAQs - substantive answers, not generic templates. */

export function getHubPillarFaqs(hubSlug: string): Array<{ question: string; answer: string }> {
  const faqs: Record<string, Array<{ question: string; answer: string }>> = {
    'kitchen-remodeling': [
      {
        question: 'How much does a kitchen remodel cost in Boise?',
        answer:
          'Most full kitchen remodels in the Treasure Valley plan between roughly $50,000 and $131,000+ depending on layout changes, cabinetry line, and finishes. Guest-scale refreshes cost less; open-concept structural work costs more.',
      },
      {
        question: 'How long does a kitchen remodel take?',
        answer:
          'Expect 4–10 weeks for design and selections, 2–8 weeks for permits when layout changes, and 6–12 weeks of construction, up to about 16 for a full gut with layout changes. Cabinet lead times often drive the calendar.',
      },
      {
        question: 'Do I need permits for a kitchen remodel in Ada County?',
        answer:
          'Cosmetic updates may need minimal review. Relocating plumbing, removing walls, or adding circuits typically requires Ada County or city plan review with inspections.',
      },
      {
        question: 'Are appliances included in your kitchen quotes?',
        answer:
          'Appliances are usually client-supplied. We coordinate rough-in and cutouts but do not purchase or install appliances unless written into scope.',
      },
      {
        question: 'Can you open my galley kitchen to the living room?',
        answer:
          'Often yes, when structure allows. We verify beam sizing and permits before demolition - common on Boise Bench and Meridian ranches.',
      },
      {
        question: 'What is design-build kitchen remodeling?',
        answer:
          'One accountable company and one point of contact cover design, estimating, permits, and construction so selections, allowances, and schedule stay aligned.',
      },
      {
        question: 'When should I order cabinets?',
        answer:
          'At design lock, after layout and MEP are confirmed - lead times can exceed eight weeks.',
      },
      {
        question: 'How do I compare kitchen contractor bids?',
        answer:
          'Match demolition, haul-off, permits, allowances, and appliance rough-in - not just cabinet install price.',
      },
    ],
    'bathroom-remodeling': [
      {
        question: 'How much does a bathroom remodel cost in Meridian or Boise?',
        answer:
          'Guest bath refreshes often plan $15,500–$45,000. Master baths with curbless showers and layout changes commonly reach $35,000–$85,000+ in Ada County.',
      },
      {
        question: 'What is different about a curbless shower install?',
        answer:
          'Slope, drain, and waterproofing must pass inspection before tile. Failures here delay most master bath timelines.',
      },
      {
        question: 'Can you add aging-in-place features without a hospital look?',
        answer:
          'Yes - comfort-height vanities, blocking for grab bars, and wider doorways can be designed with normal finishes.',
      },
      {
        question: 'Do bathroom remodels need permits in the Treasure Valley?',
        answer:
          'Layout and plumbing moves require permits. Cosmetic swaps may not. We include permit coordination in design-build scope when required.',
      },
      {
        question: 'How long does a master bath remodel take?',
        answer:
          'Often 6–12 weeks of construction after design and permits, longer when curbless showers and radiant heat are included.',
      },
      {
        question: 'Should guest and master baths share one budget?',
        answer:
          'No - scope, waterproofing, and fixture level differ too much to combine into one number.',
      },
      {
        question: 'What ventilation is required in Idaho bathrooms?',
        answer:
          'Proper exhaust and heat should be planned with layout, especially in older Boise homes with limited existing fan capacity.',
      },
      {
        question: 'How do I start a bathroom remodel with your team?',
        answer:
          'Schedule an in-home consultation or use our estimator for a planning range, then develop written scope before construction.',
      },
    ],
    'home-additions': [
      {
        question: 'How much does a room addition cost in Boise?',
        answer:
          'Additions often plan $80,000–$250,000+ depending on size, foundation type, utilities, and finishes. Second stories and hillside lots trend higher.',
      },
      {
        question: 'Do I need a structural engineer for a second story?',
        answer:
          'Yes - second-story additions in Boise and Eagle require engineering and typically longer Ada County review.',
      },
      {
        question: 'Can I build an ADU on my lot?',
        answer:
          'Feasibility depends on zoning, utilities, fire separation, and parking - not just desired square footage. We study lots during design.',
      },
      {
        question: 'How do setbacks affect addition design in Eagle?',
        answer:
          'Setbacks and soil conditions can move foundation type and budget early - especially in Foothills neighborhoods.',
      },
      {
        question: 'Are permits included for additions?',
        answer:
          'Yes - our design-build scope includes permit coordination for Ada and Canyon County when structural work is involved.',
      },
      {
        question: 'How long do additions take to build?',
        answer:
          'Many additions run 4–9 months total including design, permits, and construction.',
      },
      {
        question: 'Can additions match my existing roofline?',
        answer:
          'That is a design goal - we plan tie-ins, materials, and HOA review where applicable so the addition reads as original architecture.',
      },
      {
        question: 'What is the first step for an addition project?',
        answer:
          'In-home consultation with preliminary feasibility on setbacks, access, and utility paths.',
      },
    ],
    'whole-home-remodeling': [
      {
        question: 'How much does a whole-home remodel cost in the Treasure Valley?',
        answer:
          'Programs often plan $180,000–$425,000+ depending on how many rooms, structural work, and finish level are involved.',
      },
      {
        question: 'Should I remodel in phases or all at once?',
        answer:
          'Phasing spreads cost but adds mobilization. A master plan keeps finishes cohesive across phases.',
      },
      {
        question: 'Do whole-home remodels require moving out?',
        answer:
          'Depends on scope - dust, utilities, and kitchen/bath access drive the answer. We plan barriers or temporary kitchens when possible.',
      },
      {
        question: 'What should be decided before finish selections?',
        answer:
          'Structural, panel, HVAC, and layout decisions should be locked when multiple rooms are involved.',
      },
      {
        question: 'How much contingency should I hold?',
        answer:
          '10–15% is prudent in pre-1990 homes when walls will be opened throughout the house.',
      },
      {
        question: 'Are permits required for whole-home work?',
        answer:
          'Most layout and MEP changes require Ada or Canyon County review. We coordinate submissions and inspections.',
      },
      {
        question: 'Can you coordinate flooring and lighting house-wide?',
        answer:
          'Yes - whole-home programs are where design-build coordination pays off most.',
      },
      {
        question: 'How do I budget a whole-home remodel?',
        answer:
          'Start with our cost guide and whole-home cost article, then schedule a consultation for written scope.',
      },
    ],
    'contractor-selection': [
      {
        question: 'How do I compare remodeling contractors in Boise fairly?',
        answer:
          'Align scope, allowances, permits, haul-off, and schedule before comparing price. Ask who owns communication during construction.',
      },
      {
        question: 'What red flags should I avoid?',
        answer:
          'Bait pricing, verbal-only scope, and teams that cannot explain Ada vs Canyon paths for your address.',
      },
      {
        question: 'Is design-build better than hiring a designer and GC separately?',
        answer:
          'Design-build reduces gaps that become change orders. Separate contracts can work but require tight coordination.',
      },
      {
        question: 'What should be in a remodeling contract?',
        answer:
          'Written scope, allowances, payment schedule, permit responsibility, change-order terms, and warranty language.',
      },
      {
        question: 'Do you provide references and insurance certificates?',
        answer:
          'Yes - professional remodelers should provide both before you sign.',
      },
      {
        question: 'How many bids should I get?',
        answer:
          'Two to three aligned proposals are enough if scope is documented - more bids without aligned scope add confusion.',
      },
      {
        question: 'Why do Boise remodeling bids vary so much?',
        answer:
          'Different allowances, permit assumptions, and finish levels - not always different quality of work.',
      },
      {
        question: 'What questions should I ask in the first meeting?',
        answer:
          'Ask about permit experience in your city, selection process, contingency handling, and who manages inspections.',
      },
    ],
    'remodeling-process': [
      {
        question: 'What are the steps in a design-build remodel?',
        answer:
          'Consultation, preliminary scope, design development, agreement, permits, construction, punch list, and warranty walkthrough.',
      },
      {
        question: 'When should permits be submitted?',
        answer:
          'After layout and structural decisions are stable - before ordering long-lead items tied to rough-in.',
      },
      {
        question: 'Can I live at home during a kitchen remodel?',
        answer:
          'Sometimes, with a temporary kitchen plan. Layout and utility shutoffs determine feasibility.',
      },
      {
        question: 'How are selections tracked?',
        answer:
          'Against allowances in written scope so upgrades are intentional, not surprise change orders.',
      },
      {
        question: 'What is a punch list?',
        answer:
          'A documented list of items to complete before final payment and warranty walkthrough.',
      },
      {
        question: 'How long does Ada County plan review take?',
        answer:
          'Often 2–8+ weeks depending on project type and comment cycles - see our permit timeline article.',
      },
      {
        question: 'Who coordinates inspections?',
        answer:
          'Our design-build team schedules inspections with the jurisdiction when permits are in our scope.',
      },
      {
        question: 'What happens if hidden damage is found?',
        answer:
          'Documented in writing with contingency or change order before cover-up - standard in older Treasure Valley homes.',
      },
    ],
    'remodeling-roi': [
      {
        question: 'Which remodels have the best ROI in Boise?',
        answer:
          'Focused kitchen and bath updates often align with neighborhood comps. Avoid over-improving beyond the street.',
      },
      {
        question: 'Should I remodel before selling in Meridian?',
        answer:
          'Target what buyers expect in your subdivision - agent input and local comps should drive scope.',
      },
      {
        question: 'Does a luxury kitchen always return on resale?',
        answer:
          'Not always - finish level should match the neighborhood, especially in Eagle and Harris Ranch.',
      },
      {
        question: 'Is ROI the right metric for a long-term home?',
        answer:
          'Comfort, layout, and efficiency may justify projects with modest resale payback if you plan to stay.',
      },
      {
        question: 'Do bathroom updates help resale in Nampa?',
        answer:
          'Updated baths often help buyer appeal when consistent with home price band in Canyon County.',
      },
      {
        question: 'What pre-sale projects should I skip?',
        answer:
          'Over-scoped additions or finishes well above comps rarely return dollar-for-dollar.',
      },
      {
        question: 'How do I research comps for remodel decisions?',
        answer:
          'Use recent sales on your street and subdivision, not broad Treasure Valley averages.',
      },
      {
        question: 'Can energy upgrades improve ROI?',
        answer:
          'Windows, insulation, and HVAC can improve comfort and operating cost; dollar return varies by home age.',
      },
    ],
    'outdoor-living': [
      {
        question: 'Do outdoor kitchens need permits in Ada County?',
        answer:
          'Gas, electric, and structures tied to the home may require permits - plan utilities before hardscape.',
      },
      {
        question: 'When should I build a covered patio in Idaho?',
        answer:
          'Schedule concrete and structural work in stable weather windows; freeze-thaw affects footings and drainage.',
      },
      {
        question: 'Deck vs paver patio - which is better in Boise?',
        answer:
          'Depends on grade, drainage, and maintenance preference - see our decks vs patios article.',
      },
      {
        question: 'Can outdoor work run with an indoor kitchen remodel?',
        answer:
          'Yes - shared utilities and design cohesion are easier when both are planned together.',
      },
      {
        question: 'How do I plan drainage for outdoor entertaining?',
        answer:
          'Slope and downspout routing should be resolved before pavers or concrete are installed.',
      },
      {
        question: 'Are outdoor fireplaces worth it in the Treasure Valley?',
        answer:
          'They extend shoulder seasons; fuel type and venting must match local codes and HOA rules.',
      },
      {
        question: 'What maintenance do outdoor kitchens need?',
        answer:
          'Winterize plumbing lines, protect stone and appliances from freeze, and plan covers in windy corridors.',
      },
      {
        question: 'How do I budget outdoor living?',
        answer:
          'Scope utilities, structure, and finishes separately - outdoor kitchens and covered patios are not one flat SF price.',
      },
    ],
    'remodeling-costs': [],
    'treasure-valley-locations': [],
  };

  return faqs[hubSlug] ?? [];
}

export function getLocationFaqs(
  cityName: string,
  citySlug: string,
  county: 'ada' | 'canyon',
): Array<{ question: string; answer: string }> {
  const countyLabel = county === 'ada' ? 'Ada County' : 'Canyon County';
  return [
    {
      question: `Do you remodel homes in ${cityName}?`,
      answer: `Yes - we serve ${cityName} with kitchen, bathroom, whole-home, and addition design-build. See our ${cityName} area page for local services.`,
    },
    {
      question: `What permits apply in ${cityName}?`,
      answer: `${cityName} projects typically use ${countyLabel} review for layout and structural work. Cosmetic updates may move faster with fewer sheets.`,
    },
    {
      question: `How much does a remodel cost in ${cityName}?`,
      answer:
        'Use our Boise Remodeling Cost Guide for planning bands by project type, then schedule a consultation for written scope tied to your home.',
    },
    {
      question: `What remodels are most common in ${cityName}?`,
      answer:
        'Kitchen updates, primary suite baths, open-layout conversions, and rear additions are frequent - scope depends on housing era in your neighborhood.',
    },
    {
      question: 'How long do local remodels take?',
      answer:
        'Timelines follow design, selections, and permit review - often several weeks to months before construction completes.',
    },
    {
      question: 'Do you offer design-build in my neighborhood?',
      answer:
        'Yes - one team handles design, permits, and construction as one accountable company, with one point of contact and local permit experience.',
    },
  ];
}
