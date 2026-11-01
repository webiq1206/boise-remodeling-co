import crypto from "crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { consultationRequests } from "@/shared/schema";
import type { StoredShortRequest } from "@/server/services/requestDetailsMerge";

export type InquiryStage = "estimate_gate" | "consultation";

export interface InquiryAcceptanceInput {
  inquiryId: string;
  stage: InquiryStage;
  name: string;
  email: string;
  phone: string;
  address?: string;
  projectType: string;
  website?: string;
  formStartedAt: number;
}

export interface InquiryAcceptance {
  accepted: true;
  inquiryId: string;
  rowId: string;
  duplicate: boolean;
  conversionEligible: boolean;
  needsDeliveryRetry: boolean;
}

export class InquiryRejectedError extends Error {
  constructor(
    public readonly status: number,
    public readonly publicMessage: string,
  ) {
    super(publicMessage);
  }
}

const MIN_FORM_AGE_MS = 700;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
const IP_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const IP_LIMIT = 6;

interface TestInquiryRow {
  id: string;
  inquiryId: string;
  fingerprint: string;
  conversionRecordedAt: Date | null;
  deliveryStatus: NonNullable<typeof consultationRequests.$inferInsert.deliveryStatus>;
  /** What the route stored, so the details step can read and merge it like a database row. */
  values: typeof consultationRequests.$inferInsert;
}

let isolatedTestAdapter:
  | { rows: Map<string, TestInquiryRow>; failWrites: boolean }
  | null = null;

/**
 * Build-verifier persistence seam. It is inert unless the isolated route
 * verifier explicitly installs it, and it never touches the production DB.
 */
export function installInquiryAcceptanceTestAdapter(options: { failWrites?: boolean } = {}): () => void {
  if (process.env.LEAD_ROUTE_ISOLATED_TEST !== "1") {
    throw new Error("The inquiry test adapter is restricted to the isolated lead route verifier.");
  }
  isolatedTestAdapter = {
    rows: new Map(),
    failWrites: options.failWrites === true,
  };
  return () => {
    isolatedTestAdapter = null;
  };
}

