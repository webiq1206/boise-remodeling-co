import type { PdfBlock } from '@/lib/pdf/drawResourcePdf';
import { SITE_CONFIG } from './siteConfig';

const FOOTER = `${SITE_CONFIG.name} | ${SITE_CONFIG.siteUrl} | Planning resource - not a contract or quote`;

export const BUDGET_WORKSHEET_BLOCKS: PdfBlock[] = [
  {
    type: 'title',
    text: 'Treasure Valley Remodel Budget Worksheet',
  },
  {
    type: 'subtitle',
    text: 'Use with our Boise Remodeling Cost Guide. Planning ranges only - firm numbers require written scope.',
  },
  { type: 'heading', text: '1. Project snapshot' },
  {
    type: 'checkboxes',
    items: [
      'Property address: _________________________________',
      'City (Ada / Canyon): _____________________________',
      'Target start season: _____________________________',
      'Will you occupy during construction? Yes / No',
    ],
  },
  { type: 'heading', text: '2. Planning ranges by project type (2026 bands)' },
  {
    type: 'table',
    headers: ['Project', 'Low planning', 'High planning', 'Your target'],
    rows: [
      ['Kitchen (full)', '$45,000', '$120,000+', '___________'],
      ['Bath (guest)', '$18,000', '$45,000', '___________'],
      ['Bath (master)', '$35,000', '$85,000+', '___________'],
      ['Whole-home', '$180,000', '$425,000+', '___________'],
      ['Addition', '$80,000', '$250,000+', '___________'],
    ],
  },
  { type: 'heading', text: '3. Budget line items (separate buckets)' },
  {
    type: 'table',
    headers: ['Category', 'Planned $', 'Notes'],
    rows: [
      ['Design & permits', '___________', ''],
      ['Construction contract', '___________', ''],
      ['Appliances (if kitchen)', '___________', 'Client-supplied typical'],
      ['Furnishings / window treatments', '___________', ''],
      ['Contingency (10–15%)', '___________', 'Older homes: use high end'],
      ['Temporary housing', '___________', 'If needed'],
    ],
  },
  { type: 'heading', text: '4. Compare bids fairly' },
  {
    type: 'checkboxes',
    items: [
      'Same demolition, haul-off, and protection scope',
      'Permits and engineering included the same way',
      'Allowances for tile, cabinets, fixtures aligned',
      'Schedule and payment milestones documented',
    ],
  },
  { type: 'heading', text: '5. Next steps' },
  {
    type: 'bullets',
    items: [
      `Online estimator: ${SITE_CONFIG.siteUrl}/#calculator`,
      `Cost guide: ${SITE_CONFIG.siteUrl}/guides/boise-remodeling-cost-guide`,
      `Schedule consultation: ${SITE_CONFIG.siteUrl}/contact`,
      `Phone: ${SITE_CONFIG.phone}`,
    ],
  },
];

