import { NextResponse } from "next/server";
import { getOpportunity } from "@/lib/opportunities/store";
import { enrichTenderDocuments } from "@/lib/tenders/enrich-documents";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const opportunity = await getOpportunity(id);
    if (!opportunity) {
      return NextResponse.json({ error: "Tender not found." }, { status: 404 });
    }
    const enriched = await enrichTenderDocuments(opportunity);
    return NextResponse.json({ opportunity: enriched });
  } catch (err) {
    console.error("tender detail failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not load tender.",
      },
      { status: 500 },
    );
  }
}
