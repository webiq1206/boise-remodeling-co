ALTER TABLE "consultation_requests"
  ADD COLUMN IF NOT EXISTS "inquiry_id" text,
  ADD COLUMN IF NOT EXISTS "inquiry_dedupe_key" text,
  ADD COLUMN IF NOT EXISTS "source_stage" text DEFAULT 'consultation',
  ADD COLUMN IF NOT EXISTS "accepted_at" timestamp DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "conversion_recorded_at" timestamp,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "delivery_locked_at" timestamp,
  ADD COLUMN IF NOT EXISTS "delivery_attempt_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "delivery_status" jsonb,
  ADD COLUMN IF NOT EXISTS "submission_ip_hash" text;

CREATE UNIQUE INDEX IF NOT EXISTS "consultation_requests_inquiry_id_idx"
  ON "consultation_requests" ("inquiry_id")
  WHERE "inquiry_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "consultation_requests_inquiry_dedupe_idx"
  ON "consultation_requests" ("inquiry_dedupe_key")
  WHERE "inquiry_dedupe_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "consultation_requests_ip_created_idx"
  ON "consultation_requests" ("submission_ip_hash", "created_at");