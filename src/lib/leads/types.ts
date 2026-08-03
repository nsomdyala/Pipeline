export const LEAD_LANES = [
  "ICT / IS",
  "Website",
  "Asset management",
  "Solar / electrical",
  "Other",
] as const;

export const LEAD_SOURCES = [
  "referral",
  "manual",
  "news",
  "portal",
  "sap_bnd",
  "email",
  "submitted_bid",
] as const;

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
] as const;

export const SUBMISSION_KINDS = ["quotation", "pricing"] as const;

export type LeadLane = (typeof LEAD_LANES)[number];
export type LeadSource = (typeof LEAD_SOURCES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadSector = "public" | "private";
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];

export type LeadFile = {
  id: string;
  filename: string;
  mime: string;
  size: number;
  storedName: string;
  uploadedAt: string;
  kind: SubmissionKind;
};

export type Lead = {
  id: string;
  title: string;
  company: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  lane: LeadLane;
  sector: LeadSector;
  source: LeadSource;
  status: LeadStatus;
  notes: string;
  ownerName: string;
  /** Linked opportunity when this lead came from a submitted tender/RFQ. */
  opportunityId: string | null;
  refNo: string;
  submissionKind: SubmissionKind | null;
  files: LeadFile[];
  accountId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateLeadInput = {
  title: string;
  company: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  lane: LeadLane;
  sector: LeadSector;
  source: LeadSource;
  notes?: string;
  opportunityId?: string | null;
  refNo?: string;
  submissionKind?: SubmissionKind | null;
  files?: LeadFile[];
  ownerName?: string;
};

export function withLeadDefaults(
  item: Partial<Lead> &
    Pick<
      Lead,
      | "id"
      | "title"
      | "company"
      | "lane"
      | "sector"
      | "source"
      | "status"
      | "ownerName"
      | "createdAt"
      | "updatedAt"
    >,
): Lead {
  return {
    ...item,
    contactName: item.contactName ?? "",
    contactEmail: item.contactEmail ?? "",
    contactPhone: item.contactPhone ?? "",
    notes: item.notes ?? "",
    opportunityId: item.opportunityId ?? null,
    refNo: item.refNo ?? "",
    submissionKind: item.submissionKind ?? null,
    files: item.files ?? [],
    accountId: item.accountId ?? null,
  };
}
