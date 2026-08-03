import "server-only";

import {
  and,
  asc,
  count,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db/client";
import { opportunities as opportunitiesTable } from "@/db/schema";
import {
  deriveTenderStatus,
  type TenderSearchQuery,
  type TenderSearchResult,
} from "@/lib/opportunities/search";
import {
  withOpportunityDefaults,
  type Opportunity,
  type OpportunityDocumentLink,
  type OpportunityFile,
  type OpportunityType,
  type OppLane,
  type OppSource,
} from "@/lib/opportunities/types";

/** Columns needed for All Tenders list rows (skip description / docs blobs). */
const listColumns = {
  id: opportunitiesTable.id,
  refNo: opportunitiesTable.refNo,
  title: opportunitiesTable.title,
  buyerName: opportunitiesTable.buyerName,
  sector: opportunitiesTable.sector,
  sourceLabel: opportunitiesTable.sourceLabel,
  lane: opportunitiesTable.lane,
  stage: opportunitiesTable.stage,
  closingAt: opportunitiesTable.closingAt,
  briefingAt: opportunitiesTable.briefingAt,
  briefingCompulsory: opportunitiesTable.briefingCompulsory,
  estimatedValueZar: opportunitiesTable.estimatedValueZar,
  ownerName: opportunitiesTable.ownerName,
  externalId: opportunitiesTable.externalId,
  opportunityType: opportunitiesTable.opportunityType,
  isPanel: opportunitiesTable.isPanel,
  province: opportunitiesTable.province,
  category: opportunitiesTable.category,
  ocdsMainCategory: opportunitiesTable.ocdsMainCategory,
  lowRelevance: opportunitiesTable.lowRelevance,
  inPipeline: opportunitiesTable.inPipeline,
  convertedToLeadId: opportunitiesTable.convertedToLeadId,
  convertedToAccountId: opportunitiesTable.convertedToAccountId,
  createdAt: opportunitiesTable.createdAt,
  updatedAt: opportunitiesTable.updatedAt,
  searchText: opportunitiesTable.searchText,
};

type ListRow = {
  id: string;
  refNo: string;
  title: string;
  buyerName: string | null;
  sector: string;
  sourceLabel: string;
  lane: string;
  stage: string;
  closingAt: Date;
  briefingAt: Date | null;
  briefingCompulsory: boolean;
  estimatedValueZar: string | null;
  ownerName: string | null;
  externalId: string | null;
  opportunityType: string;
  isPanel: boolean;
  province: string | null;
  category: string | null;
  ocdsMainCategory: string | null;
  lowRelevance: boolean;
  inPipeline: boolean;
  convertedToLeadId: string | null;
  convertedToAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
  searchText: string | null;
};

function asIso(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString();
}

function listRowToOpportunity(row: ListRow): Opportunity {
  return withOpportunityDefaults({
    id: row.id,
    refNo: row.refNo,
    title: row.title,
    description: "",
    buyer: row.buyerName ?? "",
    sector: (row.sector as "public" | "private") || "public",
    source: (row.sourceLabel as OppSource) || "Manual",
    lane: (row.lane as OppLane) || "Other",
    stage: row.stage as Opportunity["stage"],
    closingAt: asIso(row.closingAt) || new Date().toISOString(),
    briefingAt: asIso(row.briefingAt),
    briefingCompulsory: Boolean(row.briefingCompulsory),
    briefingVenue: "",
    estimatedValueZar:
      row.estimatedValueZar == null ? null : Number(row.estimatedValueZar),
    sourceUrl: "",
    ownerName: row.ownerName ?? "",
    files: [] as OpportunityFile[],
    createdAt: asIso(row.createdAt) || new Date().toISOString(),
    updatedAt: asIso(row.updatedAt) || new Date().toISOString(),
    externalId: row.externalId,
    contentHash: null,
    opportunityType: (row.opportunityType as OpportunityType) || "tender",
    isPanel: Boolean(row.isPanel),
    panelMaxParticipants: null,
    panelTerm: null,
    relevanceScore: 0,
    lowRelevance: Boolean(row.lowRelevance),
    isAmended: false,
    amendedAt: null,
    province: row.province,
    category: row.category,
    ocdsMainCategory: row.ocdsMainCategory,
    matchVia: null,
    documentLinks: [] as OpportunityDocumentLink[],
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    inPipeline: Boolean(row.inPipeline),
    convertedToLeadId: row.convertedToLeadId,
    convertedToAccountId: row.convertedToAccountId,
    searchText: row.searchText ?? "",
  });
}

function buildWhere(query: TenderSearchQuery): SQL | undefined {
  const includeClosed = query.includeClosed ?? false;
  const openOnly = query.openOnly ?? !includeClosed;
  const parts: SQL[] = [
    eq(opportunitiesTable.inPipeline, false),
    or(
      eq(opportunitiesTable.sourceLabel, "eTenders"),
      sql`${opportunitiesTable.externalId} is not null`,
    )!,
  ];

  if (query.q?.trim()) {
    const tokens = query.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      const safe = token.replace(/[%_]/g, "");
      if (safe) {
        parts.push(ilike(opportunitiesTable.searchText, `%${safe}%`));
      }
    }
  }

  const provinces = [
    ...(query.provinces ?? []),
    ...(query.province ? [query.province] : []),
  ].filter(Boolean);
  if (provinces.length > 0) {
    parts.push(
      sql`lower(trim(coalesce(${opportunitiesTable.province}, ''))) in (${sql.join(
        provinces.map((p) => sql`${p.toLowerCase()}`),
        sql`, `,
      )})`,
    );
  }

  const categories = [
    ...(query.categories ?? []),
    ...(query.category ? [query.category] : []),
  ].filter(Boolean);
  if (categories.length > 0) {
    parts.push(
      sql`lower(trim(coalesce(${opportunitiesTable.category}, ''))) in (${sql.join(
        categories.map((c) => sql`${c.toLowerCase()}`),
        sql`, `,
      )})`,
    );
  }

  const excludeCategories = (query.excludeCategories ?? []).filter(Boolean);
  if (excludeCategories.length > 0) {
    parts.push(
      sql`lower(trim(coalesce(${opportunitiesTable.category}, ''))) not in (${sql.join(
        excludeCategories.map((c) => sql`${c.toLowerCase()}`),
        sql`, `,
      )})`,
    );
  }

  if (query.opportunityType && query.opportunityType !== "all") {
    if (query.opportunityType === "panel") {
      parts.push(eq(opportunitiesTable.isPanel, true));
    } else {
      parts.push(eq(opportunitiesTable.opportunityType, query.opportunityType));
    }
  }

  if (query.buyer?.trim()) {
    parts.push(ilike(opportunitiesTable.buyerName, `%${query.buyer.trim()}%`));
  }

  if (query.closingFrom) {
    const from = new Date(query.closingFrom);
    if (!Number.isNaN(from.getTime())) {
      parts.push(gte(opportunitiesTable.closingAt, from));
    }
  }
  if (query.closingTo) {
    const to = new Date(query.closingTo);
    if (!Number.isNaN(to.getTime())) {
      parts.push(lte(opportunitiesTable.closingAt, to));
    }
  }

  if (query.isPanel === true) parts.push(eq(opportunitiesTable.isPanel, true));
  if (query.isPanel === false) parts.push(eq(opportunitiesTable.isPanel, false));

  if (query.lane && query.lane !== "all") {
    if (query.lane === "Other / unmatched") {
      parts.push(
        or(
          eq(opportunitiesTable.lane, "Other"),
          eq(opportunitiesTable.lowRelevance, true),
        )!,
      );
    } else {
      parts.push(eq(opportunitiesTable.lane, query.lane));
    }
  }

  const now = new Date();
  if (query.status === "awarded") {
    parts.push(
      inArray(opportunitiesTable.stage, [
        "Awarded",
        "Closed (Won)",
        "Active account",
      ]),
    );
  } else if (query.status === "closed") {
    parts.push(
      or(
        sql`${opportunitiesTable.stage} like 'Closed%'`,
        and(
          lte(opportunitiesTable.closingAt, now),
          notInArray(opportunitiesTable.stage, [
            "Awarded",
            "Closed (Won)",
            "Active account",
          ]),
        ),
      )!,
    );
  } else if (query.status === "closing_soon") {
    const soon = new Date(now.getTime() + 14 * 24 * 3600_000);
    parts.push(gt(opportunitiesTable.closingAt, now));
    parts.push(lte(opportunitiesTable.closingAt, soon));
    parts.push(ne(opportunitiesTable.stage, "Awarded"));
    parts.push(sql`${opportunitiesTable.stage} not like 'Closed%'`);
  } else if (query.status === "open" || openOnly) {
    parts.push(gt(opportunitiesTable.closingAt, now));
    parts.push(ne(opportunitiesTable.stage, "Awarded"));
    parts.push(sql`${opportunitiesTable.stage} not like 'Closed%'`);
  }

  return and(...parts);
}

