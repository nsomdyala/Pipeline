import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { opportunities as opportunitiesTable } from "@/db/schema";
import { buildSearchText } from "@/lib/opportunities/search-text";
import {
  withOpportunityDefaults,
  type CreateOpportunityInput,
  type Opportunity,
  type OpportunityDocumentLink,
  type OpportunityFile,
  type OppLane,
  type OppSource,
  type OpportunityType,
} from "@/lib/opportunities/types";

type OppRow = typeof opportunitiesTable.$inferSelect;

function asDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function asIso(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString();
}

function rowToOpportunity(row: OppRow): Opportunity {
  return withOpportunityDefaults({
    id: row.id,
    refNo: row.refNo,
    title: row.title,
    description: row.description ?? "",
    buyer: row.buyerName ?? "",
    sector: (row.sector as "public" | "private") || "public",
    source: (row.sourceLabel as OppSource) || "Manual",
    lane: (row.lane as OppLane) || "Other",
    stage: row.stage as Opportunity["stage"],
    closingAt: asIso(row.closingAt) || new Date().toISOString(),
    briefingAt: asIso(row.briefingAt),
    briefingCompulsory: Boolean(row.briefingCompulsory),
    briefingVenue: row.briefingVenue ?? "",
    estimatedValueZar:
      row.estimatedValueZar == null ? null : Number(row.estimatedValueZar),
    sourceUrl: row.sourceUrl ?? "",
    ownerName: row.ownerName ?? "",
    files: [] as OpportunityFile[],
    createdAt: asIso(row.createdAt) || new Date().toISOString(),
    updatedAt: asIso(row.updatedAt) || new Date().toISOString(),
    externalId: row.externalId,
    contentHash: row.contentHash,
    opportunityType: (row.opportunityType as OpportunityType) || "tender",
    isPanel: Boolean(row.isPanel),
    panelMaxParticipants: row.panelMaxParticipants,
    panelTerm: row.panelTerm,
    relevanceScore: row.relevanceScore ?? 0,
    lowRelevance: Boolean(row.lowRelevance),
    isAmended: Boolean(row.isAmended),
    amendedAt: asIso(row.amendedAt) || null,
    province: row.province,
    category: row.category,
    ocdsMainCategory: row.ocdsMainCategory,
    matchVia: row.matchVia as Opportunity["matchVia"],
    documentLinks: (row.documentLinks as OpportunityDocumentLink[]) ?? [],
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    inPipeline: Boolean(row.inPipeline),
    convertedToLeadId: row.convertedToLeadId,
    convertedToAccountId: row.convertedToAccountId,
    searchText: row.searchText ?? "",
  });
}

function toInsertValues(input: CreateOpportunityInput, files: OpportunityFile[] = []) {
  void files;
  const closing =
    asDate(input.closingAt) ?? new Date(Date.now() + 7 * 24 * 3600_000);
  const searchText =
    input.searchText?.trim() ||
    buildSearchText({
      title: input.title,
      description: input.description ?? "",
      buyer: input.buyer,
      refNo: input.refNo,
      externalId: input.externalId,
      province: input.province,
      category: input.category,
    });

  return {
    refNo: input.refNo.trim(),
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    buyerName: input.buyer.trim(),
    sector: input.sector,
    sourceLabel: input.source,
    lane: input.lane,
    stage: input.stage ?? "Spotted",
    closingAt: closing,
    briefingAt: asDate(input.briefingAt),
    briefingCompulsory: Boolean(input.briefingCompulsory),
    briefingVenue: input.briefingVenue?.trim() ?? "",
    estimatedValueZar:
      input.estimatedValueZar == null || Number.isNaN(input.estimatedValueZar)
        ? null
        : String(input.estimatedValueZar),
    sourceUrl: input.sourceUrl?.trim() ?? "",
    ownerName: input.ownerName?.trim() || "Intake",
    externalId: input.externalId?.trim() || null,
    contentHash: input.contentHash ?? null,
    opportunityType: input.opportunityType ?? "tender",
    isPanel: Boolean(input.isPanel ?? input.opportunityType === "panel"),
    panelMaxParticipants: input.panelMaxParticipants ?? null,
    panelTerm: input.panelTerm ?? null,
    relevanceScore: input.relevanceScore ?? 0,
    lowRelevance: Boolean(input.lowRelevance),
    province: input.province ?? null,
    category: input.category ?? null,
    ocdsMainCategory: input.ocdsMainCategory ?? null,
    matchVia: input.matchVia ?? null,
    documentLinks: input.documentLinks ?? [],
    contactName: input.contactName ?? null,
    contactEmail: input.contactEmail ?? null,
    contactPhone: input.contactPhone ?? null,
    inPipeline: Boolean(
      input.inPipeline ??
        (input.source === "Manual" ||
          (!(input.lowRelevance ?? false) && input.lane !== "Other")),
    ),
    searchText,
  };
}

export async function pgListOpportunities(options?: {
  scope?: "all" | "pipeline";
}): Promise<Opportunity[]> {
  const rows =
    options?.scope === "pipeline"
      ? await db
          .select()
          .from(opportunitiesTable)
          .where(eq(opportunitiesTable.inPipeline, true))
          .orderBy(desc(opportunitiesTable.isPanel), opportunitiesTable.closingAt)
      : await db
          .select()
          .from(opportunitiesTable)
          .orderBy(desc(opportunitiesTable.isPanel), opportunitiesTable.closingAt);

  return rows.map(rowToOpportunity);
}

