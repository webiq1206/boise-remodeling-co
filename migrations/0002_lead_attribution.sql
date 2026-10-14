-- Additive only: existing inquiries and notification settings are unchanged.
ALTER TABLE IF EXISTS consultation_requests ADD COLUMN IF NOT EXISTS attribution jsonb;
