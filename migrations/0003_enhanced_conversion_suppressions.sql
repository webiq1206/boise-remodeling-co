-- Hashed suppression list for Google Ads enhanced conversions.
-- Safe to run repeatedly. The app also creates this table on first use
-- (server/services/enhancedConversionSuppression.ts), so a deploy still
-- works before this file is applied. No raw email or phone is stored.
CREATE TABLE IF NOT EXISTS "enhanced_conversion_suppressions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "kind" text NOT NULL,
  "value_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "enhanced_conversion_suppressions_value_hash_idx"
  ON "enhanced_conversion_suppressions" ("value_hash");
