import { createHash } from "node:crypto";
import { customerTelHref } from "@/lib/resend";

export type SuppressionKind = "email" | "phone";

export interface SuppressionRecord {
  kind: SuppressionKind;
  valueHash: string;
}

/** Trimmed, lowercased email, or null when it is not an email. */
export function normalizeSuppressionEmail(email: string | null | undefined): string | null {
  const value = (email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
}

/** E.164 form, including the leading plus, or null when the field is not one number. */
export function normalizeSuppressionPhone(phone: string | null | undefined): string | null {
  const href = customerTelHref(phone ?? "");
  if (!href?.startsWith("tel:+")) return null;
  return href.slice("tel:".length);
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Hashes that may be compared to the suppression list. Raw values are not returned. */
export function suppressionRecords(input: { email?: string | null; phone?: string | null }): SuppressionRecord[] {
  const records: SuppressionRecord[] = [];
  const email = normalizeSuppressionEmail(input.email);
  const phone = normalizeSuppressionPhone(input.phone);
  if (email) records.push({ kind: "email", valueHash: sha256Hex(email) });
  if (phone) records.push({ kind: "phone", valueHash: sha256Hex(phone) });
  return records;
}

/** False when either hash is already on the list. An empty list of hashes allows the set. */
export function allowEnhancedConversions(hashes: readonly string[], suppressed: ReadonlySet<string>): boolean {
  return hashes.every((hash) => !suppressed.has(hash));
}
