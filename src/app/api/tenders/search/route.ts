import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings/store";
import { listOpportunities } from "@/lib/opportunities/store";
import {
  searchTenders,
  type TenderSearchQuery,
  type TenderStatusFilter,
} from "@/lib/opportunities/search";
import { OPP_LANES, type OppLane } from "@/lib/opportunities/types";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const laneRaw = searchParams.get("lane") ?? "all";
  const statusRaw = searchParams.get("status") ?? "all";
  const includeClosed = parseBool(searchParams.get("includeClosed")) === true;
  const typeRaw = searchParams.get("type") ?? "all";
  const scope =
    searchParams.get("scope") === "beyond_defaults"
      ? "beyond_defaults"
      : "defaults";

  const settings = await getSettings();
  const defaults = settings.defaultEtendersCategories ?? [];

  const query: TenderSearchQuery = {
    q: searchParams.get("q") ?? undefined,
    provinces: multi(searchParams, "province"),
    categories: scope === "defaults" ? defaults : multi(searchParams, "category"),
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

  const all = await listOpportunities({ scope: "all" });
  const result = searchTenders(all, query);
  return NextResponse.json({
    ...result,
    scope,
    defaultCategories: defaults,
  });
}
