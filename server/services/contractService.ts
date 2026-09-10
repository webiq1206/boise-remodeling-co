import { db } from "@/lib/db";
import {
  contracts,
  contractTemplates,
  type Contract,
  type ContractTemplate,
  type InsertContract,
} from "@shared/schema";
import { and, desc, eq } from "drizzle-orm";
import { formatSubcontractorName } from "@/lib/compliance/complianceStatus";
import { getChangeOrdersForProject, getProjectById } from "./projectService";
import { storage } from "@/server/storage";
import { uploadFile } from "@/lib/storage/blob";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function getAllContractTemplates(): Promise<ContractTemplate[]> {
  if (!db) return [];
  return db
    .select()
    .from(contractTemplates)
    .where(eq(contractTemplates.isActive, true))
    .orderBy(desc(contractTemplates.updatedAt));
}

export async function getContractTemplateById(
  id: string
): Promise<ContractTemplate | null> {
  if (!db) return null;
  const [t] = await db
    .select()
    .from(contractTemplates)
    .where(eq(contractTemplates.id, id))
    .limit(1);
  return t ?? null;
}

export async function upsertContractTemplate(data: {
  id?: string;
  name: string;
  bodyHtml: string;
  version?: string;
}): Promise<ContractTemplate> {
  if (!db) throw new Error("Database not available");

  if (data.id) {
    const [updated] = await db
      .update(contractTemplates)
      .set({
        name: data.name,
        bodyHtml: data.bodyHtml,
        version: data.version ?? "1.0",
        updatedAt: new Date(),
      })
      .where(eq(contractTemplates.id, data.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(contractTemplates)
    .values({
      name: data.name,
      bodyHtml: data.bodyHtml,
      version: data.version ?? "1.0",
    })
    .returning();
  return created;
}

export async function buildMergeData(
  projectId: string,
  subcontractorId: string
): Promise<Record<string, string>> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const sub = await storage.getUser(subcontractorId);
  if (!sub) throw new Error("Subcontractor not found");

  const changeOrders = await getChangeOrdersForProject(projectId);
  const approvedOrders = changeOrders.filter((c) => c.status === "approved");
  const changeOrdersSummary =
    approvedOrders.length === 0
      ? "None"
      : approvedOrders
          .map(
            (c) =>
              `#${c.number}: ${c.title} (${Number(c.amountDelta) >= 0 ? "+" : ""}$${c.amountDelta})`
          )
          .join("; ");

  const fmtDate = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-US") : "TBD";

  return {
    "project.name": project.name,
    "project.title": project.title,
    "project.address": project.address ?? "",
    "project.city": project.city,
    "project.email": project.email,
    "project.phone": project.phone,
    "contractor.name": formatSubcontractorName(sub),
    "contractor.company": sub.company ?? "",
    "contractor.email": sub.email ?? "",
    "scopeOfWork": project.scopeOfWork ?? project.message ?? "",
    "contractAmount": project.contractAmount
      ? `$${parseFloat(project.contractAmount).toLocaleString()}`
      : "TBD",
    "paymentTerms": project.paymentTerms ?? "Net 30",
    "startDate": fmtDate(project.startDate),
    "completionDate": fmtDate(project.completionDate),
    "changeOrdersSummary": changeOrdersSummary,
  };
}

export function renderTemplate(bodyHtml: string, mergeData: Record<string, string>): string {
  let rendered = bodyHtml;
  for (const [key, value] of Object.entries(mergeData)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return rendered;
}

export async function createContract(data: {
  projectId: string;
  subcontractorId: string;
  templateId?: string;
  title: string;
  bodyHtml?: string;
  createdBy: string;
}): Promise<Contract> {
  if (!db) throw new Error("Database not available");

  const mergeData = await buildMergeData(data.projectId, data.subcontractorId);
  let bodyHtml = data.bodyHtml;

  if (!bodyHtml && data.templateId) {
    const template = await getContractTemplateById(data.templateId);
    if (!template) throw new Error("Template not found");
    bodyHtml = renderTemplate(template.bodyHtml, mergeData);
  }

  if (!bodyHtml) throw new Error("Contract body is required");

  const [contract] = await db
    .insert(contracts)
    .values({
      projectId: data.projectId,
      subcontractorId: data.subcontractorId,
      templateId: data.templateId,
      title: data.title,
      bodyHtml,
      mergeData,
      status: "draft",
      createdBy: data.createdBy,
    })
    .returning();

  return contract;
}

export async function sendContract(contractId: string): Promise<Contract | null> {
  if (!db) throw new Error("Database not available");

  const [contract] = await db
    .update(contracts)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(eq(contracts.id, contractId))
    .returning();

  return contract ?? null;
}

export async function signContract(
  contractId: string,
  signature: string,
  ip: string,
  userAgent: string
): Promise<Contract | null> {
  if (!db) throw new Error("Database not available");

  const [existing] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!existing || existing.status !== "sent") {
    throw new Error("Contract not available for signing");
  }

  const pdfBuffer = await renderContractPdf(
    existing.title,
    existing.bodyHtml,
    signature,
    new Date()
  );

  const pdfUrl = await uploadFile(
    `contracts/${contractId}/signed.pdf`,
    pdfBuffer,
    "application/pdf"
  );

  const [contract] = await db
    .update(contracts)
    .set({
      status: "signed",
      signature: signature.trim(),
      signedAt: new Date(),
      signatureIp: ip,
      signatureUserAgent: userAgent,
      signedPdfUrl: pdfUrl,
      updatedAt: new Date(),
    })
    .where(eq(contracts.id, contractId))
    .returning();

  return contract ?? null;
}

export async function renderContractPdf(
  title: string,
  bodyHtml: string,
  signature?: string,
  signedAt?: Date
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const plainText = bodyHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();

  const lines = plainText.split("\n");
  const fontSize = 11;
  const lineHeight = 14;
  const margin = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  page.drawText(title, { x: margin, y, size: 16, font: boldFont, color: rgb(0, 0, 0) });
  y -= 30;

  for (const line of lines) {
    if (y < margin + 80) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    const words = line.split(" ");
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth && currentLine) {
        page.drawText(currentLine, { x: margin, y, size: fontSize, font });
        y -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      page.drawText(currentLine, { x: margin, y, size: fontSize, font });
      y -= lineHeight;
    }
  }

  if (signature && signedAt) {
    if (y < margin + 60) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    y -= 20;
    page.drawText("Digital Signature", {
      x: margin,
      y,
      size: 12,
      font: boldFont,
    });
    y -= lineHeight;
    page.drawText(`Signed by: ${signature}`, { x: margin, y, size: fontSize, font });
    y -= lineHeight;
    page.drawText(`Date: ${signedAt.toLocaleString("en-US")}`, {
      x: margin,
      y,
      size: fontSize,
      font,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function getContractsForProject(projectId: string): Promise<Contract[]> {
  if (!db) return [];
  return db
    .select()
    .from(contracts)
    .where(eq(contracts.projectId, projectId))
    .orderBy(desc(contracts.createdAt));
}

export async function getContractsForSubcontractor(
  subcontractorId: string
): Promise<Contract[]> {
  if (!db) return [];
  return db
    .select()
    .from(contracts)
    .where(eq(contracts.subcontractorId, subcontractorId))
    .orderBy(desc(contracts.createdAt));
}

export async function getContractById(id: string): Promise<Contract | null> {
  if (!db) return null;
  const [c] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  return c ?? null;
}

export async function voidContract(contractId: string): Promise<Contract | null> {
  if (!db) throw new Error("Database not available");
  const [c] = await db
    .update(contracts)
    .set({ status: "void", updatedAt: new Date() })
    .where(eq(contracts.id, contractId))
    .returning();
  return c ?? null;
}

export async function getContractStats(): Promise<{
  unsigned: number;
  signed: number;
  draft: number;
}> {
  if (!db) return { unsigned: 0, signed: 0, draft: 0 };
  const all = await db.select().from(contracts);
  return {
    unsigned: all.filter((c) => c.status === "sent").length,
    signed: all.filter((c) => c.status === "signed").length,
    draft: all.filter((c) => c.status === "draft").length,
  };
}

export async function seedDefaultContractTemplate(): Promise<void> {
  if (!db) return;
  const existing = await db.select().from(contractTemplates).limit(1);
  if (existing.length > 0) return;

  await db.insert(contractTemplates).values({
    name: "Standard Subcontractor Agreement",
    version: "1.0",
    bodyHtml: `<h2>Subcontractor Agreement</h2>
<p>This agreement is entered into between Boise Remodeling Co and {{contractor.company}} ({{contractor.name}}).</p>
<h3>Project Details</h3>
<p><strong>Project:</strong> {{project.title}}<br/>
<strong>Address:</strong> {{project.address}}, {{project.city}}<br/>
<strong>Customer:</strong> {{project.name}}</p>
<h3>Scope of Work</h3>
<p>{{scopeOfWork}}</p>
<h3>Contract Terms</h3>
<p><strong>Contract Amount:</strong> {{contractAmount}}<br/>
<strong>Payment Terms:</strong> {{paymentTerms}}<br/>
<strong>Start Date:</strong> {{startDate}}<br/>
<strong>Completion Date:</strong> {{completionDate}}</p>
<h3>Change Orders</h3>
<p>{{changeOrdersSummary}}</p>
<p>By signing below, the subcontractor agrees to perform the work described above in accordance with all applicable laws, regulations, and company policies.</p>`,
  });
}
