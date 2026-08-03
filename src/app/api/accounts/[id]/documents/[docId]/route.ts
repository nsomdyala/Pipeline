import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { accountUploadDir, getAccount } from "@/lib/accounts/store";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id, docId } = await params;
  const account = await getAccount(id);
  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const doc = account.documents.find((item) => item.id === docId);
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  try {
    const buffer = await readFile(
      path.join(accountUploadDir(id), doc.storedName),
    );
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": doc.mime,
        "Content-Disposition": `inline; filename="${doc.filename.replace(/"/g, "")}"`,
        "Content-Length": String(doc.size),
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing on disk." }, { status: 404 });
  }
}
