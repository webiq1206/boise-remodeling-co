import { getSession, getUserFromDb } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { HOUSE_NUMBER_REGEX, HOUSE_NUMBER_ERROR_MESSAGE } from "@/shared/addressValidation";

const patchSchema = z
  .object({
    address: z
      .string()
      .min(5, "Please enter a valid street address")
      .refine((v) => HOUSE_NUMBER_REGEX.test(v.trim()), HOUSE_NUMBER_ERROR_MESSAGE)
      .optional(),
    city: z.string().min(2).optional(),
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    propertyType: z.string().optional(),
    serviceType: z.string().optional(),
    selectedServices: z.array(z.string()).optional(),
    frequency: z.string().optional(),
    finalQuote: z.union([z.string(), z.number()]).optional(),
    currentLeadPrice: z.union([z.string(), z.number()]).optional(),
    baseLeadPrice: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.any().optional(),
    message: z.string().nullable().optional(),
    serviceData: z.any().optional(),
    lineItems: z.any().optional(),
    addressMissingHouseNumber: z.boolean().optional(),
    propertyProfile: z.record(z.unknown()).optional(),
  })
  .strict();

export async function PATCH(request: Request, props: { params: Promise<{ leadId: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUserFromDb(session.userId);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { leadId } = params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = patchSchema.parse(body);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors[0]?.message || "Validation error", details: e.errors },
        { status: 400 },
      );
    }
    throw e;
  }

  const result = await db.select().from(leads).where(eq(leads.id, leadId));
  const lead = result[0];
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const update: Record<string, unknown> = { ...parsed };
  if (typeof update.address === "string") {
    update.addressMissingHouseNumber = false;
  }

  await db.update(leads).set(update).where(eq(leads.id, leadId));
  const updated = await db.select().from(leads).where(eq(leads.id, leadId));

  return NextResponse.json(updated[0]);
}
