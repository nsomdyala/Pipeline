import { randomUUID } from "node:crypto";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import type { Proposal, ProposalStatus } from "@/lib/proposals/types";

const FILE = "proposals.json";

function seed(): Proposal[] {
  const now = new Date().toISOString();
  return [
    {
      id: "prop-tih",
      title: "Digital platforms support proposal",
      opportunityRef: "TIH-ICT-2025-014",
      client: "The Innovation Hub",
      status: "approved",
      summary:
        "Website enhancements, CMS support and SLA for The Innovation Hub digital platforms.",
      valueZar: 680000,
      ownerName: "Ndumiso Somdyala",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "prop-saqa",
      title: "Asset verification system proposal",
      opportunityRef: "RFQ-SAQA-2026-041",
      client: "SAQA",
      status: "draft",
      summary:
        "Methodology, team CVs and pricing for SAQA asset verification implementation.",
      valueZar: 850000,
      ownerName: "Ndumiso Somdyala",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "prop-gep",
      title: "Website migration proposal",
      opportunityRef: "RFQ-GEP-2026-118",
      client: "GEP",
      status: "review",
      summary: "Migration plan, content approach and 12-month maintenance schedule.",
      valueZar: 420000,
      ownerName: "Ndumiso Somdyala",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

async function ensure() {
  const existing = await readJsonFile<Proposal[]>(FILE, []);
  if (existing.length > 0) return existing;
  const seeded = seed();
  await writeJsonFile(FILE, seeded);
  return seeded;
}

export async function listProposals() {
  const items = await ensure();
  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function createProposal(input: {
  title: string;
  opportunityRef?: string;
  client: string;
  summary?: string;
  valueZar?: number | null;
  status?: ProposalStatus;
}) {
  const now = new Date().toISOString();
  const proposal: Proposal = {
    id: randomUUID(),
    title: input.title.trim(),
    opportunityRef: input.opportunityRef?.trim() ?? "",
    client: input.client.trim(),
    status: input.status ?? "draft",
    summary: input.summary?.trim() ?? "",
    valueZar: input.valueZar ?? null,
    ownerName: "Ndumiso Somdyala",
    createdAt: now,
    updatedAt: now,
  };
  const items = await ensure();
  items.unshift(proposal);
  await writeJsonFile(FILE, items);
  return proposal;
}

export async function updateProposalStatus(id: string, status: ProposalStatus) {
  const items = await ensure();
  const index = items.findIndex((p) => p.id === id);
  if (index < 0) return null;
  items[index] = {
    ...items[index],
    status,
    updatedAt: new Date().toISOString(),
  };
  await writeJsonFile(FILE, items);
  return items[index];
}
