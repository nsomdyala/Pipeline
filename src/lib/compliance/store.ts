import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dataPath, readJsonFile, writeJsonFile } from "@/lib/json-store";
import {
  DOC_TYPE_DEFS,
  type ComplianceDocument,
  type ComplianceStatus,
  type DocTypeKey,
} from "@/lib/compliance/types";

const FILE = "compliance-docs.json";
const UPLOAD_DIR = "compliance-uploads";

function addMonths(isoDate: string, months: number) {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function seed(): ComplianceDocument[] {
  const today = new Date();
  const on = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  return [
    {
      id: "comp-tax",
      typeKey: "tax_clearance",
      typeName: "SARS Tax Clearance / Letter of Good Standing",
      issuedOn: on(200),
      expiresOn: addMonths(on(200), 12),
      validityMonths: 12,
      filename: "tax-clearance-max-attention.pdf",
      mime: "application/pdf",
      size: 120000,
      storedName: "",
      version: 1,
      uploadedAt: new Date().toISOString(),
    },
    {
      id: "comp-csd",
      typeKey: "csd_report",
      typeName: "CSD registration report",
      issuedOn: on(70),
      expiresOn: addMonths(on(70), 3),
      validityMonths: 3,
      filename: "csd-report.pdf",
      mime: "application/pdf",
      size: 88000,
      storedName: "",
      version: 1,
      uploadedAt: new Date().toISOString(),
    },
    {
      id: "comp-bbbee",
      typeKey: "bbbee",
      typeName: "B-BBEE certificate / affidavit",
      issuedOn: on(100),
      expiresOn: addMonths(on(100), 12),
      validityMonths: 12,
      filename: "bbbee-affidavit.pdf",
      mime: "application/pdf",
      size: 64000,
      storedName: "",
      version: 1,
      uploadedAt: new Date().toISOString(),
    },
    {
      id: "comp-poa-company",
      typeKey: "company_poa",
      typeName: "Company proof of address",
      issuedOn: on(80),
      expiresOn: addMonths(on(80), 3),
      validityMonths: 3,
      filename: "company-proof-of-address.pdf",
      mime: "application/pdf",
      size: 42000,
      storedName: "",
      version: 1,
      uploadedAt: new Date().toISOString(),
    },
    {
      id: "comp-director-id",
      typeKey: "director_id",
      typeName: "Director ID",
      issuedOn: on(400),
      expiresOn: "",
      validityMonths: null,
      filename: "director-id.pdf",
      mime: "application/pdf",
      size: 51000,
      storedName: "",
      version: 1,
      uploadedAt: new Date().toISOString(),
    },
  ];
}

export function statusFor(doc: ComplianceDocument | undefined): ComplianceStatus {
  if (!doc) return "missing";
  if (!doc.expiresOn) return "valid";
  const expires = new Date(doc.expiresOn);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expires.setHours(0, 0, 0, 0);
  if (expires < today) return "expired";
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 14);
  if (expires <= soon) return "expiring_soon";
  return "valid";
}

async function ensure() {
  const existing = await readJsonFile<ComplianceDocument[]>(FILE, []);
  if (existing.length > 0) return existing;
  const seeded = seed();
  await writeJsonFile(FILE, seeded);
  return seeded;
}

export async function listComplianceDocuments() {
  return ensure();
}

export async function listVaultRows() {
  const docs = await ensure();
  const latestByType = new Map<DocTypeKey, ComplianceDocument>();
  for (const doc of docs) {
    const current = latestByType.get(doc.typeKey);
    if (!current || doc.version > current.version) {
      latestByType.set(doc.typeKey, doc);
    }
  }

  return DOC_TYPE_DEFS.map((def) => {
    const doc = latestByType.get(def.key);
    return {
      ...def,
      document: doc ?? null,
      status: statusFor(doc),
    };
  });
}

export async function uploadComplianceDoc(input: {
  typeKey: DocTypeKey;
  issuedOn: string;
  file: File;
}) {
  const def = DOC_TYPE_DEFS.find((d) => d.key === input.typeKey);
  if (!def) throw new Error("Unknown document type.");

  const docs = await ensure();
  const prior = docs.filter((d) => d.typeKey === input.typeKey);
  const version = prior.length + 1;
  const id = randomUUID();
  const safeName = input.file.name.replace(/[^\w.\- ()]/g, "_");
  const storedName = `${id}-${safeName}`;
  const dir = dataPath(UPLOAD_DIR);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await input.file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buffer);

  const expiresOn =
    def.validityMonths == null
      ? ""
      : addMonths(input.issuedOn, def.validityMonths);

  const doc: ComplianceDocument = {
    id,
    typeKey: def.key,
    typeName: def.name,
    issuedOn: input.issuedOn,
    expiresOn,
    validityMonths: def.validityMonths,
    filename: input.file.name,
    mime: input.file.type || "application/octet-stream",
    size: input.file.size,
    storedName,
    version,
    uploadedAt: new Date().toISOString(),
  };

  docs.push(doc);
  await writeJsonFile(FILE, docs);
  return doc;
}

export function complianceUploadPath(storedName: string) {
  return dataPath(UPLOAD_DIR, storedName);
}