export const KITCHEN_BATH_CHECKLIST_BLOCKS: PdfBlock[] = [
  {
    type: 'title',
    text: 'Kitchen & Bath Planning Checklist',
  },
  {
    type: 'subtitle',
    text: 'Treasure Valley design-build - print and bring to your consultation.',
  },
  { type: 'heading', text: 'Before design starts' },
  {
    type: 'checkboxes',
    items: [
      'Photos of existing space (wide + detail shots)',
      'Inspiration images (layout, style, finishes)',
      'List must-haves vs nice-to-haves',
      'Note existing issues (leaks, panel size, ventilation)',
      'Confirm Ada vs Canyon jurisdiction for permits',
    ],
  },
  { type: 'heading', text: 'Kitchen-specific' },
  {
    type: 'checkboxes',
    items: [
      'Appliance list (or placeholders) - rough-in before drywall',
      'Cabinet line: stock / semi-custom / custom',
      'Island size and walkway clearances',
      'Open wall removal? Structural beam needed?',
      'Lighting plan: cans, pendants, under-cabinet',
    ],
  },
  { type: 'heading', text: 'Bathroom-specific' },
  {
    type: 'checkboxes',
    items: [
      'Guest vs master - separate budgets',
      'Shower type: curbless / walk-in / tub-shower',
      'Ventilation and heat planned with layout',
      'Aging-in-place features (height, blocking, width)',
      'Waterproofing inspection before tile',
    ],
  },
  { type: 'heading', text: 'Timeline checkpoints' },
  {
    type: 'table',
    headers: ['Phase', 'Target date', 'Done'],
    rows: [
      ['Consultation', '___________', '[ ]'],
      ['Preliminary scope', '___________', '[ ]'],
      ['Design lock / cabinets ordered', '___________', '[ ]'],
      ['Permits approved', '___________', '[ ]'],
      ['Construction start', '___________', '[ ]'],
    ],
  },
  { type: 'heading', text: 'During construction' },
  {
    type: 'checkboxes',
    items: [
      'Temporary kitchen or bath plan if staying in home',
      'Dust protection and daily access agreed',
      'Selection deadlines met to avoid delays',
      'Change orders in writing before work proceeds',
    ],
  },
  { type: 'heading', text: 'Resources' },
  {
    type: 'bullets',
    items: [
      `${SITE_CONFIG.siteUrl}/guides/boise-kitchen-remodeling-guide`,
      `${SITE_CONFIG.siteUrl}/guides/boise-bathroom-remodeling-guide`,
      `${SITE_CONFIG.siteUrl}/guides/boise-remodeling-process-guide`,
    ],
  },
];

export const ADA_CANYON_PERMIT_BLOCKS: PdfBlock[] = [
  {
    type: 'title',
    text: 'Ada vs Canyon County Remodel Permits',
  },
  {
    type: 'subtitle',
    text: 'Quick reference for Treasure Valley homeowners - timelines are estimates.',
  },
  { type: 'heading', text: 'Which county am I in?' },
  {
    type: 'table',
    headers: ['Area', 'County', 'Portal'],
    rows: [
      ['Boise, Meridian, Eagle', 'Ada', 'Ada County Planning'],
      ['Kuna, Star', 'Ada', 'Ada County Planning'],
      ['Nampa, Middleton', 'Canyon', 'Canyon County'],
      ['Caldwell', 'Canyon', 'Canyon County'],
    ],
  },
  { type: 'heading', text: 'When permits are usually required' },
  {
    type: 'bullets',
    items: [
      'Removing or adding walls (structural)',
      'Moving plumbing drains or water lines',
      'Adding or relocating electrical circuits',
      'Additions, ADUs, covered patios tied to structure',
    ],
  },
  { type: 'heading', text: 'Often minimal review' },
  {
    type: 'bullets',
    items: [
      'Like-for-like fixture swaps in same location',
      'Cabinet refacing without MEP changes',
      'Cosmetic finishes when no layout change',
    ],
  },
  { type: 'heading', text: 'Typical timeline bands' },
  {
    type: 'table',
    headers: ['Phase', 'Ada County', 'Canyon County'],
    rows: [
      ['Plan prep', '2–6 weeks', '2–6 weeks'],
      ['Review / comments', '2–8 weeks', '2–8 weeks'],
      ['Inspections', 'During construction', 'During construction'],
    ],
  },
  { type: 'heading', text: 'Homeowner checklist' },
  {
    type: 'checkboxes',
    items: [
      'Confirm jurisdiction before ordering cabinets',
      'Ask if permits are in contractor scope',
      'Respond to plan-check comments quickly',
      'Do not cover work before rough inspections',
      'HOA review separate (Eagle, master-planned areas)',
    ],
  },
  { type: 'heading', text: 'Learn more' },
  {
    type: 'bullets',
    items: [
      `Visual flowchart: ${SITE_CONFIG.siteUrl}/resources/ada-canyon-permit-flow`,
      `Online guide: ${SITE_CONFIG.siteUrl}/resources/ada-canyon-permit-flow`,
      `Process guide: ${SITE_CONFIG.siteUrl}/guides/boise-remodeling-process-guide`,
    ],
  },
];

export const PDF_FOOTERS = {
  budget: FOOTER,
  checklist: FOOTER,
  permits: FOOTER,
} as const;
