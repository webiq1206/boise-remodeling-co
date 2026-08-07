import { put, del } from "@vercel/blob";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".uploads");

function useLocalStorage(): boolean {
  return !process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * A storage key is only ever something this module generated itself
 * (`re10/<batch>/<n>-<filename>` and friends). Everything that READS by key,
 * however, receives that key from an untrusted place - a client-posted
 * document URL on the estimate routes, or the raw URL path on the public
 * GET /api/documents/local/[...key] route - and the disk fallback joins it
 * into a filesystem path. Without this check, `..%2F..%2F.env.local` walked
 * out of .uploads and read (or unlinked) arbitrary files inside the app root.
 *
 * Reject rather than sanitize: a key containing a parent segment, a
 * backslash, a null byte, or an absolute prefix is not a mistyped key, it is
 * an attack, and there is nothing to salvage from it.
 */
export function isSafeStorageKey(key: string): boolean {
  if (typeof key !== "string" || key.length === 0 || key.length > 512) return false;
  if (key.includes("\0") || key.includes("\\")) return false;
  if (key.startsWith("/") || /^[a-zA-Z]:/.test(key)) return false;
  const segments = key.split("/");
  return segments.every((s) => s.length > 0 && s !== "." && s !== "..");
}

/** Resolve a validated key inside the uploads root, with containment proof. */
function safeLocalPath(key: string): string | null {
  if (!isSafeStorageKey(key)) return null;
  const resolved = path.resolve(LOCAL_UPLOAD_DIR, key);
  if (resolved !== LOCAL_UPLOAD_DIR && !resolved.startsWith(LOCAL_UPLOAD_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

/**
 * The database is a better fallback than the container filesystem.
 *
 * Without a blob token this used to write to disk on an ephemeral container,
 * so every uploaded document died at the next deploy - an RE-10 uploaded half
 * an hour earlier returned 404, and the document link on the lead went with
 * it. Postgres is already provisioned, already backed up, and unlike a public
 * blob it is not readable by anyone holding a URL.
 *
 * Order of preference: a real blob store if one is configured, then the
 * database, then disk. Disk remains only so a checkout with no database at all
 * still runs.
 */
async function dbStore(): Promise<typeof import("@/lib/db")["db"] | null> {
  try {
    const { db } = await import("@/lib/db");
    return db ?? null;
  } catch {
    return null;
  }
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (useLocalStorage()) {
    const db = await dbStore();
    if (db) {
      const { storedFiles } = await import("@/shared/schema");
      await db
        .insert(storedFiles)
        .values({
          key,
          fileName: key.split("/").pop() ?? key,
          mimeType,
          fileSize: buffer.byteLength,
          data: buffer.toString("base64"),
        })
        .onConflictDoNothing();
      return `/api/documents/local/${encodeURIComponent(key)}`;
    }
    const filePath = path.join(LOCAL_UPLOAD_DIR, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return `/api/documents/local/${encodeURIComponent(key)}`;
  }

  const blob = await put(key, buffer, {
    access: "public",
    contentType: mimeType,
    addRandomSuffix: false,
  });
  return blob.url;
}

export async function deleteFile(urlOrKey: string): Promise<void> {
  if (useLocalStorage()) {
    const key = decodeURIComponent(urlOrKey.replace(/^\/api\/documents\/local\//, ""));
    const filePath = safeLocalPath(key);
    if (!filePath) return; // hostile or malformed key - nothing legitimate to delete
    try {
      const { unlink } = await import("fs/promises");
      await unlink(filePath);
    } catch {
      // ignore missing files
    }
    return;
  }

  if (urlOrKey.startsWith("http")) {
    await del(urlOrKey);
  }
}

/**
 * Read back a stored file. Database first, then disk.
 *
 * Disk is checked second rather than not at all so that documents written
 * before the database became the store are still readable until their
 * container goes away.
 */
export async function readLocalFile(key: string): Promise<Buffer | null> {
  // Validate BEFORE any lookup. The DB lookup is an exact-match and cannot
  // traverse, but a key that fails validation is hostile by definition and
  // must not fall through to the disk read below.
  if (!isSafeStorageKey(key)) return null;
  const db = await dbStore();
  if (db) {
    try {
      const { storedFiles } = await import("@/shared/schema");
      const { eq } = await import("drizzle-orm");
      const [row] = await db.select().from(storedFiles).where(eq(storedFiles.key, key)).limit(1);
      if (row) return Buffer.from(row.data, "base64");
    } catch (err) {
      console.error("[storage] database read failed, falling back to disk:", err);
    }
  }
  try {
    const filePath = safeLocalPath(key);
    if (!filePath) return null;
    return await readFile(filePath);
  } catch {
    return null;
  }
}

export function isLocalUrl(url: string): boolean {
  return url.startsWith("/api/documents/local/");
}

export function extractLocalKey(url: string): string {
  return decodeURIComponent(url.replace(/^\/api\/documents\/local\//, ""));
}
