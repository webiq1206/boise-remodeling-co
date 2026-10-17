import { NextResponse } from "next/server";
import { allowEnhancedConversionsForLead } from "@/server/services/enhancedConversionSuppression";

/** Boolean only. The raw email and phone are hashed for the lookup and are not stored or returned. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email : "";
  const phone = typeof body?.phone === "string" ? body.phone : "";
  const allowEnhancedConversions = await allowEnhancedConversionsForLead(email, phone);
  return NextResponse.json({ allowEnhancedConversions });
}
