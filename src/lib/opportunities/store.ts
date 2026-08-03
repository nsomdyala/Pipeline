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

export async function listOpportunities(options?: {
  scope?: "all" | "pipeline";
}): Promise<Opportunity[]> {
  const items = await ensureStore();
  let list = items.map((i) => withOpportunityDefaults(i));
  if (options?.scope === "pipeline") {
    list = list.filter(isOnPipelineBoard);
  }
  return list.sort((a, b) => {
    // Panels float above zero-value noise when closing dates are equal-ish
    if (a.isPanel !== b.isPanel) return a.isPanel ? -1 : 1;
    return new Date(a.closingAt).getTime() - new Date(b.closingAt).getTime();
  });
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const items = await ensureStore();
  const found = items.find((item) => item.id === id);
  return found ? withOpportunityDefaults(found) : null;
}

export async function findByExternalId(
  externalId: string,
): Promise<Opportunity | null> {
  const items = await ensureStore();
  const found = items.find((item) => item.externalId === externalId);
  return found ? withOpportunityDefaults(found) : null;
}

export async function createOpportunity(
  input: CreateOpportunityInput,
  files: OpportunityFile[] = [],
): Promise<Opportunity> {
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
      input.inPipeline ??
      (input.source === "Manual" ||
        (!(input.lowRelevance ?? false) && input.lane !== "Other")),
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

export async function createOpportunityFromIntake(
  fields: IntakeUpsertFields,
): Promise<Opportunity> {
  const { normalised: n } = fields;
  // Lane is a TAG — every release is stored. Board only shows inPipeline.
  const inPipeline = !fields.lowRelevance && fields.lane !== "Other";
  return createOpportunity({
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
    inPipeline,
  });
}

export async function updateOpportunityFromIntake(
  id: string,
  fields: IntakeUpsertFields,
): Promise<Opportunity | null> {
  const items = await ensureStore();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;

  const n = fields.normalised;
  const now = new Date().toISOString();
  const prev = withOpportunityDefaults(items[index]);

  const matchedPipeline = !fields.lowRelevance && fields.lane !== "Other";
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
    // Never demote a manually promoted card on amendment
    inPipeline: prev.inPipeline || matchedPipeline,
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
