import { NextResponse } from "next/server";
import { getOpportunity } from "@/lib/opportunities/store";

export const runtime = "nodejs";
export const maxDuration = 15;

type Params = { params: Promise<{ id: string }> };

/**
 * Load a tender from Postgres only (by UUID id or OCID / externalId).
 * Never calls the eTenders OCDS API.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const opportunity = await getOpportunity(id);
    if (!opportunity) {
      return NextResponse.json(
        {
          error:
            "This tender is not in Pipeline yet. It will appear after the next scheduled eTenders sync.",
          code: "not_synced",
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ opportunity });
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
