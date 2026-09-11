import { getSession, getUserFromDb } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, users } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

export async function POST(request: Request, props: { params: Promise<{ leadId: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUserFromDb(session.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role !== "subcontractor" && user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { leadId } = params;

  const result = await db.select().from(leads).where(eq(leads.id, leadId));
  const lead = result[0];
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.status !== "available") return NextResponse.json({ error: "Lead is not available" }, { status: 400 });

  const watchedLeads = parseJsonArray(user.watchedLeads);

  if (!watchedLeads.includes(leadId)) {
    watchedLeads.push(leadId);
    await db.update(users).set({ watchedLeads }).where(eq(users.id, user.id));
  }

  return NextResponse.json({ success: true, watched: true, leadId });
}
