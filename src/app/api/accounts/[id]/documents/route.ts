import { NextResponse } from "next/server";
import { persistAccountFiles } from "@/lib/accounts/files";
import { addDocumentsToAccount, getAccount } from "@/lib/accounts/store";
import {
  ACCOUNT_DOC_TYPES,
  type AccountDocType,
} from "@/lib/accounts/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await getAccount(id);
  if (!existing) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const form = await request.formData();
  const docType = String(form.get("docType") ?? "") as AccountDocType;
  if (!ACCOUNT_DOC_TYPES.includes(docType)) {
    return NextResponse.json(
      {
        error:
          "Document type must be signed_contract, appointment_letter, billing, or status.",
      },
      { status: 400 },
    );
  }

  const uploads = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (uploads.length === 0) {
    return NextResponse.json(
      { error: "Choose at least one file to upload." },
      { status: 400 },
    );
  }

  const documents = await persistAccountFiles(id, docType, uploads);
  const account = await addDocumentsToAccount(id, documents);
  return NextResponse.json({ account }, { status: 201 });
}
