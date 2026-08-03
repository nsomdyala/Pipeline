import { workingDaysUntil } from "@/lib/opportunities/dates";
import { buildSearchText } from "@/lib/opportunities/search-text";
import type { OppLane, Opportunity } from "@/lib/opportunities/types";

export { buildSearchText } from "@/lib/opportunities/search-text";

export type TenderStatusFilter =
  | "open"
  | "closing_soon"
  | "closed"
  | "awarded";

export type TenderSearchQuery = {
  q?: string;
  /** Multi-select provinces; empty / omit = all */
  provinces?: string[];
  province?: string;
  /** Multi-select eTenders category labels; empty / omit = all */
  categories?: string[];
  category?: string;
  /** Exclude these categories (search outside our defaults). */
  excludeCategories?: string[];
  buyer?: string;
  closingFrom?: string;
  closingTo?: string;
  status?: TenderStatusFilter | "all";
  lane?: OppLane | "Other / unmatched" | "all";
  opportunityType?: "tender" | "rfq" | "rfp" | "panel" | "all";
  isPanel?: boolean | null;
  /** Default true: only closingAt in the future (and not awarded/closed stage). */
  openOnly?: boolean;
  includeClosed?: boolean;
  page?: number;
  pageSize?: number;
};

export type TenderSearchResult = {
  items: Opportunity[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  facets: {
    provinces: string[];
    categories: string[];
    buyers: string[];
  };
};

export function deriveTenderStatus(item: Opportunity): TenderStatusFilter {
  if (
    item.stage === "Awarded" ||
    item.stage === "Closed (Won)" ||
    item.stage === "Active account"
  ) {
    return "awarded";
  }
  if (item.stage.startsWith("Closed") || item.stage === "Closed (Lost)") {
    return "closed";
  }
  const closing = new Date(item.closingAt).getTime();
  if (!Number.isNaN(closing) && closing < Date.now()) {
    return "closed";
  }
  if (workingDaysUntil(item.closingAt) < 3) {
    return "closing_soon";
  }
  return "open";
}

function matchesQuery(item: Opportunity, q: string): boolean {
  if (!q) return true;
  const haystack = (item.searchText || buildSearchText(item)).toLowerCase();
  const tokens = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

function uniqueSorted(values: (string | null | undefined)[]) {
  return [...new Set(values.filter((v): v is string => Boolean(v && v.trim())))].sort(
    (a, b) => a.localeCompare(b),
  );
}

/**
 * Search the stored release set (file-backed today).
 * When Postgres lands, swap the body for `to_tsvector` / GIN (see docs/sql/).
 */
export function searchTenders(
  all: Opportunity[],
  query: TenderSearchQuery,
): TenderSearchResult {
  const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 100);
  const page = Math.max(query.page ?? 1, 1);
  const includeClosed = query.includeClosed ?? false;
  const openOnly = query.openOnly ?? !includeClosed;

  // All Tenders = eTenders releases not yet moved to the Opportunities board.
  let rows = all.filter(
    (item) =>
      (item.source === "eTenders" || item.externalId) && !item.inPipeline,
  );

  if (query.q?.trim()) {
    rows = rows.filter((item) => matchesQuery(item, query.q!.trim()));
  }
  const provinces = [
    ...(query.provinces ?? []),
    ...(query.province ? [query.province] : []),
  ].filter(Boolean);
  if (provinces.length > 0) {
    const set = new Set(provinces.map((p) => p.toLowerCase()));
    rows = rows.filter((item) => set.has((item.province ?? "").toLowerCase()));
  }

  const categories = [
    ...(query.categories ?? []),
    ...(query.category ? [query.category] : []),
  ].filter(Boolean);
  if (categories.length > 0) {
    const set = new Set(categories.map((c) => c.toLowerCase()));
    rows = rows.filter((item) => set.has((item.category ?? "").toLowerCase()));
  }
  const excludeCategories = (query.excludeCategories ?? []).filter(Boolean);
  if (excludeCategories.length > 0) {
    const set = new Set(excludeCategories.map((c) => c.toLowerCase()));
    rows = rows.filter(
      (item) => !set.has((item.category ?? "").toLowerCase()),
    );
  }
  if (query.opportunityType && query.opportunityType !== "all") {
    rows = rows.filter((item) => {
      if (query.opportunityType === "panel") return item.isPanel;
      return item.opportunityType === query.opportunityType;
    });
  }
  if (query.buyer) {
    rows = rows.filter((item) =>
      item.buyer.toLowerCase().includes(query.buyer!.toLowerCase()),
    );
  }
  if (query.closingFrom) {
    const from = new Date(query.closingFrom).getTime();
    rows = rows.filter((item) => new Date(item.closingAt).getTime() >= from);
  }
  if (query.closingTo) {
    const to = new Date(query.closingTo).getTime();
    rows = rows.filter((item) => new Date(item.closingAt).getTime() <= to);
  }
  if (query.isPanel === true) {
    rows = rows.filter((item) => item.isPanel);
  } else if (query.isPanel === false) {
    rows = rows.filter((item) => !item.isPanel);
  }
  if (query.lane && query.lane !== "all") {
    if (query.lane === "Other / unmatched") {
      rows = rows.filter(
        (item) => item.lane === "Other" || item.lowRelevance,
      );
    } else {
      rows = rows.filter((item) => item.lane === query.lane);
    }
  }

  if (query.status && query.status !== "all") {
    rows = rows.filter((item) => deriveTenderStatus(item) === query.status);
  } else if (openOnly) {
    rows = rows.filter((item) => {
      const status = deriveTenderStatus(item);
      return status === "open" || status === "closing_soon";
    });
  }

  rows.sort(
    (a, b) =>
      new Date(a.closingAt).getTime() - new Date(b.closingAt).getTime(),
  );

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);

  return {
    items,
    total,
    page: safePage,
    pageSize,
    pageCount,
    facets: {
      provinces: uniqueSorted(all.map((i) => i.province)),
      categories: uniqueSorted(all.map((i) => i.category)),
      buyers: uniqueSorted(all.map((i) => i.buyer)).slice(0, 200),
    },
  };
}

export const PIPELINE_LANES: OppLane[] = [
  "ICT / IS",
  "Website",
  "Asset management",
  "Solar / electrical",
];

export function isOnPipelineBoard(item: Opportunity): boolean {
  return item.inPipeline === true;
}
