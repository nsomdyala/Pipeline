export const ACCOUNT_STATUSES = [
  "active",
  "on_hold",
  "completed",
] as const;

export const ACCOUNT_DOC_TYPES = [
  "signed_contract",
  "appointment_letter",
  "billing",
  "status",
] as const;

export const ACCOUNT_LANES = [
  "ICT / IS",
  "Website",
  "Asset management",
  "Solar / electrical",
  "Other",
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export type AccountDocType = (typeof ACCOUNT_DOC_TYPES)[number];
export type AccountLane = (typeof ACCOUNT_LANES)[number];
export type AccountSector = "public" | "private";

export type AccountDocument = {
  id: string;
  docType: AccountDocType;
  filename: string;
  mime: string;
  size: number;
  storedName: string;
  uploadedAt: string;
};

export type Account = {
  id: string;
  clientName: string;
  projectTitle: string;
  refNo: string;
  lane: AccountLane;
  sector: AccountSector;
  status: AccountStatus;
  progressPercent: number;
  valueZar: number | null;
  startOn: string;
  endOn: string;
  notes: string;
  ownerName: string;
  convertedFromOpportunity: boolean;
  documents: AccountDocument[];
  createdAt: string;
  updatedAt: string;
};

export type CreateAccountInput = {
  clientName: string;
  projectTitle: string;
  refNo?: string;
  lane: AccountLane;
  sector: AccountSector;
  status?: AccountStatus;
  progressPercent?: number;
  valueZar?: number | null;
  startOn?: string;
  endOn?: string;
  notes?: string;
  convertedFromOpportunity?: boolean;
};

export const ACCOUNT_DOC_LABELS: Record<AccountDocType, string> = {
  signed_contract: "Signed contract",
  appointment_letter: "Appointment letter",
  billing: "Billing",
  status: "Status",
};
