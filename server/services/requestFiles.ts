import crypto from "crypto";
import { SITE_CONFIG } from "@/shared/siteConfig";
import {
  EXT_MIME,
  MAX_REQUEST_FILES,
  checkRequestFile,
  contentMatchesType,
  safeRequestFileName,
} from "@/shared/requestFiles";
import type { RequestFileRecord } from "@/shared/requestDetails";

/**
 * Photos, plans and files added to a short request, stored where this site already keeps lead
 * documents: Postgres `stored_files` through lib/storage/blob (disk only on a checkout with no
 * database). Every key is `requests/<request id>/<random uuid>-<name>`, so the link that goes to
 * the internal email, the lead dashboard and p5 intake cannot be guessed, and a key can be proven
 * to belong to the request that names it.
 */

export function requestFilePrefix(requestId: string): string {
  return `requests/${requestId}/`;
}

export function absoluteStoredUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SITE_CONFIG.siteUrl.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

function nameFromKey(key: string): string {
  const last = key.split("/").pop() ?? key;
  // <uuid>-<name>
  return last.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, "");
}

export type StoreRequestFileResult =
  | { ok: true; file: RequestFileRecord }
  | { ok: false; status: number; message: string };

export async function storeRequestFile(requestId: string, file: File): Promise<StoreRequestFileResult> {
  const check = checkRequestFile({ name: file.name, type: file.type, size: file.size });
  if (!check.ok) return { ok: false, status: 400, message: check.reason };
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!contentMatchesType(check.ext, new Uint8Array(buffer.subarray(0, 16)))) {
    return { ok: false, status: 400, message: `${file.name || "That file"} was not added. It does not look like a photo or PDF.` };
  }
  if ((await countRequestFiles(requestId)) >= MAX_REQUEST_FILES) {
    return { ok: false, status: 400, message: `A request can carry up to ${MAX_REQUEST_FILES} files.` };
  }
  const safeName = safeRequestFileName(file.name, check.ext);
  const key = `${requestFilePrefix(requestId)}${crypto.randomUUID()}-${safeName}`;
  const { uploadFile } = await import("@/lib/storage/blob");
  const stored = await uploadFile(key, buffer, check.contentType);
  return {
    ok: true,
    file: { key, name: safeName, url: absoluteStoredUrl(stored), contentType: check.contentType, size: buffer.byteLength },
  };
}

/** How many files this request already holds. */
export async function countRequestFiles(requestId: string): Promise<number> {
  const prefix = requestFilePrefix(requestId);
  const db = await dbOrNull();
  if (db) {
    const { storedFiles } = await import("@/shared/schema");
    const { like, count } = await import("drizzle-orm");
    const [row] = await db
      .select({ value: count() })
      .from(storedFiles)
      .where(like(storedFiles.key, `${prefix.replace(/[%_\\]/g, "\\$&")}%`));
    return Number(row?.value ?? 0);
  }
  try {
    const { readdir } = await import("fs/promises");
    const path = await import("path");
    return (await readdir(path.join(process.cwd(), ".uploads", prefix))).length;
  } catch {
    return 0;
  }
}

/**
 * Turns the keys a browser posts back into file records, keeping only keys that belong to this
 * request and actually exist. Name, type and size come from the store, never from the client.
 */
export async function describeRequestFiles(requestId: string, keys: unknown): Promise<RequestFileRecord[]> {
  if (!Array.isArray(keys)) return [];
  const prefix = requestFilePrefix(requestId);
  const wanted = [...new Set(keys.filter((key): key is string => typeof key === "string"))]
    .filter((key) => key.startsWith(prefix) && key.length <= 300 && !key.slice(prefix.length).includes("/"))
    .slice(0, MAX_REQUEST_FILES);
  if (!wanted.length) return [];
  const { isSafeStorageKey } = await import("@/lib/storage/blob");
  const safe = wanted.filter(isSafeStorageKey);
  const url = (key: string) => absoluteStoredUrl(`/api/documents/local/${encodeURIComponent(key)}`);
  const db = await dbOrNull();
  if (db) {
    const { storedFiles } = await import("@/shared/schema");
    const { inArray } = await import("drizzle-orm");
    const rows = await db
      .select({ key: storedFiles.key, mimeType: storedFiles.mimeType, fileSize: storedFiles.fileSize })
      .from(storedFiles)
      .where(inArray(storedFiles.key, safe));
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return safe
      .filter((key) => byKey.has(key))
      .map((key) => {
        const row = byKey.get(key)!;
        return { key, name: nameFromKey(key), url: url(key), contentType: row.mimeType, size: row.fileSize };
      });
  }
  const { stat } = await import("fs/promises");
  const path = await import("path");
  const out: RequestFileRecord[] = [];
  for (const key of safe) {
    try {
      const info = await stat(path.join(process.cwd(), ".uploads", key));
      const ext = key.split(".").pop()?.toLowerCase() ?? "";
      out.push({ key, name: nameFromKey(key), url: url(key), contentType: EXT_MIME[ext] ?? "application/octet-stream", size: info.size });
    } catch {
      /* not stored: dropped */
    }
  }
  return out;
}

async function dbOrNull() {
  if (process.env.LEAD_ROUTE_ISOLATED_TEST === "1") return null;
  try {
    const { db } = await import("@/lib/db");
    return db ?? null;
  } catch {
    return null;
  }
}
