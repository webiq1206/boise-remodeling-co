import { getSession, getUserFromDb } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, quotes } from "@/shared/schema";
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
    status: "accepted",
    adminReviewedBy: session.userId,
    adminReviewedAt: new Date(),
    adminDeclined: false,
  }).where(eq(leads.id, leadId));

  const updated = await db.select().from(leads).where(eq(leads.id, leadId));

  let customerStatus: "contact_soon" | "quote_ready" = "contact_soon";
  try {
    const body = await request.json();
    if (body?.customerStatus === "quote_ready") {
      customerStatus = "quote_ready";
    }
  } catch {
    // No body - default status
  }

  try {
    if (lead.quoteId) {
      const quoteResult = await db.select().from(quotes).where(eq(quotes.id, lead.quoteId));
      const quote = quoteResult[0];
      if (quote) {
        const { sendCustomerStatusUpdate } = await import("@/server/services/emailNotifications");
        const message =
          customerStatus === "quote_ready"
            ? "Your customized quote is ready to review. Click below to view your quote status and next steps."
            : "Your quote has been reviewed and we'll be contacting you shortly to discuss the details.";
        sendCustomerStatusUpdate(quote.email, quote.id, {
          status: customerStatus,
          message,
        }).catch(() => {});
      }
    }
  } catch (e) {}

  return NextResponse.json(updated[0]);
}
