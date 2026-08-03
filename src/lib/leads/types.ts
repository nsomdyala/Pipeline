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
] as const;

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
] as const;

export type LeadLane = (typeof LEAD_LANES)[number];
export type LeadSource = (typeof LEAD_SOURCES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadSector = "public" | "private";

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
};
