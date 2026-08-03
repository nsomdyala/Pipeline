import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { CreateLeadInput, Lead } from "@/lib/leads/types";
import { withLeadDefaults } from "@/lib/leads/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "leads.json");
export const LEAD_UPLOADS_DIR = path.join(DATA_DIR, "lead-uploads");

async function ensureStore(): Promise<Lead[]> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Lead[];
    return Array.isArray(parsed)
      ? parsed.map((item) => withLeadDefaults(item))
      : [];
  } catch {
    await writeFile(DATA_FILE, "[]", "utf8");
    return [];
  }
}

async function save(leads: Lead[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(leads, null, 2), "utf8");
}

export async function listLeads(): Promise<Lead[]> {
  const leads = await ensureStore();
  return leads.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getLead(id: string): Promise<Lead | null> {
  const leads = await ensureStore();
  const found = leads.find((lead) => lead.id === id);
  return found ? withLeadDefaults(found) : null;
}

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const now = new Date().toISOString();
  const lead = withLeadDefaults({
    id: randomUUID(),
    title: input.title.trim(),
    company: input.company.trim(),
    contactName: input.contactName?.trim() ?? "",
    contactEmail: input.contactEmail?.trim() ?? "",
    contactPhone: input.contactPhone?.trim() ?? "",
    lane: input.lane,
    sector: input.sector,
    source: input.source,
    status: "new",
    notes: input.notes?.trim() ?? "",
    ownerName: input.ownerName?.trim() || "Ndumiso Somdyala",
    opportunityId: input.opportunityId ?? null,
    refNo: input.refNo?.trim() ?? "",
    submissionKind: input.submissionKind ?? null,
    files: input.files ?? [],
    accountId: null,
    createdAt: now,
    updatedAt: now,
  });

  const leads = await ensureStore();
  leads.unshift(lead);
  await save(leads);
  return lead;
}

export async function updateLead(
  id: string,
  patch: Partial<Lead>,
): Promise<Lead | null> {
  const leads = await ensureStore();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index < 0) return null;
  const prev = withLeadDefaults(leads[index]);
  leads[index] = withLeadDefaults({
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  await save(leads);
  return leads[index];
}

export function leadUploadDir(leadId: string) {
  return path.join(LEAD_UPLOADS_DIR, leadId);
}
