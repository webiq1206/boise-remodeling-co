/**
 * Photos, plans and files on the short request (components/approved/HeroConversion).
 *
 * ONE MODULE SO BOTH SIDES AGREE, as with shared/re10/uploads.ts: the attachment tile tells
 * someone a file is too big or the wrong type before it uploads, and /api/consultation/files
 * enforces the same rule after, because a browser check is a courtesy and not a control.
 *
 * Files travel one per request, after the lead is already saved, so a slow or failed upload can
 * never cost the request itself. 20 MB per file stays inside the 32 MB ceiling this site already
 * holds a single upload request to (shared/re10/uploads.ts MAX_REQUEST_UPLOAD_BYTES).
 */

export const MAX_REQUEST_FILES = 10;
export const MAX_REQUEST_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_REQUEST_FILE_MB = MAX_REQUEST_FILE_BYTES / (1024 * 1024);

/** The native picker filter: on a phone this offers the camera, the photo library and files. */
export const REQUEST_FILE_ACCEPT = "image/*,application/pdf,.heic,.heif";

/** Stored extension by MIME type. These are the types /api/documents/local serves back. */
const TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/heic-sequence": "heic",
  "image/heif-sequence": "heif",
  "application/pdf": "pdf",
};

/** Some phones send HEIC with an empty type; the name is then the only evidence. */
const NAME_EXT: Record<string, string> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  heic: "heic",
  heif: "heif",
  pdf: "pdf",
};

export const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

export type RequestFileCheck =
  | { ok: true; ext: string; contentType: string }
  | { ok: false; reason: string };

/** Plain-words verdict on one file, shown inline next to the tile and returned by the server. */
export function checkRequestFile(file: { name: string; type: string; size: number }): RequestFileCheck {
  const name = file.name || "That file";
  const fromType = TYPE_EXT[(file.type || "").toLowerCase()];
  const fromName = NAME_EXT[(file.name.split(".").pop() || "").toLowerCase()];
  // A typed file must be one we accept; an untyped one is judged by its name.
  const generic = !file.type || file.type.toLowerCase() === "application/octet-stream";
  const ext = generic ? fromName : fromType;
  if (!ext) {
    return { ok: false, reason: `${name} was not added. Send photos (JPEG, PNG, WebP or HEIC) or PDFs.` };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, reason: `${name} was not added. The file is empty.` };
  }
  if (file.size > MAX_REQUEST_FILE_BYTES) {
    return { ok: false, reason: `${name} was not added. Each file can be up to ${MAX_REQUEST_FILE_MB} MB.` };
  }
  return { ok: true, ext, contentType: EXT_MIME[ext] };
}

/** "2.4 MB", "380 KB": shown on each chip. */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * The first bytes have to agree with the claimed type. A browser-supplied type is only a label;
 * this keeps an HTML page renamed photo.jpg from being stored and served back as an image.
 */
export function contentMatchesType(ext: string, head: Uint8Array): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...head.subarray(from, to));
  switch (ext) {
    case "pdf":
      return ascii(0, 5) === "%PDF-";
    case "jpg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "png":
      return head[0] === 0x89 && ascii(1, 4) === "PNG";
    case "webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "heic":
    case "heif":
      return ascii(4, 8) === "ftyp";
    default:
      return false;
  }
}

/** File name kept readable in a link and safe in a storage key. */
export function safeRequestFileName(name: string, ext: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return `${base || "upload"}.${ext}`;
}
