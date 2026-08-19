/**
 * What the RE-10 estimator accepts, and what it can actually read.
 *
 * ONE MODULE SO BOTH SIDES AGREE. The wizard has to tell someone their file is
 * the wrong type before a 20MB upload, and the route has to enforce it after,
 * because a browser check is a courtesy and not a control. Two copies of these
 * rules would drift, and the drift shows up as a file the UI accepted and the
 * server rejected, which reads as a broken site rather than a wrong file.
 *
 * THREE OUTCOMES, NOT TWO. A Word version of a repair addendum is a real
 * document that a real agent really has; refusing it outright would be
 * obstructive. But we cannot read it automatically, so it is stored and sent to
 * the team rather than pretended over. "Attachment" is that middle state, and
 * the wizard says so plainly rather than letting someone believe a file was
 * analysed when it was not.
 */

export const MAX_UPLOAD_FILES = 12;
export const MAX_TOTAL_UPLOAD_BYTES = 24 * 1024 * 1024;

/**
 * The ceiling on ONE request, which is not the ceiling on one plan set.
 *
 * A 123.8MB commercial set of 103 sheets was refused outright by the 24MB
 * limit above, and raising that constant would have been the wrong fix twice
 * over: `request.formData()` buffers the entire body, so a 124MB upload costs
 * several hundred megabytes of container memory before a single sheet is
 * read, and the same 300-second window would have had to cover both the
 * upload and the analysis. Plan sets are split in the browser instead
 * (lib/planSplitter.ts) and arrive as parts of a few sheets each. This bounds
 * one part; MAX_PLAN_PAGES bounds the set.
 */
export const MAX_REQUEST_UPLOAD_BYTES = 32 * 1024 * 1024;

/** Types the extractor can send to the model: PDF and the four image formats. */
const READABLE_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const READABLE_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Stored and forwarded to the team, not analysed.
 *
 * HEIC is here and not above on purpose: it is what an iPhone stores photos as,
 * and it is not a format the model reads. Picking from the photo library
 * usually hands us a converted JPEG, but picking the same photo out of the
 * Files app does not, and someone whose photo silently vanished from the
 * analysis would have no way to know why.
 */
const ATTACHMENT_EXT: Record<string, string> = {
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  rtf: "application/rtf",
  txt: "text/plain",
  odt: "application/vnd.oasis.opendocument.text",
  pages: "application/x-iwork-pages-sffpages",
  heic: "image/heic",
  heif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
};

const ATTACHMENT_MIME = new Set(Object.values(ATTACHMENT_EXT));

export type UploadClass = "readable" | "attachment" | "rejected";

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

/**
 * The browser's declared type, or the extension when it declares nothing.
 *
 * A file dragged from an email client, a scanner folder or a network share
 * routinely arrives with `type: ""` or `application/octet-stream`. Drag and drop
 * is exactly where that happens, so trusting the browser's word alone would
 * make dropped PDFs unreadable while picked ones worked - the kind of bug that
 * looks like the drop target is broken.
 */
export function resolveMimeType(filename: string, declared: string): string {
  const type = (declared || "").toLowerCase();
  if (READABLE_MIME.has(type) || ATTACHMENT_MIME.has(type)) return type;
  const ext = extensionOf(filename);
  return READABLE_EXT[ext] ?? ATTACHMENT_EXT[ext] ?? type;
}

export function classifyUpload(filename: string, declared: string): UploadClass {
  const type = resolveMimeType(filename, declared);
  if (READABLE_MIME.has(type)) return "readable";
  if (ATTACHMENT_MIME.has(type)) return "attachment";
  return "rejected";
}

export function isReadable(filename: string, declared: string): boolean {
  return classifyUpload(filename, declared) === "readable";
}

/**
 * The `accept` attribute.
 *
 * Extensions as well as MIME types, because the file picker on Windows filters
 * by extension and several of these have no reliable declared type. The wildcard
 * `image/*` is what makes the photo library a first-class choice on a phone.
 */
export const UPLOAD_ACCEPT = [
  "application/pdf",
  "image/*",
  ...Object.keys(READABLE_EXT).map((e) => "." + e),
  ...Object.keys(ATTACHMENT_EXT).map((e) => "." + e),
].join(",");

/** Human-readable, for the message shown when a file is turned away. */
export const READABLE_FORMATS_LABEL = "PDF, JPG, PNG, WEBP or GIF";

/**
 * Is this a link our own storage could have produced?
 *
 * THE BUG THIS EXISTS TO PREVENT. The estimate endpoint validated stored
 * document links with a strict absolute-URL rule, while the blob store returns
 * a ROOT-RELATIVE path on its local driver - which is what production runs. So
 * every submission carrying an uploaded file was rejected, and the agent hit
 * "Invalid request" at the final step, after typing their contact details.
 * Uploading a document is the whole point of the page, so that was not an edge
 * case, it was the main path.
 *
 * Lives here, next to the upload rules, so the check the client reasons about
 * and the check the server enforces are the same function rather than two
 * regular expressions that agree until one of them is edited.
 */
export function isStoredDocumentUrl(url: string): boolean {
  if (typeof url !== "string" || url.length === 0 || url.length > 2000) return false;
  // Root-relative is what our own storage hands back, and it is ONLY ever
  // /api/documents/local/<encoded key>. Accepting any root-relative path let a
  // crafted submission point the lead-email attachment reader at
  // ..%2F..%2F-style keys; the storage layer now rejects those too, but the
  // request should never validate in the first place. The decoded key must be
  // relative, with no parent segments, backslashes, or null bytes.
  if (url.startsWith("/")) {
    const prefix = "/api/documents/local/";
    if (!url.startsWith(prefix)) return false;
    let key: string;
    try {
      key = decodeURIComponent(url.slice(prefix.length));
    } catch {
      return false;
    }
    if (key.length === 0 || key.length > 512) return false;
    if (key.includes("\0") || key.includes("\\") || key.startsWith("/")) return false;
    return key.split("/").every((s) => s.length > 0 && s !== "." && s !== "..");
  }
  return /^https?:\/\/[^\s]+$/i.test(url);
}
