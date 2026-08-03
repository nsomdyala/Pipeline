import { NextResponse } from "next/server";
import { OPP_LANES } from "@/lib/opportunities/types";
import { getSettings, saveCategoryConfig } from "@/lib/settings/store";
import type { SettingsBundle } from "@/lib/settings/types";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    categoryLaneMap: settings.categoryLaneMap,
    defaultEtendersCategories: settings.defaultEtendersCategories,
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    categoryLaneMap?: SettingsBundle["categoryLaneMap"];
    defaultEtendersCategories?: string[];
  };

  if (!Array.isArray(body.categoryLaneMap)) {
    return NextResponse.json(
      { error: "categoryLaneMap array is required." },
      { status: 400 },
    );
  }

  const allowed = new Set(OPP_LANES.filter((l) => l !== "Other"));
  for (const row of body.categoryLaneMap) {
    if (!row?.etendersCategory?.trim() || !allowed.has(row.lane)) {
      return NextResponse.json(
        { error: "Each mapping needs an eTenders category and a valid lane." },
        { status: 400 },
      );
    }
  }

  const map = body.categoryLaneMap.map((row) => ({
    etendersCategory: row.etendersCategory.trim(),
    lane: row.lane,
  }));
  const defaults =
    body.defaultEtendersCategories?.map((c) => c.trim()).filter(Boolean) ??
    map.map((m) => m.etendersCategory);

  const settings = await saveCategoryConfig({
    categoryLaneMap: map,
    defaultEtendersCategories: defaults,
  });
  return NextResponse.json(settings);
}
