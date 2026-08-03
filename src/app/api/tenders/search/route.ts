import { NextResponse } from "next/server";
import {
  DEFAULT_CATEGORY_LANE_MAP,
  defaultEtendersCategories,
} from "@/lib/intake/config/etenders-categories";
import { listOpportunities } from "@/lib/opportunities/store";
import {
  searchTenders,
  type TenderSearchQuery,
  type TenderStatusFilter,
} from "@/lib/opportunities/search";
import { OPP_LANES, type OppLane } from "@/lib/opportunities/types";

export const runtime = "nodejs";
export const maxDuration = 15;

function parseBool(value: string | null): boolean | null {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

function multi(searchParams: URLSearchParams, key: string): string[] {
  const all = searchParams
    .getAll(key)
    .flatMap((v) => v.split("|"))
    .map((v) => v.trim());
  return all.filter(Boolean);
}

function emptyPayload(error: string) {
  return {
    error,
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    pageCount: 1,
    facets: { provinces: [], categories: [], buyers: [] },
    scope: "defaults" as const,
    defaultCategories: defaultEtendersCategories(),
    categoryLaneMap: DEFAULT_CATEGORY_LANE_MAP,
  };
}

async function resolveDefaultCategories(): Promise<string[]> {
  try {
    if (process.env.DATABASE_URL) {
      return defaultEtendersCategories();
    }
    const { getSettings } = await import("@/lib/settings/store");
    const settings = await getSettings();
    if (settings.defaultEtendersCategories?.length) {
      return settings.defaultEtendersCategories;
    }
  } catch {
    // fall through
  }
  return defaultEtendersCategories();
}

/**
 * All Tenders search — Postgres only. Never talks to eTenders.
 * Intake is exclusively via /api/cron/intake/etenders (and manual intake API).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const laneRaw = searchParams.get("lane") ?? "all";
    const statusRaw = searchParams.get("status") ?? "all";
    const includeClosed = parseBool(searchParams.get("includeClosed")) === true;
    const typeRaw = searchParams.get("type") ?? "all";
    const scope =
      searchParams.get("scope") === "beyond_defaults"
        ? "beyond_defaults"
        : "defaults";

    const defaults = await resolveDefaultCategories();

    const query: TenderSearchQuery = {
      q: searchParams.get("q") ?? undefined,
      provinces: multi(searchParams, "province"),
      categories:
        scope === "defaults" ? defaults : multi(searchParams, "category"),
      excludeCategories: scope === "beyond_defaults" ? defaults : [],
      buyer: searchParams.get("buyer") ?? undefined,
      closingFrom: searchParams.get("closingFrom") ?? undefined,
      closingTo: searchParams.get("closingTo") ?? undefined,
      status: statusRaw === "all" ? "all" : (statusRaw as TenderStatusFilter),
      lane:
        laneRaw === "all" || laneRaw === "Other / unmatched"
          ? (laneRaw as "all" | "Other / unmatched")
          : (OPP_LANES as readonly string[]).includes(laneRaw)
            ? (laneRaw as OppLane)
            : "all",
      opportunityType:
        typeRaw === "tender" || typeRaw === "rfq" || typeRaw === "panel"
          ? typeRaw
          : "all",
      isPanel: parseBool(searchParams.get("isPanel")),
      includeClosed,
      openOnly: !includeClosed && statusRaw === "all",
      page: Number(searchParams.get("page") ?? "1") || 1,
      pageSize: Number(searchParams.get("pageSize") ?? "25") || 25,
    };

    let all;
    try {
      all = await listOpportunities({ scope: "all" });
    } catch (err) {
      console.error("listOpportunities failed in tenders search", err);
      const message =
        err instanceof Error
          ? err.message
          : "Could not read tenders from the database.";
      return NextResponse.json(emptyPayload(message), { status: 500 });
    }

    const result = searchTenders(all, query);
    const notice =
      all.length === 0
        ? "No tenders synced yet. The scheduled eTenders intake job will populate this list — it is not fetched on page load."
        : undefined;

    return NextResponse.json({
      ...result,
      scope,
      defaultCategories: defaults,
      categoryLaneMap: DEFAULT_CATEGORY_LANE_MAP,
      ...(notice ? { notice } : {}),
    });
  } catch (err) {
    console.error("tenders search failed", err);
    const message =
      err instanceof Error
        ? err.message
        : "Tender search failed. Check DATABASE_URL.";
    return NextResponse.json(emptyPayload(message), { status: 500 });
  }
}
