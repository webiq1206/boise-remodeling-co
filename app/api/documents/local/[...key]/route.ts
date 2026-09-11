import { NextRequest, NextResponse } from "next/server";
import { readLocalFile } from "@/lib/storage/blob";

export async function GET(_request: NextRequest, props: { params: Promise<{ key: string[] }> }) {
  const params = await props.params;
  try {
    const key = params.key.map(decodeURIComponent).join("/");
    const buffer = await readLocalFile(key);
    if (!buffer) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const ext = key.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeTypes[ext ?? ""] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${key.split("/").pop()}"`,
      },
    });
  } catch (error) {
    console.error("[documents local]", error);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
