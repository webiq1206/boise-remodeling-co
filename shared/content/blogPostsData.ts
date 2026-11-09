import type { BlogPostData } from '../blogContent';
import { getExpandedClusterHtml, COST_CLUSTER_CONTENT } from './wave1/costClusterPosts';
import { guidePath } from '../contentHubs';

const PILLAR = guidePath('boise-remodeling-cost-guide');

function clusterFaqs(
  topic: string,
): Array<{ question: string; answer: string }> {
  return [
    {
      question: `How much does a ${topic} cost in Boise?`,
      answer:
        'Planning ranges depend on layout, finishes, and permits. See the tables in this article and our Boise Remodeling Cost Guide for full context.',
    },
    {
      question: 'Does this include permits?',
      answer:
        'Our design-build quotes include permits for Ada and Canyon County work when scope requires them.',
    },
    {
      question: 'How long does the project take?',
      answer:
        'Timelines vary by design, selections, and permit review - typically several weeks of design plus weeks to months of construction.',
    },
    {
      question: 'Are appliances included?',
      answer:
        'Kitchen appliances are client-supplied; we coordinate rough-in but do not purchase or install appliances.',
    },
    {
      question: 'Do you serve Meridian and Eagle?',
      answer:
        'Yes. We serve Boise, Meridian, Eagle, Kuna, Star, Middleton, Nampa, and Caldwell.',
    },
    {
      question: 'How do I get a firm price?',
      answer:
        'Schedule an in-home consultation for a written scope after we review your home and goals.',
    },
    {
      question: 'Why do bids vary?',
      answer:
        'Different allowances, permit inclusion, and finish levels change bids. Compare aligned scopes, not just bottom lines.',
    },
    {
      question: 'Should I hold contingency?',
      answer:
        'Yes - 10–15% is prudent for concealed conditions in older Treasure Valley homes.',
    },
  ];
}

function makeCostCluster(
  slug: keyof typeof COST_CLUSTER_CONTENT,
  title: string,
  seoTitle: string,
  metaDescription: string,
  excerpt: string,
  tags: string[],
): BlogPostData {
  const pack = COST_CLUSTER_CONTENT[slug];
  return {
    slug,
    title,
    seoTitle,
    metaDescription,
    excerpt,
    content: getExpandedClusterHtml(slug),
    author: 'Boise Remodeling Co',
    category: 'Boise Remodeling Costs',
    hubSlug: 'remodeling-costs',
    tags,
    publishedAt: '2026-05-02',
    faqs: clusterFaqs(title.toLowerCase()),
    quickAnswer: pack.quickAnswer,
    keyTakeaways: pack.takeaways,
    relatedLinks: [
      { url: PILLAR, anchor: 'Boise Remodeling Cost Guide' },
      { url: '/services/kitchen-remodel' },
      { url: '/services/bathroom-remodel' },
      { url: '/areas/boise' },
    ],
    primaryKeyword: slug.replace(/-/g, ' '),
    wordCountTarget: 'cluster',
  };
}

export const WAVE1_COST_CLUSTERS: BlogPostData[] = [
  makeCostCluster(
    'kitchen-remodel-cost-boise',
    'Kitchen Remodel Cost Boise (2026 Planning Ranges)',
    'Kitchen Remodel Cost Boise | Treasure Valley',
    'Kitchen remodel cost in Boise, Meridian, and Eagle: cabinets, layout changes, timelines, and budgeting tips from a local design-build team.',
    'Full kitchen remodels in Boise typically range from about $37,000 to $110,000+ depending on layout, cabinetry, and finishes.',
    ['kitchen', 'cost', 'boise', 'meridian'],
  ),
  makeCostCluster(
    'bathroom-remodel-cost-boise',
    'Bathroom Remodel Cost Boise: Guest vs Master Bath',
    'Bathroom Remodel Cost Boise Idaho',
    'Bathroom remodel cost in Boise and the Treasure Valley: guest baths, master suites, curbless showers, and permit considerations.',
    'Guest bath and master bath remodels sit on very different budgets - plan with realistic Treasure Valley ranges.',
    ['bathroom', 'cost', 'boise', 'nampa'],
  ),
  makeCostCluster(
    'whole-home-remodel-cost-boise',
    'Whole Home Remodel Cost Boise',
    'Whole Home Remodel Cost Boise Idaho',
    'Whole-home remodel cost planning for Boise, Meridian, and Eagle: phasing, contingency, MEP upgrades, timelines, and budgeting tips.',
    'Whole-home programs often plan between $180,000 and $425,000+ depending on scope and structural work.',
    ['whole-home', 'cost', 'boise'],
  ),
  makeCostCluster(
    'home-addition-cost-boise',
    'Home Addition Cost Boise',
    'Home Addition Cost Boise Treasure Valley',
    'Room addition cost in Boise, Eagle, and Kuna: foundation, structure, permits, and matching existing architecture to your home.',
    'Ground-floor additions often plan between $80,000 and $250,000+ before finish level and site conditions.',
    ['addition', 'cost', 'eagle', 'kuna'],
  ),
  makeCostCluster(
    'luxury-remodel-cost-boise',
    'Luxury Remodel Cost Boise & Eagle',
    'Luxury Remodel Cost Boise Idaho',
    'Luxury remodeling costs in Eagle, the Foothills, and premium Boise neighborhoods: finishes, design time, and HOA review.',
    'Luxury remodels often exceed $200,000 for multi-room scope with custom millwork and stone.',
    ['luxury', 'cost', 'eagle'],
  ),
  makeCostCluster(
    'remodel-cost-per-square-foot-boise',
    'Cost Per Square Foot to Remodel a Home in Boise',
    'Remodel Cost Per Square Foot Boise',
    'When $/SF helps and when it misleads for Boise whole-home, addition, and kitchen remodel planning - and how to budget instead.',
    'Remodel cost per square foot varies by project type - use it with defined scope, not as a universal rule.',
    ['cost', 'per square foot', 'boise'],
  ),
  makeCostCluster(
    'what-impacts-remodeling-costs-boise',
    'What Impacts Remodeling Costs in Boise?',
    'What Impacts Remodeling Costs Boise',
    'Top cost drivers for Treasure Valley remodels: layout, permits, finishes, existing conditions, selections, and structural work.',
    'Layout changes, structural work, and finish level move Boise remodel costs more than square footage alone.',
    ['cost', 'planning', 'boise'],
  ),
  makeCostCluster(
    'how-to-budget-remodel-boise',
    'How to Budget for a Remodel in Boise',
    'How to Budget for a Remodel Boise',
    'Step-by-step remodeling budget framework for Idaho homeowners: scope, contingency, soft costs, appliances, and comparing bids.',
    'Budget scope, contingency, and soft costs separately for a realistic Treasure Valley remodel plan.',
    ['budget', 'planning', 'boise'],
  ),
];