export async function pgGetOpportunity(id: string): Promise<Opportunity | null> {
  const rows = await db
    .select()
    .from(opportunitiesTable)
    .where(eq(opportunitiesTable.id, id))
    .limit(1);
  return rows[0] ? rowToOpportunity(rows[0]) : null;
}

export async function pgFindByExternalId(
  externalId: string,
): Promise<Opportunity | null> {
  const rows = await db
    .select()
    .from(opportunitiesTable)
    .where(eq(opportunitiesTable.externalId, externalId))
    .limit(1);
  return rows[0] ? rowToOpportunity(rows[0]) : null;
}

export async function pgCreateOpportunity(
  input: CreateOpportunityInput,
  files: OpportunityFile[] = [],
): Promise<Opportunity> {
  const [row] = await db
    .insert(opportunitiesTable)
    .values(toInsertValues(input, files))
    .returning();
  return rowToOpportunity(row);
}

export async function pgUpdateOpportunity(
  id: string,
  patch: Partial<Opportunity>,
): Promise<Opportunity | null> {
  const existing = await pgGetOpportunity(id);
  if (!existing) return null;

  const merged = withOpportunityDefaults({
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  const [row] = await db
    .update(opportunitiesTable)
    .set({
      refNo: merged.refNo,
      title: merged.title,
      description: merged.description,
      buyerName: merged.buyer,
      sector: merged.sector,
      sourceLabel: merged.source,
      lane: merged.lane,
      stage: merged.stage,
      closingAt: asDate(merged.closingAt) ?? new Date(),
      briefingAt: asDate(merged.briefingAt),
      briefingCompulsory: merged.briefingCompulsory,
      briefingVenue: merged.briefingVenue,
      estimatedValueZar:
        merged.estimatedValueZar == null
          ? null
          : String(merged.estimatedValueZar),
      sourceUrl: merged.sourceUrl,
      ownerName: merged.ownerName,
      externalId: merged.externalId,
      contentHash: merged.contentHash,
      opportunityType: merged.opportunityType,
      isPanel: merged.isPanel,
      panelMaxParticipants: merged.panelMaxParticipants,
      panelTerm: merged.panelTerm,
      relevanceScore: merged.relevanceScore,
      lowRelevance: merged.lowRelevance,
      isAmended: merged.isAmended,
      amendedAt: asDate(merged.amendedAt),
      province: merged.province,
      category: merged.category,
      ocdsMainCategory: merged.ocdsMainCategory,
      matchVia: merged.matchVia,
      documentLinks: merged.documentLinks,
      contactName: merged.contactName,
      contactEmail: merged.contactEmail,
      contactPhone: merged.contactPhone,
      inPipeline: merged.inPipeline,
      searchText: merged.searchText,
      convertedToLeadId: merged.convertedToLeadId,
      convertedToAccountId: merged.convertedToAccountId,
      updatedAt: new Date(),
    })
    .where(eq(opportunitiesTable.id, id))
    .returning();

  return row ? rowToOpportunity(row) : null;
}

export async function pgPromoteToPipeline(
  id: string,
): Promise<Opportunity | null> {
  return pgUpdateOpportunity(id, { inPipeline: true });
}

export async function pgCountOpportunities(): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(opportunitiesTable);
  return rows[0]?.n ?? 0;
}

/** Drop the partial-unique issue: ensure external_id uniqueness for non-null. */
export async function pgUpsertByExternalId(
  input: CreateOpportunityInput,
): Promise<{ opportunity: Opportunity; created: boolean }> {
  if (!input.externalId?.trim()) {
    return { opportunity: await pgCreateOpportunity(input), created: true };
  }

  const existing = await pgFindByExternalId(input.externalId);
  if (!existing) {
    return { opportunity: await pgCreateOpportunity(input), created: true };
  }

  const updated = await pgUpdateOpportunity(existing.id, {
    ...toDomainPatch(input),
    isAmended: existing.contentHash !== input.contentHash,
    amendedAt:
      existing.contentHash !== input.contentHash
        ? new Date().toISOString()
        : existing.amendedAt,
  });
  return { opportunity: updated!, created: false };
}

function toDomainPatch(input: CreateOpportunityInput): Partial<Opportunity> {
  return {
    refNo: input.refNo,
    title: input.title,
    description: input.description ?? "",
    buyer: input.buyer,
    sector: input.sector,
    source: input.source,
    lane: input.lane,
    stage: input.stage,
    closingAt: input.closingAt,
    briefingAt: input.briefingAt,
    briefingCompulsory: input.briefingCompulsory,
    briefingVenue: input.briefingVenue,
    estimatedValueZar: input.estimatedValueZar ?? null,
    sourceUrl: input.sourceUrl,
    ownerName: input.ownerName,
    externalId: input.externalId ?? null,
    contentHash: input.contentHash ?? null,
    opportunityType: input.opportunityType,
    isPanel: input.isPanel,
    panelMaxParticipants: input.panelMaxParticipants ?? null,
    panelTerm: input.panelTerm ?? null,
    relevanceScore: input.relevanceScore,
    lowRelevance: input.lowRelevance,
    province: input.province ?? null,
    category: input.category ?? null,
    ocdsMainCategory: input.ocdsMainCategory ?? null,
    matchVia: input.matchVia ?? null,
    documentLinks: input.documentLinks,
    contactName: input.contactName ?? null,
    contactEmail: input.contactEmail ?? null,
    contactPhone: input.contactPhone ?? null,
    inPipeline: input.inPipeline,
  };
}

export { and, eq };
