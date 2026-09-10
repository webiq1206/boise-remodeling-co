import type { BlogPostData } from '../blogContent';
import { buildSectionsHtml } from './wave1/snippets';
import { buildClusterArticleSections } from './clusterArticleSections';
import { guidePath } from '../contentHubs';

function buildLegacyPost(
  config: Parameters<typeof buildClusterArticleSections>[0] & {
    seoTitle: string;
    metaDescription: string;
    author: string;
    category: string;
    tags: string[];
    publishedAt: string;
    relatedLinks: Array<{ url: string; anchor?: string }>;
    faqs: Array<{ question: string; answer: string }>;
    takeaways: string[];
    extraSections?: Parameters<typeof buildClusterArticleSections>[0]['extraSections'];
  },
): BlogPostData {
  return {
    slug: config.slug,
    title: config.title,
    seoTitle: config.seoTitle,
    metaDescription: config.metaDescription,
    excerpt: config.excerpt,
    content: buildSectionsHtml(
      buildClusterArticleSections({
        slug: config.slug,
        title: config.title,
        excerpt: config.excerpt,
        quickAnswer: config.quickAnswer,
        hubSlug: config.hubSlug,
        extraSections: config.extraSections,
      }),
    ),
    author: config.author,
    category: config.category,
    hubSlug: config.hubSlug,
    tags: config.tags,
    publishedAt: config.publishedAt,
    relatedLinks: config.relatedLinks,
    faqs: config.faqs,
    quickAnswer: config.quickAnswer,
    keyTakeaways: config.takeaways,
    wordCountTarget: 'cluster',
  };
}

