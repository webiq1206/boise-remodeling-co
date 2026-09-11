import { getSession, getUserFromDb } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, users, notifications, quotes } from "@/shared/schema";
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
  if (lead.status !== "pending_admin") return NextResponse.json({ error: "Lead is not pending admin review" }, { status: 400 });

  await db.update(leads).set({
    status: "available",
    adminReviewedBy: session.userId,
    adminReviewedAt: new Date(),
    adminDeclined: true,
    lastPriceUpdate: new Date(),
  }).where(eq(leads.id, leadId));

  const updated = await db.select().from(leads).where(eq(leads.id, leadId));

  try {
    const { sendContractorNewLeadAvailable, sendCustomerStatusUpdate } = await import("@/server/services/emailNotifications");

    const subs = await db.select().from(users).where(eq(users.role, "subcontractor"));
    for (const sub of subs) {
      await db.insert(notifications).values({
        userId: sub.id,
        type: "new_lead",
        title: "New Lead Available",
        message: `A new ${lead.serviceType} lead in ${lead.city} is now available.`,
        leadId: lead.id,
      });

      if (sub.email && sub.emailNotificationsEnabled !== false) {
        sendContractorNewLeadAvailable(sub.email, updated[0] as any).catch(() => {});
      }
    }

    if (lead.quoteId) {
      const quoteResult = await db.select().from(quotes).where(eq(quotes.id, lead.quoteId));
      const quote = quoteResult[0];
      if (quote) {
        sendCustomerStatusUpdate(quote.email, quote.id, {
          status: 'under_review',
          message: "Your quote is being reviewed by our team. We'll be in touch soon with your customized estimate.",
        }).catch(() => {});
      }
    }
  } catch (e) {}

  return NextResponse.json(updated[0]);
}
