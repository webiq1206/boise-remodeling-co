import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { storage } from "@/server/storage";

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await storage.getNotificationsByUser(session.userId);
    const notification = notifications.find((n) => n.id === params.id);
    if (!notification) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await storage.markNotificationRead(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[notifications mark-read]", error);
    return NextResponse.json({ error: "Failed to mark notification" }, { status: 500 });
  }
}
