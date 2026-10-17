import { inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { enhancedConversionSuppressions } from "@/shared/schema";
import {
  allowEnhancedConversions,
  suppressionRecords,
  type SuppressionRecord,
} from "@/shared/enhancedConversionSuppression";

let ensured: Promise<void> | null = null;

/** Creates the table on first use. Mirrors migrations/0003_enhanced_conversion_suppressions.sql. */
export function ensureEnhancedConversionSuppressionTable(): Promise<void> {
  const database = db;
  if (!database) return Promise.resolve();
  if (!ensured) {
    ensured = (async () => {
      await database.execute(sql`CREATE TABLE IF NOT EXISTS "enhanced_conversion_suppressions" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "kind" text NOT NULL,
        "value_hash" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )`);
      await database.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "enhanced_conversion_suppressions_value_hash_idx" ON "enhanced_conversion_suppressions" ("value_hash")`);
    })().catch((error: unknown) => {
      ensured = null;
      throw error;
    });
  }
  return ensured;
}

/**
 * True when neither the normalized email nor the E.164 phone is on the list.
 * A lookup failure skips enhanced conversions. It does not reject the lead.
 */
export async function allowEnhancedConversionsForLead(email?: string | null, phone?: string | null): Promise<boolean> {
  const database = db;
  const hashes = suppressionRecords({ email, phone }).map((record) => record.valueHash);
  if (!hashes.length || !database) return true;
  try {
    await ensureEnhancedConversionSuppressionTable();
    const rows = await database
      .select({ valueHash: enhancedConversionSuppressions.valueHash })
      .from(enhancedConversionSuppressions)
      .where(inArray(enhancedConversionSuppressions.valueHash, hashes));
    return allowEnhancedConversions(hashes, new Set(rows.map((row) => row.valueHash)));
  } catch (error: unknown) {
    console.error(
      "[enhanced-conversions] suppression lookup failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return false;
  }
}

/** Hashes the raw email or phone and inserts only the hash. */
export async function addEnhancedConversionSuppression(input: {
  email?: string | null;
  phone?: string | null;
}): Promise<SuppressionRecord[]> {
  const database = db;
  const records = suppressionRecords(input);
  if (!records.length) return [];
  if (!database) throw new Error("Database unavailable");
  await ensureEnhancedConversionSuppressionTable();
  for (const record of records) {
    await database.insert(enhancedConversionSuppressions).values(record).onConflictDoNothing();
  }
  return records;
}
