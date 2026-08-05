import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import {
  listVaultRows,
  uploadComplianceDoc,
} from "@/lib/compliance/store";
import { DOC_TYPE_KEYS, type DocTypeKey } from "@/lib/compliance/types";

export async function GET() {
  const auth = await requirePermission("compliance", "view");
  if (!auth.ok) return auth.response;
  const rows = await listVaultRows();
  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  const auth = await requirePermission("compliance", "create");
  if (!auth.ok) return auth.response;

  const form = await request.formData();
  const typeKey = String(form.get("typeKey") ?? "") as DocTypeKey;
  const issuedOn = String(form.get("issuedOn") ?? "").trim();
  const file = form.get("file");

  if (!DOC_TYPE_KEYS.includes(typeKey)) {
    return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
  }
  if (!issuedOn) {
    return NextResponse.json({ error: "Issue date is required." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }

  const document = await uploadComplianceDoc({ typeKey, issuedOn, file });
  const rows = await listVaultRows();
  return NextResponse.json({ document, rows }, { status: 201 });
}
