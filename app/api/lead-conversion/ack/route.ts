import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { consultationRequests } from "@/shared/schema";

const bodySchema = z.object({ inquiryId: z.string().uuid() });

/**
 * Browser acknowledgement after the GA4, Google Ads and Meta calls have been
 * dispatched. Until this timestamp exists, a safe submission retry may return
 * conversionEligible again with the same stable platform dedupe ids.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ acknowledged: false }, { status: 400 });
  }
  if (!db) {
    return NextResponse.json({ acknowledged: false }, { status: 503 });
  }
  await db
    .update(consultationRequests)
    .set({ conversionRecordedAt: new Date(), updatedAt: new Date() })
    .where(eq(consultationRequests.inquiryId, parsed.data.inquiryId));
  return NextResponse.json({ acknowledged: true });
}