import { NextResponse } from "next/server";
import { getOpportunity } from "@/lib/opportunities/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const opportunity = await getOpportunity(id);
  if (!opportunity) {
    return NextResponse.json({ error: "Tender not found." }, { status: 404 });
  }
  return NextResponse.json({ opportunity });
}
