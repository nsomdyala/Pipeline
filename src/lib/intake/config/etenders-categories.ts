import type { OppLane } from "@/lib/opportunities/types";

/**
 * Default eTenders official category → Pipeline lane map.
 * Editable at runtime via Settings (`categoryLaneMap`); this file is the seed only.
 */
export type CategoryLaneMapping = {
  /** Exact `tender.category` label from eTenders OCDS */
  etendersCategory: string;
  lane: Exclude<OppLane, "Other">;
};

export const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
] as const;

export const DEFAULT_CATEGORY_LANE_MAP: CategoryLaneMapping[] = [
  {
    etendersCategory: "Computer programming, consultancy and related activities",
    lane: "ICT / IS",
  },
  {
    etendersCategory: "Information and communication",
    lane: "ICT / IS",
  },
  {
    etendersCategory: "Information service activities",
    lane: "ICT / IS",
  },
  {
    etendersCategory: "Supplies: Computer Equipment",
    lane: "ICT / IS",
  },
  {
    etendersCategory: "Telecommunications",
    lane: "ICT / IS",
  },
  {
    etendersCategory: "Electricity, gas, steam and air conditioning",
    lane: "Solar / electrical",
  },
  {
    etendersCategory: "Supplies: Electrical Equipment",
    lane: "Solar / electrical",
  },
];

export function defaultEtendersCategories(): string[] {
  return DEFAULT_CATEGORY_LANE_MAP.map((m) => m.etendersCategory);
}

export function laneForEtendersCategory(
  category: string | null | undefined,
  map: CategoryLaneMapping[] = DEFAULT_CATEGORY_LANE_MAP,
): Exclude<OppLane, "Other"> | null {
  if (!category?.trim()) return null;
  const needle = category.trim().toLowerCase();
  const hit = map.find((m) => m.etendersCategory.toLowerCase() === needle);
  return hit?.lane ?? null;
}
