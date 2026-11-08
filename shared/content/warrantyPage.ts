/**
 * /warranty page content. Owner decisions, release 2 (November 8, 2026):
 *
 * D1  One-year workmanship coverage from documented Final Completion covers
 *     work performed by OUR OWN team. Subcontractor work (licensed plumbing,
 *     electrical, HVAC and the like) is covered by that subcontractor's own
 *     warranty, and at the end of every project we provide a complete list of
 *     the subcontractors who worked on it, with their contact information.
 *     Manufacturer and product warranties are separate.
 * D8  A "Get help with a completed project" section (#get-help) with a
 *     prefilled email and a phone link. No deadline, portal or ticket promise,
 *     and no response-time promise (verify:no-response-promise).
 *
 * Pinned by tests/warranty-page.test.ts.
 */
import { SITE_CONFIG } from '../siteConfig';

export const WARRANTY_PATH = '/warranty';
export const WARRANTY_HELP_ANCHOR = 'get-help';

export const WARRANTY_TITLE = 'Remodeling warranty and help with a completed project';
export const WARRANTY_DESCRIPTION =
  'One-year workmanship warranty on our own team\'s work from documented Final Completion, subcontractor warranties, and how to get help with a completed project.';

/** The details we ask for, in the order the prefilled email lists them. */
export const WARRANTY_HELP_FIELDS = [
  'Your name',
  'Project address',
  'Affected item and where it is in the home',
  'When it started',
  'Description of what you are seeing',
  'Photos (attach any you have)',
] as const;

export const WARRANTY_HELP_SUBJECT = 'Help with a completed project';

export function warrantyHelpMailto(email: string = SITE_CONFIG.email): string {
  const body = [
    'Hello,',
    '',
    'I need help with a completed project.',
    '',
    ...WARRANTY_HELP_FIELDS.map((field) => `${field}: `),
    '',
    'Thank you.',
  ].join('\n');
  return `mailto:${email}?subject=${encodeURIComponent(WARRANTY_HELP_SUBJECT)}&body=${encodeURIComponent(body)}`;
}

export const FINAL_COMPLETION_DEFINITION =
  'Final Completion is the documented point at which the agreed work and any written changes are complete or resolved in writing, required inspections have passed, systems are working, cleanup is done, and the final walkthrough and handover records are complete. Your signed agreement holds the controlling definition.';

export const WARRANTY_COVERAGE = [
  'Work performed by our own team carries a one-year workmanship warranty from documented Final Completion.',
  "Work performed by subcontractors, for example licensed plumbing, electrical and HVAC, is covered by that subcontractor's own warranty.",
  'At the end of every project we provide a complete list of the subcontractors who worked on it, with their contact information.',
  "Manufacturer and product warranties, for example on fixtures, appliances, windows and cabinetry, are separate and follow the manufacturer's terms.",
] as const;

export const WARRANTY_NOT_COVERED = [
  'Normal wear and tear',
  'Damage from misuse, neglect or lack of normal maintenance',
  'Work by others after Final Completion, including changes or repairs made by someone else',
] as const;