/**
 * Paginated All Tenders search in Postgres — never loads the full table.
 */
export async function pgSearchTenders(
  query: TenderSearchQuery,
): Promise<TenderSearchResult> {
  const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 100);
  const page = Math.max(query.page ?? 1, 1);
  const where = buildWhere(query);

  const [{ total }] = await db
    .select({ total: count() })
    .from(opportunitiesTable)
    .where(where);

  const totalN = Number(total) || 0;
  const pageCount = Math.max(1, Math.ceil(totalN / pageSize));
  const safePage = Math.min(page, pageCount);
  const offset = (safePage - 1) * pageSize;

  const rows = await db
    .select(listColumns)
    .from(opportunitiesTable)
    .where(where)
    .orderBy(asc(opportunitiesTable.closingAt))
    .limit(pageSize)
    .offset(offset);

  let items = rows.map((row) => listRowToOpportunity(row as ListRow));

  // Refine closing_soon with working-day helper (SQL used a 14-day window).
  if (query.status === "closing_soon") {
    items = items.filter((item) => deriveTenderStatus(item) === "closing_soon");
  }

  const [provinceRows, categoryRows, buyerRows] = await Promise.all([
    db
      .selectDistinct({ v: opportunitiesTable.province })
      .from(opportunitiesTable)
      .where(eq(opportunitiesTable.inPipeline, false))
      .limit(80),
    db
      .selectDistinct({ v: opportunitiesTable.category })
      .from(opportunitiesTable)
      .where(eq(opportunitiesTable.inPipeline, false))
      .limit(120),
    db
      .selectDistinct({ v: opportunitiesTable.buyerName })
      .from(opportunitiesTable)
      .where(eq(opportunitiesTable.inPipeline, false))
      .limit(200),
  ]);

  return {
    items,
    total: totalN,
    page: safePage,
    pageSize,
    pageCount,
    facets: {
      provinces: provinceRows
        .map((r) => r.v)
        .filter((v): v is string => Boolean(v?.trim()))
        .sort((a, b) => a.localeCompare(b)),
      categories: categoryRows
        .map((r) => r.v)
        .filter((v): v is string => Boolean(v?.trim()))
        .sort((a, b) => a.localeCompare(b)),
      buyers: buyerRows
        .map((r) => r.v)
        .filter((v): v is string => Boolean(v?.trim()))
        .sort((a, b) => a.localeCompare(b)),
    },
  };
}
