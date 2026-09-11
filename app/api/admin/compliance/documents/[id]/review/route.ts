import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserFromDb } from "@/lib/auth";
import { reviewComplianceDocument } from "@/server/services/complianceService";
import { storage } from "@/server/storage";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserFromDb(session.userId);
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, rejectionReason } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const doc = await reviewComplianceDocument(
      params.id,
      session.userId,
      action,
      rejectionReason
    );

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await storage.createNotification({
      userId: doc.userId,
      type: action === "approve" ? "compliance_approved" : "compliance_rejected",
      title:
        action === "approve"
          ? "Compliance document approved"
          : "Compliance document rejected",
      message:
        action === "approve"
          ? `Your ${doc.type.toUpperCase()} has been approved.`
          : `Your ${doc.type.toUpperCase()} was rejected: ${rejectionReason ?? "Please re-upload."}`,
      complianceDocumentId: doc.id,
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error("[compliance review]", error);
    return NextResponse.json({ error: "Review failed" }, { status: 500 });
  }
}
