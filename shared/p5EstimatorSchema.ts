import { sql } from "drizzle-orm";
import { primaryKey, pgTable, uuid, text, integer, jsonb, timestamp, unique, foreignKey, index } from "drizzle-orm/pg-core";

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
