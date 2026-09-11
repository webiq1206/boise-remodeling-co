import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserFromDb } from "@/lib/auth";
import { convertLeadToProject } from "@/server/services/projectService";

export async function POST(_request: NextRequest, props: { params: Promise<{ leadId: string }> }) {
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

    const project = await convertLeadToProject(params.leadId, session.userId);
    return NextResponse.json(project);
  } catch (error) {
    console.error("[convert-to-project]", error);
    const message =
      error instanceof Error ? error.message : "Failed to convert lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
