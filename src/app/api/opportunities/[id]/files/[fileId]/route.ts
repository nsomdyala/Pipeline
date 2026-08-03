import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getOpportunity,
  opportunityUploadDir,
} from "@/lib/opportunities/store";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id, fileId } = await params;
  const opportunity = await getOpportunity(id);
  if (!opportunity) {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }

  const file = opportunity.files.find((item) => item.id === fileId);
  if (!file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  try {
    const buffer = await readFile(
      path.join(opportunityUploadDir(id), file.storedName),
    );
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `attachment; filename="${file.filename.replace(/"/g, "")}"`,
        "Content-Length": String(file.size),
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing on disk." }, { status: 404 });
  }
}
