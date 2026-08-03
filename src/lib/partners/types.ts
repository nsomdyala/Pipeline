export const PARTNER_KINDS = [
  "reseller",
  "project",
  "letter",
  "technology",
] as const;

export const PARTNER_STATUSES = [
  "active",
  "pending",
  "expired",
  "prospect",
] as const;

export type PartnerKind = (typeof PARTNER_KINDS)[number];
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export type StrategicPartner = {
  id: string;
  name: string;
  kind: PartnerKind;
  /** What they do with us — sell our systems, co-bid, partner letters, etc. */
  role: string;
  status: PartnerStatus;
  contactName: string;
  contactEmail: string;
  website: string;
  notes: string;
  /** For letter partners — e.g. AWS Select, Microsoft ISV */
  letterType: string;
  letterExpiresAt: string;
  providesPartnerLetter: boolean;
  sellsOurSystems: boolean;
  projectPartner: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePartnerInput = {
  name: string;
  kind: PartnerKind;
  role?: string;
  status?: PartnerStatus;
  contactName?: string;
  contactEmail?: string;
  website?: string;
  notes?: string;
  letterType?: string;
  letterExpiresAt?: string;
  providesPartnerLetter?: boolean;
  sellsOurSystems?: boolean;
  projectPartner?: boolean;
};