export const LEGACY_BLOG_POSTS: BlogPostData[] = [
  buildLegacyPost({
    slug: 'ada-vs-canyon-county-permit-timelines',
    title: 'Ada vs Canyon County Remodel Permits: Timelines Homeowners Should Know',
    seoTitle: 'Ada vs Canyon County Remodel Permit Timelines',
    metaDescription:
      'How Ada County and Canyon County permit timelines differ for kitchen, bath, and addition remodels in the Treasure Valley.',
    excerpt:
      'Permit timelines vary by county, project type, and whether structural or MEP plans are required.',
    hubSlug: 'remodeling-process',
    quickAnswer:
      'Ada County and Canyon County use different permit portals and review timelines - layout and structural remodels often need weeks of plan review in both.',
    author: 'Boise Remodeling Co',
    category: 'Remodeling Process',
    tags: ['permits', 'ada county', 'canyon county'],
    publishedAt: '2026-02-05',
    relatedLinks: [
      { url: guidePath('boise-remodeling-process-guide') },
      { url: '/blog/boise-permit-guide' },
      { url: '/areas/boise' },
      { url: '/areas/nampa' },
      // Canyon-county cities are the most under-linked pages in the manifest;
      // this permit post is their most topically relevant source
      // (local-seo-audit/06-internal-linking-plan.md Gap 3).
      { url: '/areas/middleton', anchor: 'Remodeling in Middleton' },
      { url: '/areas/caldwell', anchor: 'Remodeling in Caldwell' },
    ],
    faqs: [
      {
        question: 'Who pulls permits on a design-build remodel?',
        answer: 'Boise Remodeling Co includes permits in scope for Ada and Canyon County projects.',
      },
      {
        question: 'How long do Ada County kitchen permits take?',
        answer: 'Layout changes often need several weeks of plan review.',
      },
      {
        question: 'Is Canyon County different?',
        answer: 'Yes - portals and review cadence differ from Ada County.',
      },
      {
        question: 'Do you serve Nampa and Caldwell?',
        answer: 'Yes - we coordinate Canyon County permits.',
      },
      {
        question: 'Can construction start before permits?',
        answer: 'No - approved permits are required for covered work.',
      },
      {
        question: 'What plans are required?',
        answer: 'Structural and MEP sheets are common for layout changes.',
      },
    ],
    takeaways: ['Build permits into the schedule', 'Ada vs Canyon processes differ', 'Design-build teams coordinate submissions'],
    extraSections: [
      {
        h2: 'Cosmetic vs layout permits',
        paragraphs: [
          'Paint and fixture swaps may need minimal review; moving plumbing or removing walls requires plan check in both counties.',
        ],
      },
    ],
  }),
  buildLegacyPost({
    slug: 'how-to-choose-design-build-contractor',
    title: 'How to Choose a Design-Build Remodeling Contractor in Boise',
    seoTitle: 'How to Choose a Design-Build Contractor Boise',
    metaDescription:
      'Checklist for choosing a design-build remodeling contractor in Boise: scope, communication, licenses, insurance, and red flags to avoid.',
    excerpt: 'The best fit is not always the lowest bid - look for written scope and one accountable team.',
    hubSlug: 'contractor-selection',
    quickAnswer:
      'Choose a Boise design-build remodeler with written scope, local permits experience, clear communication, and aligned bids - not price alone.',
    author: 'Boise Remodeling Co',
    category: 'Contractor Selection',
    tags: ['contractor', 'design-build', 'boise'],
    publishedAt: '2026-02-18',
    relatedLinks: [
      { url: guidePath('choose-remodeling-contractor-boise') },
      { url: '/about' },
      { url: '/contact' },
    ],
    faqs: [
      { question: 'What is design-build?', answer: 'Design, estimating, and construction under one contract.' },
      { question: 'Should I get multiple bids?', answer: 'Yes - with aligned scope and allowances.' },
      { question: 'What are red flags?', answer: 'Vague scope and large upfront cash demands.' },
      { question: 'Do you handle permits?', answer: 'Yes for Ada and Canyon County scope.' },
      { question: 'How do I start?', answer: 'Schedule a consultation.' },
      { question: 'See the full contractor guide?', answer: 'Read our Choose a Remodeling Contractor in Boise pillar.' },
    ],
    takeaways: ['Compare aligned scopes', 'Design-build improves accountability', 'Verify insurance and references'],
    extraSections: [
      {
        h2: 'Questions to ask in the first meeting',
        list: [
          'Who owns communication during construction?',
          'How are change orders priced?',
          'What is in writing before demo day?',
        ],
        paragraphs: [],
      },
    ],
  }),
  buildLegacyPost({
    slug: 'whole-home-remodel-planning-checklist',
    title: 'Whole-Home Remodel Planning Checklist for Treasure Valley Homeowners',
    seoTitle: 'Whole-Home Remodel Planning Checklist Idaho',
    metaDescription:
      'Room-by-room checklist for whole-home remodels: sequencing, temporary living, contingency, design-build, and realistic timelines.',
    excerpt: 'Whole-home remodels succeed when sequencing and contingency are decided early.',
    hubSlug: 'whole-home-remodeling',
    quickAnswer:
      'Whole-home remodel planning requires phased scope, early structural decisions, contingency, and realistic timelines across the Treasure Valley.',
    author: 'Boise Remodeling Co',
    category: 'Whole Home Remodeling',
    tags: ['whole-home', 'checklist', 'meridian'],
    publishedAt: '2026-03-01',
    relatedLinks: [
      { url: guidePath('whole-home-remodeling-guide') },
      { url: '/blog/whole-home-remodel-cost-boise' },
      { url: '/services/whole-home-remodel/meridian' },
    ],
    faqs: [
      { question: 'What to plan first?', answer: 'Must-have rooms and structural/MEP priorities.' },
      { question: 'How much contingency?', answer: '10–15% for concealed conditions.' },
      { question: 'Can I live during construction?', answer: 'Phasing or temporary housing may be needed.' },
      { question: 'How long?', answer: 'Often 4–12 months depending on scope.' },
      { question: 'One contractor?', answer: 'Design-build coordinates trades.' },
      { question: 'Budget help?', answer: 'See whole-home cost article and cost guide.' },
    ],
    takeaways: ['One master program', 'Contingency for unknowns', 'Sequence before finishes'],
    extraSections: [
      {
        h2: 'Whole-home checklist',
        list: [
          'Define must-have rooms',
          'Lock structural and MEP',
          'Plan temporary kitchen/bath if needed',
          'Hold 10–15% contingency',
        ],
        paragraphs: [],
      },
    ],
  }),
  buildLegacyPost({
    slug: 'room-addition-guide-treasure-valley',
    title: 'Room Addition Guide: Matching Your Home in the Treasure Valley',
    seoTitle: 'Room Addition Guide Boise Treasure Valley',
    metaDescription:
      'Room additions in Boise, Eagle, and Kuna: setbacks, architecture, foundation, permits, and timelines that match your existing home.',
    excerpt: 'Additions that look original need early design and realistic permits.',
    hubSlug: 'home-additions',
    quickAnswer:
      'Treasure Valley room additions need feasibility on setbacks and structure, matching architecture, and Ada or Canyon permits - often $80k–$250k+.',
    author: 'Boise Remodeling Co',
    category: 'Home Additions',
    tags: ['addition', 'eagle', 'kuna'],
    publishedAt: '2026-03-12',
    relatedLinks: [
      { url: guidePath('boise-home-addition-guide') },
      { url: '/blog/home-addition-cost-boise' },
      { url: '/services/room-addition/eagle' },
    ],
    faqs: [
      { question: 'How much does an addition cost?', answer: 'Often $80,000–$250,000+ depending on scope - see our cost article.' },
      { question: 'Permits required?', answer: 'Yes for structural work in Ada and Canyon County.' },
      { question: 'HOA in Eagle?', answer: 'Many neighborhoods require design review.' },
      { question: 'Timeline?', answer: 'Often 4–9 months including design and permits.' },
      { question: 'Cities served?', answer: 'All major Treasure Valley cities.' },
      { question: 'ADUs?', answer: 'See ADU service page and addition pillar guide.' },
    ],
    takeaways: ['Feasibility first', 'HOA time in Eagle', 'One design-build contract'],
    extraSections: [
      {
        h2: 'Matching architecture on additions',
        paragraphs: [
          'Roof lines, exterior materials, and foundation tie-ins should be resolved in design before pricing is presented as firm.',
        ],
      },
    ],
  }),
];
