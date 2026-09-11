import { getSession, getUserFromDb } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, leadPurchases, notifications } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request, props: { params: Promise<{ leadId: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUserFromDb(session.userId);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { leadId } = params;

  const result = await db.select().from(leads).where(eq(leads.id, leadId));
  const lead = result[0];
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  await db.delete(notifications).where(eq(notifications.leadId, leadId));
  await db.delete(leadPurchases).where(eq(leadPurchases.leadId, leadId));
  await db.delete(leads).where(eq(leads.id, leadId));

  console.log("[ADMIN] Lead deleted:", leadId, "by", session.userId);

  return NextResponse.json({ success: true });
}
