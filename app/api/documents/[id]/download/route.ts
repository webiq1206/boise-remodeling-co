import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserFromDb } from "@/lib/auth";
import {
  getComplianceDocumentById,
  getEntityDocumentById,
} from "@/server/services/projectService";
import { getContractById } from "@/server/services/contractService";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserFromDb(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const source = new URL(_request.url).searchParams.get("source") ?? "entity";
    let fileUrl: string | null = null;
    let fileName = "document";

    if (source === "compliance") {
      const doc = await getComplianceDocumentById(params.id);
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (user.role !== "admin" && doc.userId !== session.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      fileUrl = doc.fileUrl;
      fileName = doc.fileName;
    } else if (source === "contract") {
      const contract = await getContractById(params.id);
      if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (
        user.role !== "admin" &&
        contract.subcontractorId !== session.userId
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      fileUrl = contract.signedPdfUrl;
      fileName = `${contract.title}.pdf`;
    } else {
      const doc = await getEntityDocumentById(params.id);
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      fileUrl = doc.fileUrl;
      fileName = doc.fileName;
    }

    if (!fileUrl) {
      return NextResponse.json({ error: "File not available" }, { status: 404 });
    }

    if (fileUrl.startsWith("http")) {
      return NextResponse.redirect(fileUrl);
    }

    return NextResponse.redirect(new URL(fileUrl, _request.url));
  } catch (error) {
    console.error("[documents download]", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
