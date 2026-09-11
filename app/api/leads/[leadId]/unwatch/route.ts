import { getSession, getUserFromDb } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/shared/schema";
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

  const watchedLeads = parseJsonArray(user.watchedLeads);
  const filtered = watchedLeads.filter((id) => id !== leadId);

  await db.update(users).set({ watchedLeads: filtered }).where(eq(users.id, user.id));

  return NextResponse.json({ success: true, watched: false, leadId });
}
