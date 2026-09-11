import { getSession, getUserFromDb } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function parseNotesArray(val: unknown): Array<{ text: string; addedBy: string; addedAt: string }> {
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
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const { leadId } = params;
  const body = await request.json();
  const { text } = body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Note text is required" }, { status: 400 });
  }

  const result = await db.select().from(leads).where(eq(leads.id, leadId));
  const lead = result[0];
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const existingNotes = parseNotesArray(lead.notes);
  const addedBy = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || user.id;

  existingNotes.push({
    text: text.trim(),
    addedBy,
    addedAt: new Date().toISOString(),
  });

  await db.update(leads).set({ notes: existingNotes }).where(eq(leads.id, leadId));
  const updated = await db.select().from(leads).where(eq(leads.id, leadId));

  return NextResponse.json(updated[0]);
}
