import { PDFDocument } from "pdf-lib";
import type { PageRecord, PageInventory } from "@/shared/documents/pageInventory";

/**
 * Turning an upload into pages, and pages into requests that actually fit.
 *
 * THE LIMIT THAT BINDS IS NOT BYTES ON DISK. Proven on four real sets: 13.2MB
 * across 27 scanned sheets went through, while 4.7MB across 5 vector CAD sheets
 * was rejected outright - and each of those five read fine alone. What the API
 * carries is the RASTERISED sheet, and a 36x24 drawing with text outlined to
 * curves is far heavier than a scan of the same page. So no byte ceiling can be
 * tuned into correctness, and the previous code's single all-files request was
 * betting the whole set on the heaviest sheet in it.
 *
 * The fix is to stop sending one request. Pages are split into small chunks,
 * each chunk is its own request, and a chunk that is still rejected is split
 * again down to single pages. One unreadable sheet then costs exactly that
 * sheet, not the other ninety-nine.
 */

const PDF_TYPE = "application/pdf";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export interface SourceFile {
  filename: string;
  mimeType: string;
  data: Buffer;
}

/**
 * Pages per request.
 *
 * Small on purpose. The API's own ceiling is 100 PDF pages per request, but
 * that is nowhere near the binding constraint for architectural sheets: a
 * handful of dense 36x24 drawings will exhaust the request budget long before
 * the page count does. Small chunks also mean a rejection costs little and the
 * retry ladder has somewhere to go.
 */
export const CENSUS_CHUNK_PAGES = 8;
export const DEEP_CHUNK_PAGES = 4;

/** A chunk that fails at this size is retried page by page. */
export const MIN_CHUNK_PAGES = 1;

export interface PageChunk {
  /** The page indices (into PageInventory.pages) carried by this chunk. */
  pageIndices: number[];
  /** A real PDF containing exactly those pages, or the original image bytes. */
  data: Buffer;
  mimeType: string;
  /** Label for the model and for logs, e.g. "plans.pdf pages 9-12". */
  label: string;
}

/**
 * Count pages without rendering anything.
 *
 * `ignoreEncryption` matters: permit sets come out of agency portals stamped
 * and owner-password protected all the time. Those open fine for reading and
 * would otherwise be rejected as corrupt at the door.
 */
export async function buildInventory(files: SourceFile[]): Promise<PageInventory> {
  const pages: PageRecord[] = [];
  const unpaginated: { filename: string; reason: string }[] = [];
  let index = 0;

  for (const file of files) {
    if (IMAGE_TYPES.has(file.mimeType)) {
      pages.push(blankRecord(++index, file.filename, 1));
      continue;
    }
    if (file.mimeType !== PDF_TYPE) {
      unpaginated.push({ filename: file.filename, reason: "Not a PDF or image we can open." });
      continue;
    }
    try {
      const doc = await PDFDocument.load(file.data, { ignoreEncryption: true });
      const count = doc.getPageCount();
      if (count === 0) {
        unpaginated.push({ filename: file.filename, reason: "The PDF contains no pages." });
        continue;
      }
      for (let p = 1; p <= count; p++) pages.push(blankRecord(++index, file.filename, p));
    } catch (err) {
      unpaginated.push({
        filename: file.filename,
        reason: "The PDF could not be opened. It may be corrupt or password protected.",
      });
      console.error(`[documentSplit] could not paginate ${file.filename}:`, err);
    }
  }

  return { pages, unpaginated };
}

function blankRecord(index: number, filename: string, pageInFile: number): PageRecord {
  return {
    index,
    filename,
    pageInFile,
    status: "pending",
    kind: "other",
    medium: "unknown",
    sheet: null,
    title: null,
    legibility: 0,
    pricingRelevant: false,
    deepRead: false,
  };
}

/**
 * Extract the given pages into standalone PDFs of at most `chunkPages` each.
 *
 * Chunks never span two source files: mixing a scanned report and a vector
 * plan set into one request makes the resulting per-page attribution guesswork,
 * and attribution is the thing the audit trail is built on.
 */
export async function buildChunks(
  files: SourceFile[],
  inventory: PageInventory,
  pageIndices: number[],
  chunkPages: number,
): Promise<PageChunk[]> {
  const wanted = new Set(pageIndices);
  const byFile = new Map<string, PageRecord[]>();
  for (const page of inventory.pages) {
    if (!wanted.has(page.index)) continue;
    const list = byFile.get(page.filename) ?? [];
    list.push(page);
    byFile.set(page.filename, list);
  }

  const chunks: PageChunk[] = [];
  for (const [filename, filePages] of byFile) {
    const source = files.find((f) => f.filename === filename);
    if (!source) continue;

    if (IMAGE_TYPES.has(source.mimeType)) {
      chunks.push({
        pageIndices: filePages.map((p) => p.index),
        data: source.data,
        mimeType: source.mimeType,
        label: filename,
      });
      continue;
    }

    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(source.data, { ignoreEncryption: true });
    } catch {
      continue; // Already recorded as unpaginated at inventory time.
    }

    for (let i = 0; i < filePages.length; i += chunkPages) {
      const slice = filePages.slice(i, i + chunkPages);
      try {
        const out = await PDFDocument.create();
        const copied = await out.copyPages(
          doc,
          slice.map((p) => p.pageInFile - 1),
        );
        for (const page of copied) out.addPage(page);
        chunks.push({
          pageIndices: slice.map((p) => p.index),
          data: Buffer.from(await out.save()),
          mimeType: PDF_TYPE,
          label:
            slice.length === 1
              ? `${filename} page ${slice[0].pageInFile}`
              : `${filename} pages ${slice[0].pageInFile}-${slice[slice.length - 1].pageInFile}`,
        });
      } catch (err) {
        console.error(`[documentSplit] could not extract pages from ${filename}:`, err);
      }
    }
  }

  return chunks;
}

/** Split one chunk into smaller ones for the retry ladder. Null when atomic. */
export async function subdivideChunk(
  files: SourceFile[],
  inventory: PageInventory,
  chunk: PageChunk,
): Promise<PageChunk[] | null> {
  if (chunk.pageIndices.length <= MIN_CHUNK_PAGES) return null;
  const half = Math.max(MIN_CHUNK_PAGES, Math.floor(chunk.pageIndices.length / 2));
  return buildChunks(files, inventory, chunk.pageIndices, half);
}

/**
 * Run tasks with bounded concurrency.
 *
 * A hundred-page set is a hundred-page set whether we send it as one doomed
 * request or twenty-five parallel ones, but only the second finishes inside a
 * request timeout. The cap keeps us inside the account's rate limit; without
 * one, a large set rate-limits itself and every chunk retries at once.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
