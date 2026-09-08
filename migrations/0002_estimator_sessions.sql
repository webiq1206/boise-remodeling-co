-- Partial-completion tracking for estimators and lead forms.
-- Safe to run repeatedly. The app also creates this table on first use
-- (server/services/estimatorSessions.ts ensureEstimatorSessionsTable), so a
-- deploy without `npm run db:push` still works; this file exists so the schema
-- is reviewable and reversible (DROP TABLE estimator_sessions).
CREATE TABLE IF NOT EXISTS "estimator_sessions" (
  "id" varchar(64) PRIMARY KEY,
  "site" text NOT NULL,
  "flow" text NOT NULL,
  "page_path" text NOT NULL DEFAULT '/',
  "device" text NOT NULL DEFAULT 'unknown',
  "started_at" timestamp NOT NULL DEFAULT now(),
  "last_activity_at" timestamp NOT NULL DEFAULT now(),
  "current_step" text,
  "current_step_index" integer NOT NULL DEFAULT 0,
  "last_completed_step" text,
  "total_steps" integer NOT NULL DEFAULT 0,
  "completion_percent" integer NOT NULL DEFAULT 0,
  "time_spent_seconds" integer NOT NULL DEFAULT 0,
  "selections" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "validation_errors" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "exit_method" text NOT NULL DEFAULT 'unknown',
  "engaged" boolean NOT NULL DEFAULT false,
  "prompt_shown" boolean NOT NULL DEFAULT false,
  "clicked_call" boolean NOT NULL DEFAULT false,
  "clicked_text" boolean NOT NULL DEFAULT false,
  "requested_callback" boolean NOT NULL DEFAULT false,
  "dismissed_prompt" boolean NOT NULL DEFAULT false,
  "contact_name" text,
  "contact_phone" text,
  "contact_email" text,
  "callback_note" text,
  "callback_requested_at" timestamp,
  "callback_notified_at" timestamp,
  "status" text NOT NULL DEFAULT 'active',
  "notified_at" timestamp,
  "notify_attempt_count" integer NOT NULL DEFAULT 0,
  "notify_last_error" text,
  "notify_locked_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "estimator_sessions_status_activity_idx" ON "estimator_sessions" ("status", "last_activity_at");
CREATE INDEX IF NOT EXISTS "estimator_sessions_site_created_idx" ON "estimator_sessions" ("site", "created_at");
