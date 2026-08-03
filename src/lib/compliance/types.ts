export const DOC_TYPE_KEYS = [
  "tax_clearance",
  "csd_report",
  "bbbee",
  "director_id",
  "director_poa",
  "company_poa",
  "cipc",
  "bank_letter",
] as const;

export type DocTypeKey = (typeof DOC_TYPE_KEYS)[number];

export type ComplianceStatus = "valid" | "expiring_soon" | "expired" | "missing";

export type ComplianceDocument = {
  id: string;
  typeKey: DocTypeKey;
  typeName: string;
  issuedOn: string;
  expiresOn: string;
  validityMonths: number | null;
  filename: string;
  mime: string;
  size: number;
  storedName: string;
  version: number;
  uploadedAt: string;
};

export type DocTypeDef = {
  key: DocTypeKey;
  name: string;
  validityMonths: number | null;
  requiredByDefault: boolean;
};

export const DOC_TYPE_DEFS: DocTypeDef[] = [
  { key: "tax_clearance", name: "SARS Tax Clearance / Letter of Good Standing", validityMonths: 12, requiredByDefault: true },
  { key: "csd_report", name: "CSD registration report", validityMonths: 3, requiredByDefault: true },
  { key: "bbbee", name: "B-BBEE certificate / affidavit", validityMonths: 12, requiredByDefault: true },
  { key: "director_id", name: "Director ID", validityMonths: null, requiredByDefault: true },
  { key: "director_poa", name: "Director proof of address", validityMonths: 3, requiredByDefault: true },
  { key: "company_poa", name: "Company proof of address", validityMonths: 3, requiredByDefault: true },
  { key: "cipc", name: "COR14.3 / CIPC docs", validityMonths: null, requiredByDefault: true },
  { key: "bank_letter", name: "Bank confirmation letter", validityMonths: 3, requiredByDefault: true },
];
