import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { NormalisedOpportunity } from "@/lib/intake/types";
import { seedOpportunities } from "@/lib/opportunities/seed";
import { buildSearchText } from "@/lib/opportunities/search-text";
import { isOnPipelineBoard } from "@/lib/opportunities/search";
import {
  OPP_SOURCES,
  withOpportunityDefaults,
  type CreateOpportunityInput,
  type OppLane,
  type OppSource,
  type Opportunity,
  type OpportunityFile,
  type OpportunityType,
} from "@/lib/opportunities/types";

function toOppSource(label: string): OppSource {
  if ((OPP_SOURCES as readonly string[]).includes(label)) {
    return label as OppSource;
  }
  return "Manual";
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "opportunities.json");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

const SEED_OWNERS: Record<string, string> = {
  "seed-saqa-asset": "Ndumiso Somdyala",
  "seed-gep-web": "Bid Team Member",
  "seed-sita-ict": "Bid Team Member",
  "seed-eskom-solar": "Thandi Molefe",
  "seed-sap-private": "Ndumiso Somdyala",
  "seed-etenders-ict-rfq": "Intake",
  "seed-etenders-ict-panel": "Intake",
};

function applySeedOwners(items: Opportunity[]) {
  let changed = false;
  const next = items.map((item) => {
    const owner = SEED_OWNERS[item.id];
    if (!owner || item.ownerName === owner) return item;
    changed = true;
    return { ...item, ownerName: owner };
  });
  return { items: next, changed };
}

function migrate(items: Opportunity[]) {
  const withDefaults = items.map((item) => withOpportunityDefaults(item));
  const { items: withOwners, changed: ownersChanged } =
    applySeedOwners(withDefaults);

  const byId = new Map(withOwners.map((i) => [i.id, i]));
  const seeded = seedOpportunities();
  let changed = ownersChanged;

  // Keep demo submissions visible on the team hub
  for (const seedId of ["seed-gep-web", "seed-sap-private"] as const) {
    const existing = byId.get(seedId);
    const seed = seeded.find((s) => s.id === seedId);
    if (existing && seed && existing.stage !== "Submitted") {
      byId.set(seedId, {
        ...existing,
        stage: "Submitted",
        estimatedValueZar: seed.estimatedValueZar,
      });
      changed = true;
    }
  }

  for (const seed of seeded) {
    if (
      seed.id === "seed-etenders-ict-rfq" ||
      seed.id === "seed-etenders-ict-panel"
    ) {
      const existing = byId.get(seed.id);
      if (!existing) {
        byId.set(seed.id, seed);
        changed = true;
      } else if (
        existing.category !== seed.category ||
        existing.matchVia !== seed.matchVia
      ) {
        byId.set(seed.id, {
          ...existing,
          category: seed.category,
          ocdsMainCategory: seed.ocdsMainCategory,
          matchVia: seed.matchVia,
          lane: seed.lane,
          inPipeline: seed.inPipeline,
          contentHash: seed.contentHash,
        });
        changed = true;
      }
    }
  }

  return { items: [...byId.values()], changed };
}

async function ensureStore(): Promise<Opportunity[]> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Opportunity[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      const { items, changed } = migrate(parsed);
      if (changed) {
        await writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
      }
      return items;
    }
  } catch {
    // first run
  }
  const seeded = seedOpportunities();
  await writeFile(DATA_FILE, JSON.stringify(seeded, null, 2), "utf8");
  return seeded;
}

