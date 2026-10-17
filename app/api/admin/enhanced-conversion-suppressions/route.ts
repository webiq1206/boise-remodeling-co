import { getSession, getUserFromDb } from "@/lib/auth";
import { NextResponse } from "next/server";
import { addEnhancedConversionSuppression } from "@/server/services/enhancedConversionSuppression";

/** Admin insert. The response lists kind and hash, never the raw email or phone. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getUserFromDb(session.userId);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email : "";
  const phone = typeof body?.phone === "string" ? body.phone : "";
  if (!email && !phone) {
    return NextResponse.json({ error: "Provide an email or a phone number." }, { status: 400 });
  }
  try {
    const stored = await addEnhancedConversionSuppression({ email, phone });
    if (!stored.length) {
      return NextResponse.json({ error: "That email or phone could not be normalized." }, { status: 400 });
    }
    return NextResponse.json({
      stored: stored.map((record) => ({ kind: record.kind, valueHash: record.valueHash })),
    });
  } catch (error: unknown) {
    console.error(
      "[enhanced-conversions] suppression insert failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json({ error: "The suppression could not be saved." }, { status: 503 });
  }
}
