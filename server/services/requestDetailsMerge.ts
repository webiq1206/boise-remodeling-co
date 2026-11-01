import crypto from "crypto";
import { formatFileSize } from "@/shared/requestFiles";
import {
  DETAIL_PROJECT_TYPES,
  DETAIL_TIMINGS,
  REPLACEABLE_PROJECT_TYPES,
  zipFrom,
  type RequestDetailsFields,
  type RequestFileRecord,
} from "@/shared/requestDetails";

/** The stored short request, as much of it as step 2 can add to. */
export interface StoredShortRequest {
  id: string;
  inquiryId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  zip: string;
  city: string;
  projectType: string;
  message: string;
}

export interface CleanDetails {
  projectType: string;
  address: string;
  timing: string;
  email: string;
}

export type DetailsMerge =
  | { changed: false; ref: string; reason: "empty" | "repeat" }
  | {
      changed: true;
      ref: string;
      /** Only the columns that were blank (or a placeholder) and now have a value. */
      patch: Partial<Pick<StoredShortRequest, "email" | "address" | "zip" | "projectType" | "message">>;
      /** The block appended to the notes, also the body of every follow-up. */
      block: string;
      merged: StoredShortRequest;
    };

const PROJECT_VALUES = new Set<string>(DETAIL_PROJECT_TYPES.map((option) => option.value));
const TIMING_VALUES = new Set<string>(DETAIL_TIMINGS);

function line(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Unknown option values are dropped rather than stored: the panel only offers these. */
export function cleanDetails(input: RequestDetailsFields | null | undefined): CleanDetails {
  const projectType = line(input?.projectType, 60);
  const timing = line(input?.timing, 40);
  const email = line(input?.email, 200);
  return {
    projectType: PROJECT_VALUES.has(projectType) ? projectType : "",
    address: line(input?.address, 300),
    timing: TIMING_VALUES.has(timing) ? timing : "",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
  };
}

function detailsRef(details: CleanDetails, files: RequestFileRecord[]): string {
  const canonical = JSON.stringify({
    ...details,
    files: files.map((file) => file.key).sort(),
  });
  return crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 12);
}

/**
 * Folds step 2 into the stored request. Rules:
 * - a step 1 answer is never overwritten, and never by a blank;
 * - the project type replaces only the placeholder step 1 filed the request under;
 * - everything given lands in a "DETAILS ADDED" block on the notes, so even a value that did
 *   not fill a column (an address that differs from one already on file) is visible;
 * - the same details posted twice change nothing the second time (the block carries a ref).
 */
export function mergeRequestDetails(
  existing: StoredShortRequest,
  input: RequestDetailsFields | null | undefined,
  files: RequestFileRecord[] = [],
): DetailsMerge {
  const details = cleanDetails(input);
  const ref = detailsRef(details, files);
  const given = Boolean(details.projectType || details.address || details.timing || details.email || files.length);
  if (!given) return { changed: false, ref, reason: "empty" };
  if (existing.message.includes(`(ref ${ref})`)) return { changed: false, ref, reason: "repeat" };

  const patch: Extract<DetailsMerge, { changed: true }>["patch"] = {};
  if (details.email && !existing.email.trim()) patch.email = details.email;
  if (details.projectType && REPLACEABLE_PROJECT_TYPES.has(existing.projectType.trim())) {
    patch.projectType = details.projectType;
  }
  if (details.address) {
    const onlyZip = /^\d{5}(-\d{4})?$/.test(details.address);
    if (!onlyZip && !existing.address.trim()) patch.address = details.address;
    const zip = zipFrom(details.address);
    if (zip && !existing.zip.trim()) patch.zip = zip;
  }

  const rows: string[] = [`DETAILS ADDED (ref ${ref})`];
  if (details.projectType) rows.push(`Project: ${details.projectType}`);
  if (details.address) rows.push(`Address: ${details.address}`);
  if (details.timing) rows.push(`Timing: ${details.timing}`);
  if (details.email) rows.push(`Email: ${details.email}`);
  if (files.length) {
    rows.push(`Photos and files (${files.length}):`);
    for (const file of files) rows.push(`${file.name} (${formatFileSize(file.size)}): ${file.url}`);
  }
  const block = rows.join("\n");
  patch.message = existing.message.trim() ? `${existing.message.trim()}\n\n${block}` : block;
  return { changed: true, ref, patch, block, merged: { ...existing, ...patch } };
}
