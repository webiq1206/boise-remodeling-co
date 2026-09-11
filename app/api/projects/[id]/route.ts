import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserFromDb } from "@/lib/auth";
import {
  getProjectById,
  getChangeOrdersForProject,
  getEntityDocuments,
} from "@/server/services/projectService";
import { getContractsForProject } from "@/server/services/contractService";
import { db } from "@/lib/db";
import { projectAssignments } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";

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

    const project = await getProjectById(params.id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (user.role !== "admin") {
      if (!db) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const [assignment] = await db
        .select()
        .from(projectAssignments)
        .where(
          and(
            eq(projectAssignments.projectId, params.id),
            eq(projectAssignments.subcontractorId, session.userId),
            sql`${projectAssignments.status} != 'removed'`
          )
        )
        .limit(1);

      if (!assignment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const [changeOrders, documents, contracts] = await Promise.all([
      getChangeOrdersForProject(params.id),
      getEntityDocuments("project", params.id),
      getContractsForProject(params.id),
    ]);

    const visibleChangeOrders = changeOrders.filter((c) => c.status === "approved");
    const subContracts =
      user.role === "admin"
        ? contracts
        : contracts.filter((c) => c.subcontractorId === session.userId);

    return NextResponse.json({
      project: {
        ...project,
        internalNotes: user.role === "admin" ? project.internalNotes : [],
      },
      changeOrders: visibleChangeOrders,
      documents,
      contracts: subContracts,
    });
  } catch (error) {
    console.error("[project GET]", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}
