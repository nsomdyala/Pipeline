import { NextResponse } from "next/server";
import {
  isSubmissionKind,
  submitOpportunityToLead,
} from "@/lib/workflow/conversions";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const form = await request.formData();
    const kindRaw = String(form.get("kind") ?? "");
    if (!isSubmissionKind(kindRaw)) {
      return NextResponse.json(
        { error: "Choose quotation or pricing." },
        { status: 400 },
      );
    }
    const uploads = form
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    const result = await submitOpportunityToLead(id, kindRaw, uploads);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not move to Leads.",
      },
      { status: 400 },
    );
  }
}
