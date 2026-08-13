/**
 * Page-level accounting for uploaded documents.
 *
 * WHY THIS EXISTS. Both extractors used to hand every uploaded file to one
 * model request and treat whatever came back as the truth. That has no notion
 * of a page at all, so there was no way to answer the only question that
 * matters on a large set: did we actually look at all of it? A 42-sheet permit
 * set and a 4-sheet sketch produced the same shape of evidence - "the model
 * returned some rooms" - and a set too heavy for one request failed whole,
 * with the good sheets going down alongside the bad ones.
 *
 * Every page now carries a record from intake to result. A page is READ, or it
 * is FAILED with a reason, and the count of each is reported. Nothing is
 * allowed to be neither.
 */

/** What a sheet is, which decides whether it is worth deep extraction. */
export type PageKind =
  /** Cover, index, or general-information sheet. Often carries area tabulations. */
  | "cover"
  /** Floor plan: the sheet room areas and dimensions come from. */
  | "floor-plan"
  /** Demolition plan. */
  | "demolition"
  /** Elevation, section, or 3D view. */
  | "elevation"
  /** Door, window, finish, fixture, or equipment schedule. */
  | "schedule"
  /** Structural framing, foundation, or detail sheet. */
  | "structural"
  /** MEP: mechanical, electrical, or plumbing. */
  | "mep"
  /** Site, civil, grading, or landscape. */
  | "site"
  /** Construction details, assemblies, typical sections. */
  | "detail"
  /** General notes, specifications, code analysis. */
  | "notes"
  /** An inspection or repair form (RE-10 and friends). */
  | "repair-form"
  /** A photograph, or a photo page in a report. */
  | "photo"
  /** Read fine, carries nothing we price from. */
  | "other"
  /** Could not be classified because it could not be read. */
  | "unreadable";

/** How the page reached us, which changes what extraction can trust. */
export type PageMedium =
  /** Vector CAD output. Text is selectable and dimensions are crisp. */
  | "vector"
  /** A scan or photograph of a printed sheet. OCR territory. */
  | "scanned"
  /** Carries handwritten annotation, initials, or markup. */
  | "handwritten"
  | "unknown";

/** Kinds worth spending deep extraction on. Everything else is censused only. */
export const PRICING_RELEVANT_KINDS: readonly PageKind[] = [
  "cover",
  "floor-plan",
  "demolition",
  "schedule",
  "structural",
  "mep",
  "site",
  "notes",
  "repair-form",
];

/** One page of one uploaded file, tracked end to end. */
export interface PageRecord {
  /** Stable 1-based index across the whole upload, in upload order. */
  index: number;
  filename: string;
  /** 1-based page number within its own file. */
  pageInFile: number;
  status: "pending" | "read" | "failed";
  /** Why a page failed, in words the customer can act on. */
  failureReason?: string;
  kind: PageKind;
  medium: PageMedium;
  /** Sheet number as printed, e.g. "A2.1". Null when the sheet has none. */
  sheet: string | null;
  /** Sheet title as printed. */
  title: string | null;
  /**
   * How legible the page was, 0 to 1, self-reported by the census pass.
   * Drives whether a low-confidence read is surfaced as a question.
   */
  legibility: number;
  /** True when the census judged it carries information we price from. */
  pricingRelevant: boolean;
  /** Set when deep extraction ran on this page. */
  deepRead: boolean;
}

export interface PageInventory {
  pages: PageRecord[];
  /** Files that could not be paginated at all (corrupt, encrypted, unsupported). */
  unpaginated: { filename: string; reason: string }[];
}

export interface InventorySummary {
  totalPages: number;
  read: number;
  failed: number;
  pricingRelevant: number;
  deepRead: number;
  scanned: number;
  handwritten: number;
  /** True only when every single page reached a terminal READ state. */
  everyPageRead: boolean;
  failedPages: { index: number; filename: string; pageInFile: number; reason: string }[];
}

export function summarizeInventory(inventory: PageInventory): InventorySummary {
  const pages = inventory.pages;
  const failed = pages.filter((p) => p.status !== "read");
  return {
    totalPages: pages.length,
    read: pages.filter((p) => p.status === "read").length,
    failed: failed.length,
    pricingRelevant: pages.filter((p) => p.pricingRelevant).length,
    deepRead: pages.filter((p) => p.deepRead).length,
    scanned: pages.filter((p) => p.medium === "scanned").length,
    handwritten: pages.filter((p) => p.medium === "handwritten").length,
    // Unpaginated files count against completeness too: a file we could not
    // even open is the strongest possible form of "we did not read that".
    everyPageRead: failed.length === 0 && inventory.unpaginated.length === 0,
    failedPages: failed.map((p) => ({
      index: p.index,
      filename: p.filename,
      pageInFile: p.pageInFile,
      reason: p.failureReason ?? "This page could not be read.",
    })),
  };
}

/** Human sentence for the result screen and the internal audit trail. */
export function describeCoverage(inventory: PageInventory): string {
  const s = summarizeInventory(inventory);
  if (s.totalPages === 0) return "No pages were received.";
  const parts = [`${s.read} of ${s.totalPages} page${s.totalPages === 1 ? "" : "s"} read`];
  if (s.deepRead > 0) parts.push(`${s.deepRead} examined in detail`);
  if (s.scanned > 0) parts.push(`${s.scanned} scanned`);
  if (s.handwritten > 0) parts.push(`${s.handwritten} with handwriting`);
  if (s.failed > 0) parts.push(`${s.failed} could NOT be read`);
  for (const u of inventory.unpaginated) parts.push(`${u.filename} could not be opened`);
  return parts.join(", ") + ".";
}