async function save(items: Opportunity[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

function usePostgres() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function listOpportunities(options?: {
  scope?: "all" | "pipeline";
}): Promise<Opportunity[]> {
  if (usePostgres()) {
    const { pgListOpportunities } = await import(
      "@/lib/opportunities/pg-store"
    );
    return pgListOpportunities(options);
  }
  const items = await ensureStore();
  let list = items.map((i) => withOpportunityDefaults(i));
  if (options?.scope === "pipeline") {
    list = list.filter(isOnPipelineBoard);
  }
  return list.sort((a, b) => {
    if (a.isPanel !== b.isPanel) return a.isPanel ? -1 : 1;
    return new Date(a.closingAt).getTime() - new Date(b.closingAt).getTime();
  });
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/** Resolve by UUID id, or by OCID / externalId when the path uses that key. */
export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const key = id.trim();
  if (!key) return null;

  if (usePostgres()) {
    const { pgGetOpportunity, pgFindByExternalId } = await import(
      "@/lib/opportunities/pg-store"
    );
    if (looksLikeUuid(key)) {
      const byId = await pgGetOpportunity(key);
      if (byId) return byId;
    }
    return pgFindByExternalId(key);
  }

  const items = await ensureStore();
  const found = items.find(
    (item) => item.id === key || item.externalId === key,
  );
  return found ? withOpportunityDefaults(found) : null;
}

export async function findByExternalId(
  externalId: string,
): Promise<Opportunity | null> {
  if (usePostgres()) {
    const { pgFindByExternalId } = await import(
      "@/lib/opportunities/pg-store"
    );
    return pgFindByExternalId(externalId);
  }
  const items = await ensureStore();
  const found = items.find((item) => item.externalId === externalId);
  return found ? withOpportunityDefaults(found) : null;
}

export async function findByExternalIds(
  externalIds: string[],
): Promise<Map<string, Opportunity>> {
  if (usePostgres()) {
    const { pgFindByExternalIds } = await import(
      "@/lib/opportunities/pg-store"
    );
    return pgFindByExternalIds(externalIds);
  }
  const items = await ensureStore();
  const map = new Map<string, Opportunity>();
  const wanted = new Set(externalIds);
  for (const item of items) {
    if (item.externalId && wanted.has(item.externalId)) {
      map.set(item.externalId, withOpportunityDefaults(item));
    }
  }
  return map;
}

export async function createOpportunity(
  input: CreateOpportunityInput,
  files: OpportunityFile[] = [],
): Promise<Opportunity> {
  if (usePostgres()) {
    const { pgCreateOpportunity } = await import(
      "@/lib/opportunities/pg-store"
    );
    return pgCreateOpportunity(input, files);
  }
  const now = new Date().toISOString();
  const opportunity = withOpportunityDefaults({
    id: randomUUID(),
    refNo: input.refNo.trim(),
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    buyer: input.buyer.trim(),
    sector: input.sector,
    source: input.source,
    lane: input.lane,
    stage: input.stage ?? "Spotted",
    closingAt: input.closingAt,
    briefingAt: input.briefingAt?.trim() ?? "",
    briefingCompulsory: Boolean(input.briefingCompulsory),
    briefingVenue: input.briefingVenue?.trim() ?? "",
    estimatedValueZar:
      input.estimatedValueZar == null || Number.isNaN(input.estimatedValueZar)
        ? null
        : input.estimatedValueZar,
    sourceUrl: input.sourceUrl?.trim() ?? "",
    ownerName: input.ownerName?.trim() || "Ndumiso Somdyala",
    files,
    createdAt: now,
    updatedAt: now,
    externalId: input.externalId ?? null,
    contentHash: input.contentHash ?? null,
    opportunityType: input.opportunityType ?? "tender",
    isPanel: input.isPanel ?? input.opportunityType === "panel",
    panelMaxParticipants: input.panelMaxParticipants ?? null,
    panelTerm: input.panelTerm ?? null,
    relevanceScore: input.relevanceScore ?? 0,
    lowRelevance: input.lowRelevance ?? false,
    province: input.province ?? null,
    category: input.category ?? null,
    ocdsMainCategory: input.ocdsMainCategory ?? null,
    matchVia: input.matchVia ?? null,
    documentLinks: input.documentLinks ?? [],
    contactName: input.contactName ?? null,
    contactEmail: input.contactEmail ?? null,
    contactPhone: input.contactPhone ?? null,
    inPipeline:
      input.inPipeline !== undefined
        ? Boolean(input.inPipeline)
        : input.source === "Manual",
    searchText: buildSearchText({
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      buyer: input.buyer.trim(),
      refNo: input.refNo.trim(),
      externalId: input.externalId,
      province: input.province,
      category: input.category,
    }),
  });

  const items = await ensureStore();
  items.unshift(opportunity);
  await save(items);
  return opportunity;
}

type IntakeUpsertFields = {
  normalised: NormalisedOpportunity;
  lane: OppLane;
  relevanceScore: number;
  lowRelevance: boolean;
  matchVia: "category" | "keyword" | "none";
  opportunityType: OpportunityType;
  isPanel: boolean;
  panelMaxParticipants: number | null;
  panelTerm: string | null;
};

function intakeFieldsToCreateInput(
  fields: IntakeUpsertFields,
): CreateOpportunityInput {
  const { normalised: n } = fields;
  return {
    refNo: n.refNo,
    title: n.title,
    description: n.description,
    buyer: n.buyer,
    sector: n.sector,
    source: toOppSource(n.sourceLabel),
    lane: fields.lane,
    stage: "Spotted",
    closingAt: n.closingAt ?? new Date().toISOString(),
    briefingAt: n.briefing?.date ?? "",
    briefingCompulsory: Boolean(n.briefing?.compulsory),
    briefingVenue: n.briefing?.venue ?? "",
    estimatedValueZar: n.estimatedValue,
    sourceUrl: n.sourceUrl,
    ownerName: "Intake",
    externalId: n.externalId,
    contentHash: n.contentHash,
    opportunityType: fields.opportunityType,
    isPanel: fields.isPanel,
    panelMaxParticipants: fields.panelMaxParticipants,
    panelTerm: fields.panelTerm,
    relevanceScore: fields.relevanceScore,
    lowRelevance: fields.lowRelevance,
    province: n.province,
    category: n.category,
    ocdsMainCategory: n.ocdsMainCategory,
    matchVia: fields.matchVia,
    documentLinks: n.documents,
    contactName: n.contact?.name ?? null,
    contactEmail: n.contact?.email ?? null,
    contactPhone: n.contact?.telephone ?? null,
    // Intake stores every release for All Tenders. Opportunities only after
    // an explicit "Move to Opportunities" action (or manual add).
    inPipeline: false,
  };
}

export async function createOpportunityFromIntake(
  fields: IntakeUpsertFields,
): Promise<Opportunity> {
  return createOpportunity(intakeFieldsToCreateInput(fields));
}

/** Batch-create intake rows (Postgres). Falls back to sequential for JSON store. */
export async function createOpportunitiesFromIntake(
  fieldsList: IntakeUpsertFields[],
): Promise<Opportunity[]> {
  if (fieldsList.length === 0) return [];
  const inputs = fieldsList.map(intakeFieldsToCreateInput);
  if (usePostgres()) {
    const { pgCreateOpportunities } = await import(
      "@/lib/opportunities/pg-store"
    );
    return pgCreateOpportunities(inputs);
  }
  const created: Opportunity[] = [];
  for (const input of inputs) {
    created.push(await createOpportunity(input));
  }
  return created;
}

export async function updateOpportunityFromIntake(
  id: string,
  fields: IntakeUpsertFields,
): Promise<Opportunity | null> {
  if (usePostgres()) {
    const { pgUpdateOpportunity, pgGetOpportunity } = await import(
      "@/lib/opportunities/pg-store"
    );
    const prev = await pgGetOpportunity(id);
    if (!prev) return null;
    const n = fields.normalised;
    return pgUpdateOpportunity(id, {
      refNo: n.refNo,
      title: n.title,
      description: n.description,
      buyer: n.buyer,
      sector: n.sector,
      source: toOppSource(n.sourceLabel),
      lane: fields.lane,
      closingAt: n.closingAt ?? prev.closingAt,
      briefingAt: n.briefing?.date ?? "",
      briefingCompulsory: Boolean(n.briefing?.compulsory),
      briefingVenue: n.briefing?.venue ?? "",
      estimatedValueZar: n.estimatedValue,
      sourceUrl: n.sourceUrl,
      externalId: n.externalId,
      contentHash: n.contentHash,
      opportunityType: fields.opportunityType,
      isPanel: fields.isPanel,
      panelMaxParticipants: fields.panelMaxParticipants,
      panelTerm: fields.panelTerm,
      relevanceScore: fields.relevanceScore,
      lowRelevance: fields.lowRelevance,
      province: n.province,
      category: n.category,
      ocdsMainCategory: n.ocdsMainCategory,
      matchVia: fields.matchVia,
      documentLinks: n.documents,
      contactName: n.contact?.name ?? null,
      contactEmail: n.contact?.email ?? null,
      contactPhone: n.contact?.telephone ?? null,
      // Never auto-promote on amend — keep existing board membership.
      inPipeline: prev.inPipeline,
      isAmended: true,
      amendedAt: new Date().toISOString(),
    });
  }

  const items = await ensureStore();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;

  const n = fields.normalised;
  const now = new Date().toISOString();
  const prev = withOpportunityDefaults(items[index]);

  items[index] = withOpportunityDefaults({
    ...prev,
    refNo: n.refNo,
    title: n.title,
    description: n.description,
    buyer: n.buyer,
    sector: n.sector,
    source: toOppSource(n.sourceLabel),
    lane: fields.lane,
    closingAt: n.closingAt ?? prev.closingAt,
    briefingAt: n.briefing?.date ?? "",
    briefingCompulsory: Boolean(n.briefing?.compulsory),
    briefingVenue: n.briefing?.venue ?? "",
    estimatedValueZar: n.estimatedValue,
    sourceUrl: n.sourceUrl,
    externalId: n.externalId,
    contentHash: n.contentHash,
    opportunityType: fields.opportunityType,
    isPanel: fields.isPanel,
    panelMaxParticipants: fields.panelMaxParticipants,
    panelTerm: fields.panelTerm,
    relevanceScore: fields.relevanceScore,
    lowRelevance: fields.lowRelevance,
    province: n.province,
    category: n.category,
    ocdsMainCategory: n.ocdsMainCategory,
    matchVia: fields.matchVia,
    documentLinks: n.documents,
    contactName: n.contact?.name ?? null,
    contactEmail: n.contact?.email ?? null,
    contactPhone: n.contact?.telephone ?? null,
    inPipeline: prev.inPipeline,
    searchText: buildSearchText({
      title: n.title,
      description: n.description,
      buyer: n.buyer,
      refNo: n.refNo,
      externalId: n.externalId,
      province: n.province,
      category: n.category,
    }),
    isAmended: true,
    amendedAt: now,
    updatedAt: now,
  });

  await save(items);
  return items[index];
}

/** Promote an off-lane / archive tender onto the curated Opportunities board. */
export async function promoteToPipeline(
  id: string,
): Promise<Opportunity | null> {
  if (usePostgres()) {
    const { pgPromoteToPipeline } = await import(
      "@/lib/opportunities/pg-store"
    );
    return pgPromoteToPipeline(id);
  }
  const items = await ensureStore();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const now = new Date().toISOString();
  const prev = withOpportunityDefaults(items[index]);
  items[index] = withOpportunityDefaults({
    ...prev,
    inPipeline: true,
    updatedAt: now,
  });
  await save(items);
  return items[index];
}

export async function updateOpportunity(
  id: string,
  patch: Partial<Opportunity>,
): Promise<Opportunity | null> {
  if (usePostgres()) {
    const { pgUpdateOpportunity } = await import(
      "@/lib/opportunities/pg-store"
    );
    return pgUpdateOpportunity(id, patch);
  }
  const items = await ensureStore();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const prev = withOpportunityDefaults(items[index]);
  items[index] = withOpportunityDefaults({
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  await save(items);
  return items[index];
}

export async function addFilesToOpportunity(
  id: string,
  files: OpportunityFile[],
): Promise<Opportunity | null> {
  const items = await ensureStore();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;

  const now = new Date().toISOString();
  const prev = withOpportunityDefaults(items[index]);
  items[index] = {
    ...prev,
    files: [...prev.files, ...files],
    updatedAt: now,
  };
  await save(items);
  return items[index];
}

export function opportunityUploadDir(opportunityId: string) {
  return path.join(UPLOADS_DIR, opportunityId);
}
