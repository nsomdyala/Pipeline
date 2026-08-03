import { randomUUID } from "node:crypto";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import type {
  CreatePartnerInput,
  PartnerKind,
  PartnerStatus,
  StrategicPartner,
} from "@/lib/partners/types";
import { PARTNER_KINDS, PARTNER_STATUSES } from "@/lib/partners/types";

const FILE = "strategic-partners.json";

function atMonths(base: Date, months: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

function seed(now = new Date()): StrategicPartner[] {
  const iso = now.toISOString();
  return [
    {
      id: "partner-aws",
      name: "Amazon Web Services",
      kind: "letter",
      role: "Cloud partner — partner letters for public bids and hosting scopes",
      status: "active",
      contactName: "AWS Partner Network",
      contactEmail: "partners@amazon.com",
      website: "https://aws.amazon.com/partners/",
      notes: "Use for cloud / hosting / digitisation bids needing OEM letters.",
      letterType: "AWS Partner letter",
      letterExpiresAt: atMonths(now, 8),
      providesPartnerLetter: true,
      sellsOurSystems: false,
      projectPartner: true,
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: "partner-microsoft",
      name: "Microsoft",
      kind: "letter",
      role: "Technology partner — Microsoft partner letters for ICT / licensing bids",
      status: "active",
      contactName: "Microsoft Partner Center",
      contactEmail: "partners@microsoft.com",
      website: "https://partner.microsoft.com/",
      notes: "ISV / solution partner letter for software and M365-related work.",
      letterType: "Microsoft Partner letter",
      letterExpiresAt: atMonths(now, 10),
      providesPartnerLetter: true,
      sellsOurSystems: false,
      projectPartner: true,
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: "partner-sage",
      name: "Sage",
      kind: "letter",
      role: "Accounting / ERP partner letters for finance system scopes",
      status: "active",
      contactName: "Sage Partner Desk",
      contactEmail: "partners@sage.com",
      website: "https://www.sage.com/",
      notes: "Partner letter for Sage-related implementations and support.",
      letterType: "Sage Partner letter",
      letterExpiresAt: atMonths(now, 6),
      providesPartnerLetter: true,
      sellsOurSystems: false,
      projectPartner: false,
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: "partner-channel-demo",
      name: "Apex Digital Distributors",
      kind: "reseller",
      role: "Channel partner selling Pipeline / Max Attention solutions into retail & mining",
      status: "active",
      contactName: "Lebo Mokoena",
      contactEmail: "lebo@apexdigital.example",
      website: "",
      notes: "Introducing our asset verification and website stacks to their clients.",
      letterType: "",
      letterExpiresAt: "",
      providesPartnerLetter: false,
      sellsOurSystems: true,
      projectPartner: true,
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: "partner-project-demo",
      name: "Horizon Electrical JV",
      kind: "project",
      role: "Project partner for solar / electrical tenders we co-bid",
      status: "active",
      contactName: "Johan Venter",
      contactEmail: "johan@horizonelec.example",
      website: "",
      notes: "Co-bid on Eskom and municipal electrical scopes.",
      letterType: "",
      letterExpiresAt: "",
      providesPartnerLetter: false,
      sellsOurSystems: false,
      projectPartner: true,
      createdAt: iso,
      updatedAt: iso,
    },
  ];
}

function withDefaults(
  item: Partial<StrategicPartner> &
    Pick<StrategicPartner, "id" | "name" | "kind" | "createdAt" | "updatedAt">,
): StrategicPartner {
  const kind = PARTNER_KINDS.includes(item.kind as PartnerKind)
    ? (item.kind as PartnerKind)
    : "technology";
  const status = PARTNER_STATUSES.includes(item.status as PartnerStatus)
    ? (item.status as PartnerStatus)
    : "active";
  return {
    role: "",
    contactName: "",
    contactEmail: "",
    website: "",
    notes: "",
    letterType: "",
    letterExpiresAt: "",
    providesPartnerLetter: false,
    sellsOurSystems: false,
    projectPartner: false,
    ...item,
    kind,
    status,
  };
}

async function ensure() {
  const existing = await readJsonFile<StrategicPartner[]>(FILE, []);
  if (existing.length > 0) {
    const mapped = existing.map((p) => withDefaults(p));
    // Ensure seed letter partners exist as we grow
    const byId = new Map(mapped.map((p) => [p.id, p]));
    let changed = false;
    for (const seedPartner of seed()) {
      if (
        seedPartner.providesPartnerLetter &&
        !byId.has(seedPartner.id) &&
        ![...byId.values()].some(
          (p) => p.name.toLowerCase() === seedPartner.name.toLowerCase(),
        )
      ) {
        byId.set(seedPartner.id, seedPartner);
        changed = true;
      }
    }
    const next = [...byId.values()];
    if (changed) await writeJsonFile(FILE, next);
    return next;
  }
  const seeded = seed();
  await writeJsonFile(FILE, seeded);
  return seeded;
}

export async function listPartners() {
  const partners = await ensure();
  return partners.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createPartner(input: CreatePartnerInput) {
  if (!input.name.trim()) throw new Error("Partner name is required.");
  if (!PARTNER_KINDS.includes(input.kind)) {
    throw new Error("Invalid partner kind.");
  }
  const now = new Date().toISOString();
  const partner = withDefaults({
    id: randomUUID(),
    name: input.name.trim(),
    kind: input.kind,
    role: input.role?.trim() ?? "",
    status: input.status ?? "active",
    contactName: input.contactName?.trim() ?? "",
    contactEmail: input.contactEmail?.trim() ?? "",
    website: input.website?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    letterType: input.letterType?.trim() ?? "",
    letterExpiresAt: input.letterExpiresAt?.trim() ?? "",
    providesPartnerLetter: Boolean(input.providesPartnerLetter),
    sellsOurSystems: Boolean(input.sellsOurSystems),
    projectPartner: Boolean(input.projectPartner),
    createdAt: now,
    updatedAt: now,
  });
  const partners = await ensure();
  partners.push(partner);
  await writeJsonFile(FILE, partners);
  return partner;
}

export async function updatePartner(
  id: string,
  input: Partial<CreatePartnerInput>,
) {
  const partners = await ensure();
  const index = partners.findIndex((p) => p.id === id);
  if (index < 0) return null;
  const prev = withDefaults(partners[index]);
  partners[index] = withDefaults({
    ...prev,
    ...input,
    name: input.name?.trim() ?? prev.name,
    role: input.role !== undefined ? input.role.trim() : prev.role,
    contactName:
      input.contactName !== undefined
        ? input.contactName.trim()
        : prev.contactName,
    contactEmail:
      input.contactEmail !== undefined
        ? input.contactEmail.trim()
        : prev.contactEmail,
    website: input.website !== undefined ? input.website.trim() : prev.website,
    notes: input.notes !== undefined ? input.notes.trim() : prev.notes,
    letterType:
      input.letterType !== undefined
        ? input.letterType.trim()
        : prev.letterType,
    letterExpiresAt:
      input.letterExpiresAt !== undefined
        ? input.letterExpiresAt.trim()
        : prev.letterExpiresAt,
    updatedAt: new Date().toISOString(),
  });
  await writeJsonFile(FILE, partners);
  return partners[index];
}

export async function deletePartner(id: string) {
  const partners = await ensure();
  const next = partners.filter((p) => p.id !== id);
  if (next.length === partners.length) return false;
  await writeJsonFile(FILE, next);
  return true;
}
