import { PDFDocument } from "pdf-lib";
import {
  MAX_PLAN_PAGES,
  PART_MAX_BYTES,
  PART_MAX_PAGES,
  type SplitOutcome,
  type UploadPart,
} from "@/shared/documents/uploadPlan";

/**
 * Turn the customer's upload into parts, in their browser.
 *
 * GROUP FIRST, MEASURE AFTER, SPLIT ONLY WHAT IS ACTUALLY TOO BIG.
 *
 * The obvious implementation - weigh every page by saving it on its own, then
 * pack the weights - is both far too slow and actively misleading, and the
 * first version of this file did exactly that. Saving 103 pages individually
 * means 103 serialisations on the main thread, which locked the UI for minutes
 * on the reference set and never got as far as uploading. It also lies about
 * size: a page saved alone carries its own copy of every font and image it
 * references, so the individual pages summed to 154MB for a 124MB document.
 * Pages copied together share those resources.
 *
 * So parts are cut by page count first and serialised once each. A part that
 * comes out over the byte budget is halved and re-serialised, down to a single
 * page; a single page that is still too big travels alone, because nothing can
 * make it smaller and pairing it would only take a good sheet down with it.
 * For a typical set that is around a dozen serialisations instead of a hundred.
 */

const PDF_TYPE = "application/pdf";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Serialise one page range, halving it until every piece fits the budget. */
async function emitParts(
  source: PDFDocument,
  pageIndices: number[],
  onPart: (data: Uint8Array, indices: number[]) => void,
): Promise<void> {
  const out = await PDFDocument.create();
  const copied = await out.copyPages(source, pageIndices);
  for (const page of copied) out.addPage(page);
  const data = await out.save();

  if (data.length <= PART_MAX_BYTES || pageIndices.length === 1) {
    onPart(data, pageIndices);
    return;
  }
  const half = Math.floor(pageIndices.length / 2);
  await emitParts(source, pageIndices.slice(0, half), onPart);
  await emitParts(source, pageIndices.slice(half), onPart);
}

export async function splitForUpload(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<SplitOutcome> {
  const parts: UploadPart[] = [];
  let pageOffset = 1;
  let totalPages = 0;

  // Count first, so an oversized set is refused before any work is done on it.
  const opened: { file: File; doc: PDFDocument | null; pages: number }[] = [];
  for (const file of files) {
    if (IMAGE_TYPES.has(file.type)) {
      opened.push({ file, doc: null, pages: 1 });
      totalPages += 1;
      continue;
    }
    if (file.type !== PDF_TYPE && !file.name.toLowerCase().endsWith(".pdf")) continue;
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const pages = doc.getPageCount();
      if (pages === 0) {
        return { ok: false, parts: [], totalPages: 0, error: `${file.name} contains no pages.` };
      }
      opened.push({ file, doc, pages });
      totalPages += pages;
    } catch {
      return {
        ok: false,
        parts: [],
        totalPages: 0,
        error: `We could not open ${file.name}. Re-export it as a PDF and try again.`,
      };
    }
  }

  if (totalPages === 0) {
    return { ok: false, parts: [], totalPages: 0, error: "No readable PDF or image files were attached." };
  }
  if (totalPages > MAX_PLAN_PAGES) {
    return {
      ok: false,
      parts: [],
      totalPages,
      error:
        `That is ${totalPages} sheets and we read up to ${MAX_PLAN_PAGES} in one go. ` +
        `Send it in two uploads, or send the architectural and schedule sheets on their own.`,
    };
  }

  let pagesDone = 0;
  for (const entry of opened) {
    if (!entry.doc) {
      parts.push({
        index: parts.length,
        pageOffset,
        pageCount: 1,
        filename: entry.file.name,
        blob: entry.file,
        bytes: entry.file.size,
      });
      pageOffset += 1;
      pagesDone += 1;
      onProgress?.(pagesDone, totalPages);
      continue;
    }

    const base = pageOffset;
    for (let start = 0; start < entry.pages; start += PART_MAX_PAGES) {
      const group = Array.from(
        { length: Math.min(PART_MAX_PAGES, entry.pages - start) },
        (_, k) => start + k,
      );
      await emitParts(entry.doc, group, (data, indices) => {
        const first = indices[0];
        const last = indices[indices.length - 1];
        parts.push({
          index: parts.length,
          pageOffset: base + first,
          pageCount: indices.length,
          filename:
            indices.length === 1
              ? `${entry.file.name} p${first + 1}`
              : `${entry.file.name} p${first + 1}-${last + 1}`,
          blob: new Blob([data as unknown as BlobPart], { type: PDF_TYPE }),
          bytes: data.length,
        });
      });
      pagesDone += group.length;
      // Yield to the event loop so the progress line actually paints between
      // batches rather than the whole split appearing to hang.
      onProgress?.(pagesDone, totalPages);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    pageOffset += entry.pages;
  }

  return { ok: true, parts, totalPages };
}