function normalized(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function digest(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function requestIpHash(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const salt = process.env.SESSION_SECRET || "brc-rate-limit";
  return digest(`${salt}:${ip}`);
}

function dedupeKey(input: InquiryAcceptanceInput): string {
  // A seven-day bucket catches callbacks and browser-storage loss without
  // blocking a homeowner from starting a genuinely new inquiry later.
  const bucket = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return digest(
    [
      normalized(input.email),
      input.phone.replace(/\D/g, ""),
      normalized(input.address || ""),
      normalized(input.projectType),
      bucket,
    ].join("|"),
  );
}

function validateHuman(input: InquiryAcceptanceInput): void {
  if (input.website?.trim()) {
    console.warn("[lead-acceptance] Honeypot completed; submission rejected.");
    throw new InquiryRejectedError(400, "We could not accept this request.");
  }
  const age = Date.now() - input.formStartedAt;
  if (!Number.isFinite(age) || age < MIN_FORM_AGE_MS || age > MAX_FORM_AGE_MS) {
    console.warn("[lead-acceptance] Invalid form timing; submission rejected.");
    throw new InquiryRejectedError(400, "Please refresh the page and try again.");
  }
}

/**
 * Claims a project inquiry in the database before the caller sends analytics,
 * email or CRM requests. Duplicate stages and retries return the existing row.
 */
export async function acceptInquiry(
  request: Request,
  input: InquiryAcceptanceInput,
  values: typeof consultationRequests.$inferInsert,
): Promise<InquiryAcceptance> {
  validateHuman(input);
  if (isolatedTestAdapter) {
    if (isolatedTestAdapter.failWrites) {
      throw new InquiryRejectedError(
        503,
        "We could not safely save your request. Please try again in a moment.",
      );
    }
    const fingerprint = dedupeKey(input);
    const existing = [...isolatedTestAdapter.rows.values()].find(
      (row) => row.inquiryId === input.inquiryId || row.fingerprint === fingerprint,
    );
    if (existing) {
      return {
        accepted: true,
        inquiryId: existing.inquiryId,
        rowId: existing.id,
        duplicate: true,
        conversionEligible: !existing.conversionRecordedAt,
        needsDeliveryRetry:
          existing.deliveryStatus.crm === "failed" ||
          existing.deliveryStatus.adminEmail === "failed" ||
          existing.deliveryStatus.customerEmail === "failed",
      };
    }
    const row: TestInquiryRow = {
      id: `isolated-${isolatedTestAdapter.rows.size + 1}`,
      inquiryId: input.inquiryId,
      fingerprint,
      conversionRecordedAt: null,
      deliveryStatus: {
        crm: "pending",
        adminEmail: "pending",
        customerEmail: "pending",
      },
      values: { ...values, inquiryId: input.inquiryId },
    };
    isolatedTestAdapter.rows.set(row.id, row);
    return {
      accepted: true,
      inquiryId: row.inquiryId,
      rowId: row.id,
      duplicate: false,
      conversionEligible: true,
      needsDeliveryRetry: false,
    };
  }
  if (!db) {
    throw new InquiryRejectedError(
      503,
      "We could not safely save your request. Please try again in a moment.",
    );
  }

  const ipHash = requestIpHash(request);
  const exact = await db
    .select({
      id: consultationRequests.id,
      conversionRecordedAt: consultationRequests.conversionRecordedAt,
      deliveryStatus: consultationRequests.deliveryStatus,
    })
    .from(consultationRequests)
    .where(eq(consultationRequests.inquiryId, input.inquiryId))
    .limit(1);

  if (exact.length > 0) {
    await db
      .update(consultationRequests)
      .set({
        ...values,
        inquiryId: input.inquiryId,
        sourceStage: input.stage,
        updatedAt: new Date(),
      })
      .where(eq(consultationRequests.id, exact[0].id));
    return {
      accepted: true,
      inquiryId: input.inquiryId,
      rowId: exact[0].id,
      duplicate: true,
      conversionEligible: !exact[0].conversionRecordedAt,
      needsDeliveryRetry:
        exact[0].deliveryStatus?.crm === "failed" ||
        exact[0].deliveryStatus?.adminEmail === "failed" ||
        exact[0].deliveryStatus?.customerEmail === "failed",
    };
  }

  const since = new Date(Date.now() - IP_LIMIT_WINDOW_MS);
  const recent = await db
    .select({ total: count() })
    .from(consultationRequests)
    .where(
      and(
        eq(consultationRequests.submissionIpHash, ipHash),
        gte(consultationRequests.createdAt, since),
      ),
    );
  if ((recent[0]?.total ?? 0) >= IP_LIMIT) {
    console.warn("[lead-acceptance] Per-IP rate limit reached.");
    throw new InquiryRejectedError(429, "Too many requests. Please wait a few minutes and try again.");
  }

  const fingerprint = dedupeKey(input);
  const related = await db
    .select({
      id: consultationRequests.id,
      inquiryId: consultationRequests.inquiryId,
      conversionRecordedAt: consultationRequests.conversionRecordedAt,
      deliveryStatus: consultationRequests.deliveryStatus,
    })
    .from(consultationRequests)
    .where(eq(consultationRequests.inquiryDedupeKey, fingerprint))
    .limit(1);

  if (related.length > 0) {
    await db
      .update(consultationRequests)
      .set({ ...values, sourceStage: input.stage, updatedAt: new Date() })
      .where(eq(consultationRequests.id, related[0].id));
    return {
      accepted: true,
      inquiryId: related[0].inquiryId || input.inquiryId,
      rowId: related[0].id,
      duplicate: true,
      conversionEligible: !related[0].conversionRecordedAt,
      needsDeliveryRetry:
        related[0].deliveryStatus?.crm === "failed" ||
        related[0].deliveryStatus?.adminEmail === "failed" ||
        related[0].deliveryStatus?.customerEmail === "failed",
    };
  }

  const inserted = await db
    .insert(consultationRequests)
    .values({
      ...values,
      inquiryId: input.inquiryId,
      inquiryDedupeKey: fingerprint,
      sourceStage: input.stage,
      acceptedAt: new Date(),
      updatedAt: new Date(),
      submissionIpHash: ipHash,
      deliveryLockedAt: new Date(),
      deliveryAttemptCount: 1,
      deliveryStatus: {
        crm: "pending",
        adminEmail: "pending",
        customerEmail: "pending",
      },
    })
    .onConflictDoNothing()
    .returning({ id: consultationRequests.id });

  if (!inserted[0]?.id) {
    const winner = await db
      .select({
        id: consultationRequests.id,
        inquiryId: consultationRequests.inquiryId,
        conversionRecordedAt: consultationRequests.conversionRecordedAt,
        deliveryStatus: consultationRequests.deliveryStatus,
      })
      .from(consultationRequests)
      .where(eq(consultationRequests.inquiryDedupeKey, fingerprint))
      .limit(1);
    if (winner[0]?.id) {
      return {
        accepted: true,
        inquiryId: winner[0].inquiryId || input.inquiryId,
        rowId: winner[0].id,
        duplicate: true,
        conversionEligible: !winner[0].conversionRecordedAt,
        needsDeliveryRetry:
          winner[0].deliveryStatus?.crm === "failed" ||
          winner[0].deliveryStatus?.adminEmail === "failed" ||
          winner[0].deliveryStatus?.customerEmail === "failed",
      };
    }
    throw new InquiryRejectedError(503, "We could not safely save your request. Please try again in a moment.");
  }
  return {
    accepted: true,
    inquiryId: input.inquiryId,
    rowId: inserted[0].id,
    duplicate: false,
    conversionEligible: true,
    needsDeliveryRetry: false,
  };
}

export async function recordDeliveryStatus(
  rowId: string,
  status: NonNullable<typeof consultationRequests.$inferInsert.deliveryStatus>,
): Promise<void> {
  if (isolatedTestAdapter) {
    const row = isolatedTestAdapter.rows.get(rowId);
    if (row) row.deliveryStatus = status;
    return;
  }
  if (!db) return;
  await db
    .update(consultationRequests)
    .set({
      deliveryStatus: {
        ...status,
        lastAttemptAt: new Date().toISOString(),
      },
      deliveryLockedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(consultationRequests.id, rowId));
}
/**
 * The stored short request, read back for step 2 ("Help us prepare") and the file uploads.
 * Null when there is no such row (or no database), which the caller answers as an unknown request.
 */
export async function loadAcceptedRequest(rowId: string): Promise<StoredShortRequest | null> {
  if (!rowId || rowId.length > 64) return null;
  if (isolatedTestAdapter) {
    const row = isolatedTestAdapter.rows.get(rowId);
    return row ? storedFrom(row.id, row.values) : null;
  }
  if (!db) return null;
  const rows = await db
    .select({
      id: consultationRequests.id,
      inquiryId: consultationRequests.inquiryId,
      name: consultationRequests.name,
      phone: consultationRequests.phone,
      email: consultationRequests.email,
      address: consultationRequests.address,
      zip: consultationRequests.zip,
      city: consultationRequests.city,
      projectType: consultationRequests.projectType,
      message: consultationRequests.message,
    })
    .from(consultationRequests)
    .where(eq(consultationRequests.id, rowId))
    .limit(1);
  return rows[0] ? storedFrom(rows[0].id, rows[0]) : null;
}

function storedFrom(
  id: string,
  values: { [K in keyof StoredShortRequest]?: string | null },
): StoredShortRequest {
  return {
    id,
    inquiryId: values.inquiryId ?? "",
    name: values.name ?? "",
    phone: values.phone ?? "",
    email: values.email ?? "",
    address: values.address ?? "",
    zip: values.zip ?? "",
    city: values.city ?? "",
    projectType: values.projectType ?? "",
    message: values.message ?? "",
  };
}

/** Writes only the merged columns. Existing columns, so no schema change and no db:push. */
export async function saveAcceptedRequest(
  rowId: string,
  patch: Partial<Pick<StoredShortRequest, "email" | "address" | "zip" | "projectType" | "message">>,
): Promise<void> {
  if (isolatedTestAdapter) {
    const row = isolatedTestAdapter.rows.get(rowId);
    if (row) row.values = { ...row.values, ...patch };
    return;
  }
  if (!db) throw new Error("No database to save the request details to.");
  await db
    .update(consultationRequests)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(consultationRequests.id, rowId));
}
