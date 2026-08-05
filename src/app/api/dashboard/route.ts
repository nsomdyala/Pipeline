import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { getDashboardSnapshot } from "@/lib/dashboard/get-dashboard";
import type { DashboardFilters } from "@/lib/dashboard/types";
import { ACCOUNT_LANES } from "@/lib/accounts/types";
import { LEAD_LANES } from "@/lib/leads/types";

const LANES = Array.from(new Set([...LEAD_LANES, ...ACCOUNT_LANES]));

export async function GET(request: Request) {
  const auth = await requirePermission("dashboard", "view");
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { searchParams } = new URL(request.url);
  const laneRaw = searchParams.get("lane") ?? "";
  const sectorRaw = searchParams.get("sector") ?? "";
  const filters: DashboardFilters = {
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    accountId: searchParams.get("accountId") ?? undefined,
    lane: LANES.includes(laneRaw as (typeof LANES)[number])
      ? laneRaw
      : undefined,
    sector:
      sectorRaw === "public" || sectorRaw === "private" ? sectorRaw : "",
    owner: searchParams.get("owner") ?? undefined,
  };

  try {
    const snapshot = await getDashboardSnapshot(session, filters);
    if (!snapshot) {
      return NextResponse.json(
        { error: "Dashboard is not available for this role." },
        { status: 403 },
      );
    }
    return NextResponse.json({ dashboard: snapshot });
  } catch (err) {
    console.error("[api/dashboard]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not load dashboard snapshot.",
      },
      { status: 500 },
    );
  }
}
