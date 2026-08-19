/**
 * Splitting a plan set in the BROWSER, before any of it is uploaded.
 *
 * WHY THE UPLOAD HAD TO MOVE CLIENT-SIDE. A real commercial set arrived at
 * 123.8MB across 103 sheets of 30x42 inch drawings, and it never reached the
 * extractor: `MAX_TOTAL_UPLOAD_BYTES` is 24MB, so it was refused at the door
 * with a message about sending fewer sheets. Raising that constant does not
 * fix it and makes things worse - `request.formData()` buffers the whole body
 * in memory, so a 124MB upload becomes several hundred megabytes of container
 * memory before a single page is read, on a platform that will kill the
 * process for it. The request also has to survive one upload AND the whole
 * analysis inside a single 300-second window.
 *
 * So the file is paginated in the browser and uploaded as parts. Each part is
 * a real PDF of a few sheets, small enough to post quickly and to process well
 * inside a request timeout. A slow connection now shows steady progress
 * instead of stalling on one enormous POST, one failed part costs that part
 * rather than the set, and the ceiling stops being a size at all: what bounds
 * the upload is the page count, which is the thing a customer can actually
 * reason about.
 */

/** The most sheets we will read in one submission. */
export const MAX_PLAN_PAGES = 200;

/**
 * Per-part budgets. Small parts are the whole point: they keep each request
 * inside both the body limit and the processing window, and they make the
 * retry ladder cheap. A 30x42 sheet averaged 1.5MB in the reference set, so
 * eight pages is comfortably under the byte budget for a typical set and the
 * byte budget takes over on heavier ones.
 */
export const PART_MAX_PAGES = 8;
export const PART_MAX_BYTES = 6 * 1024 * 1024;

/**
 * A single sheet larger than this cannot be made smaller by splitting, so it
 * is sent alone and allowed to fail alone rather than poisoning a part.
 */
export const SINGLE_PAGE_MAX_BYTES = 28 * 1024 * 1024;

export interface UploadPart {
  /** 0-based position in the upload sequence. */
  index: number;
  /** Global 1-based index of this part's first page across the whole upload. */
  pageOffset: number;
  pageCount: number;
  filename: string;
  /** The part as its own PDF. */
  blob: Blob;
  bytes: number;
}

export interface SplitOutcome {
  ok: boolean;
  parts: UploadPart[];
  totalPages: number;
  /** Set when the set cannot be accepted at all, in words for the customer. */
  error?: string;
}

/**
 * Group page indices into parts that respect BOTH budgets.
 *
 * Pure, and exported, so the verifier can exercise the packing rules without a
 * PDF or a browser. The weights are per-page byte estimates; the caller
 * measures them once while extracting.
 */
export function packPages(
  weights: number[],
  maxPages = PART_MAX_PAGES,
  maxBytes = PART_MAX_BYTES,
): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  let currentBytes = 0;

  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i];
    // A page heavier than the whole budget travels alone; splitting further is
    // not possible and pairing it would only take a good sheet down with it.
    if (weight >= maxBytes) {
      if (current.length > 0) {
        groups.push(current);
        current = [];
        currentBytes = 0;
      }
      groups.push([i]);
      continue;
    }
    if (current.length >= maxPages || (current.length > 0 && currentBytes + weight > maxBytes)) {
      groups.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(i);
    currentBytes += weight;
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/** Human sentence for the progress line while parts upload. */
export function describeUploadProgress(done: number, total: number, pages: number): string {
  if (total <= 1) return "Reading your drawings...";
  return `Reading your drawings: ${done} of ${total} batches (${pages} sheets)...`;
}
