import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getLead, leadUploadDir } from "@/lib/leads/store";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id, fileId } = await params;
  const lead = await getLead(id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  const file = lead.files.find((f) => f.id === fileId);
  if (!file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  try {
    const buffer = await readFile(path.join(leadUploadDir(id), file.storedName));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `inline; filename="${file.filename.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing on disk." }, { status: 404 });
  }
}
