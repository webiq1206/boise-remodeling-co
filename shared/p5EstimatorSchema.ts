import { sql } from "drizzle-orm";
import { primaryKey, pgTable, uuid, text, integer, jsonb, timestamp, unique, foreignKey, index, bigserial, boolean } from "drizzle-orm/pg-core";

// Keep these declarations aligned with the existing estimator storage schema.
export const p5EstimatorDrafts = pgTable("p5_estimator_drafts", {
  id: uuid("id").primaryKey(),
  keyHash: text("key_hash").notNull(),
  brand: text("brand").notNull(),
  revision: integer("revision").notNull().default(0),
  status: text("status").notNull().default("draft"),
  payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
  internalEstimate: jsonb("internal_estimate"),
  customerEstimate: jsonb("customer_estimate"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const p5EstimatorFiles = pgTable("p5_estimator_files", {
  id: uuid("id").primaryKey(),
  draftId: uuid("draft_id").notNull(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256").notNull(),
  dataBase64: text("data_base64").notNull(),
  storageBucket: text("storage_bucket"),
  storageKey: text("storage_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ name: "p5_estimator_files_draft_id_fkey", columns: [table.draftId], foreignColumns: [p5EstimatorDrafts.id] }),
  unique("p5_estimator_files_draft_id_sha256_key").on(table.draftId, table.sha256),
]);

export const p5EstimatorOutbox = pgTable("p5_estimator_outbox", {
  id: uuid("id").primaryKey(),
  draftId: uuid("draft_id").notNull(),
  revision: integer("revision").notNull(),
  destination: text("destination").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  providerId: text("provider_id"),
  lastError: text("last_error"),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
}, (table) => [
  foreignKey({ name: "p5_estimator_outbox_draft_id_fkey", columns: [table.draftId], foreignColumns: [p5EstimatorDrafts.id] }),
  unique("p5_estimator_outbox_draft_id_revision_destination_key").on(table.draftId, table.revision, table.destination),
  index("p5_estimator_outbox_due").on(table.status, table.nextAttemptAt),
]);

export const p5EstimatorPolicy = pgTable("p5_estimator_policy", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().default(1),
  payload: jsonb("payload").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const p5EstimatorWork = pgTable("p5_estimator_work", {
 draftId: uuid("draft_id").notNull(),workKey:text("work_key").notNull(),payload:jsonb("payload").notNull().default({}),leaseToken:text("lease_token"),leaseUntil:timestamp("lease_until",{withTimezone:true}),updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow(),
},table=>[primaryKey({name:"p5_estimator_work_pkey",columns:[table.draftId,table.workKey]}),foreignKey({name:"p5_estimator_work_draft_id_fkey",columns:[table.draftId],foreignColumns:[p5EstimatorDrafts.id]})]);

// Declared on 2026-09-15. These seven tables are created at runtime by
// lib/p5/events.ts, manualReview.ts and referenceEndpoint.ts, so they existed
// in production while absent from this file. drizzle-kit reads anything it
// cannot see here as an orphan: a publish of Boise Remodeling Co generated
// DROP TABLE "p5_estimator_events" CASCADE against 14 rows of provider
// telemetry, and a publish left unapproved at that prompt never promotes,
// which is why 2026-09-14.3 sat undeployed. Declaring them makes the diff
// empty. Keep them in step with the runtime DDL, which still runs first on a
// cold database.
export const p5EstimatorEvents = pgTable("p5_estimator_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  draftId: uuid("draft_id"),
  brand: text("brand").notNull(),
  estimator: text("estimator"),
  kind: text("kind").notNull(),
  stage: text("stage").notNull(),
  file: text("file"),
  provider: text("provider"),
  model: text("model"),
  status: integer("status"),
  code: text("code"),
  message: text("message"),
  durationMs: integer("duration_ms"),
  attempt: integer("attempt"),
  fallback: boolean("fallback").notNull().default(false),
  outcome: text("outcome").notNull(),
  meta: jsonb("meta"),
}, table => [index("p5_estimator_events_draft").on(table.draftId, table.createdAt)]);

export const p5EstimatorReferenceSets = pgTable("p5_estimator_reference_sets", {
  version: integer("version").primaryKey(),
  records: jsonb("records").notNull(),
  actorId: text("actor_id").notNull(),
  notes: text("notes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const p5EstimatorReferenceChecks = pgTable("p5_estimator_reference_checks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  draftId: uuid("draft_id").notNull(),
  reviewId: text("review_id").notNull(),
  referenceVersion: integer("reference_version").notNull(),
  selection: jsonb("selection").notNull(),
  result: jsonb("result").notNull(),
  actorId: text("actor_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const p5EstimatorReviews = pgTable("p5_estimator_reviews", {
  id: text("id").primaryKey(),
  draftId: uuid("draft_id").notNull(),
  sourceRevision: integer("source_revision").notNull(),
  input: jsonb("input").notNull(),
  finance: jsonb("finance").notNull(),
  notes: text("notes").notNull(),
  actorId: text("actor_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [foreignKey({ name: "p5_estimator_reviews_draft_id_fkey", columns: [table.draftId], foreignColumns: [p5EstimatorDrafts.id] })]);

export const p5EstimatorApprovals = pgTable("p5_estimator_approvals", {
  id: uuid("id").primaryKey(),
  revision: text("revision").notNull(),
  owner: text("owner").notNull(),
  actorId: text("actor_id").notNull(),
  reason: text("reason").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [unique("p5_estimator_approvals_revision_owner_key").on(table.revision, table.owner)]);

export const p5EstimatorHistory = pgTable("p5_estimator_history", {
  draftId: uuid("draft_id").notNull(),
  revision: integer("revision").notNull(),
  record: jsonb("record").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  primaryKey({ name: "p5_estimator_history_pkey", columns: [table.draftId, table.revision] }),
  foreignKey({ name: "p5_estimator_history_draft_id_fkey", columns: [table.draftId], foreignColumns: [p5EstimatorDrafts.id] }),
]);

export const p5EstimatorDeliveryReviews = pgTable("p5_estimator_delivery_reviews", {
  id: uuid("id").primaryKey(),
  deliveryId: uuid("delivery_id").notNull(),
  actorId: text("actor_id").notNull(),
  decision: text("decision").notNull(),
  evidence: text("evidence").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [foreignKey({ name: "p5_estimator_delivery_reviews_delivery_id_fkey", columns: [table.deliveryId], foreignColumns: [p5EstimatorOutbox.id] })]);
