import { NextResponse } from "next/server";
import { persistUploadedFiles } from "@/lib/opportunities/files";
import {
  addFilesToOpportunity,
  getOpportunity,
} from "@/lib/opportunities/store";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await getOpportunity(id);
  if (!existing) {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }

  const form = await request.formData();
  const uploads = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (uploads.length === 0) {
    return NextResponse.json(
      { error: "Choose at least one file to upload." },
      { status: 400 },
    );
  }

  const files = await persistUploadedFiles(id, uploads);
  const opportunity = await addFilesToOpportunity(id, files);
  return NextResponse.json({ opportunity }, { status: 201 });
}
