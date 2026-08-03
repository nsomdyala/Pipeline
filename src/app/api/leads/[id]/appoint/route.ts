import { NextResponse } from "next/server";
import { appointLeadToAccount } from "@/lib/workflow/conversions";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const result = await appointLeadToAccount(id);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not appoint to Accounts.",
      },
      { status: 400 },
    );
  }
}
