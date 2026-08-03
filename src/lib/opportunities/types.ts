export const OPP_LANES = [
  "ICT / IS",
  "Website",
  "Asset management",
  "Solar / electrical",
  "Other",
] as const;

export const OPP_STAGES = [
  "Spotted",
  "Reviewing",
  "Bid/No-Bid",
  "Drafting",
  "Submitted",
  "Awarded",
  "Active account",
  "Closed (Won)",
  "Closed (Lost)",
] as const;

export const OPP_SOURCES = [
  "eTenders",
  "SITA",
  "CSD email",
  "Eskom",
  "Provincial",
  "Municipal",
  "SAP Discovery",
  "Portal",
  "Referral",
  "Manual",
  "Email",
] as const;

export const OPPORTUNITY_TYPES = ["tender", "rfq", "panel"] as const;

export type OppLane = (typeof OPP_LANES)[number];
export type OppStage = (typeof OPP_STAGES)[number];
export type OppSource = (typeof OPP_SOURCES)[number];
export type OppSector = "public" | "private";
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export type OpportunityFile = {
  id: string;
  filename: string;
  mime: string;
  size: number;
  storedName: string;
  uploadedAt: string;
};

export type OpportunityDocumentLink = {
  title: string;
  url: string;
  format?: string;
};

export type Opportunity = {
  id: string;
  refNo: string;
  title: string;
  description: string;
  buyer: string;
  sector: OppSector;
  source: OppSource;
  lane: OppLane;
  stage: OppStage;
  closingAt: string;
  briefingAt: string;
  briefingCompulsory: boolean;
  briefingVenue: string;
  estimatedValueZar: number | null;
  sourceUrl: string;
  ownerName: string;
  files: OpportunityFile[];
  createdAt: string;
  updatedAt: string;

  /** Cross-source dedupe key (e.g. eTenders OCID). */
  externalId: string | null;
  contentHash: string | null;
  opportunityType: OpportunityType;
  isPanel: boolean;
  panelMaxParticipants: number | null;
  panelTerm: string | null;
  relevanceScore: number;
  lowRelevance: boolean;
  isAmended: boolean;
  amendedAt: string | null;
  province: string | null;
  category: string | null;
  documentLinks: OpportunityDocumentLink[];
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

export type CreateOpportunityInput = {
  refNo: string;
  title: string;
  description?: string;
  buyer: string;
  sector: OppSector;
  source: OppSource;
  lane: OppLane;
  stage?: OppStage;
  closingAt: string;
  briefingAt?: string;
  briefingCompulsory?: boolean;
  briefingVenue?: string;
  estimatedValueZar?: number | null;
  sourceUrl?: string;
  ownerName?: string;
  externalId?: string | null;
  contentHash?: string | null;
  opportunityType?: OpportunityType;
  isPanel?: boolean;
  panelMaxParticipants?: number | null;
  panelTerm?: string | null;
  relevanceScore?: number;
  lowRelevance?: boolean;
  province?: string | null;
  category?: string | null;
  documentLinks?: OpportunityDocumentLink[];
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

/** Fill defaults for older persisted cards. */
export function withOpportunityDefaults(
  item: Partial<Opportunity> &
    Pick<
      Opportunity,
      | "id"
      | "refNo"
      | "title"
      | "buyer"
      | "sector"
      | "source"
      | "lane"
      | "stage"
      | "closingAt"
      | "ownerName"
      | "createdAt"
      | "updatedAt"
    >,
): Opportunity {
  const opportunityType =
    item.opportunityType ?? (item.isPanel ? "panel" : "tender");
  const isPanel = item.isPanel ?? opportunityType === "panel";

  return {
    description: item.description ?? "",
    briefingAt: item.briefingAt ?? "",
    briefingCompulsory: item.briefingCompulsory ?? false,
    briefingVenue: item.briefingVenue ?? "",
    estimatedValueZar: item.estimatedValueZar ?? null,
    sourceUrl: item.sourceUrl ?? "",
    files: item.files ?? [],
    externalId: item.externalId ?? null,
    contentHash: item.contentHash ?? null,
    opportunityType,
    isPanel,
    panelMaxParticipants: item.panelMaxParticipants ?? null,
    panelTerm: item.panelTerm ?? null,
    relevanceScore: item.relevanceScore ?? 0,
    lowRelevance: item.lowRelevance ?? false,
    isAmended: item.isAmended ?? false,
    amendedAt: item.amendedAt ?? null,
    province: item.province ?? null,
    category: item.category ?? null,
    documentLinks: item.documentLinks ?? [],
    contactName: item.contactName ?? null,
    contactEmail: item.contactEmail ?? null,
    contactPhone: item.contactPhone ?? null,
    id: item.id,
    refNo: item.refNo,
    title: item.title,
    buyer: item.buyer,
    sector: item.sector,
    source: item.source,
    lane: item.lane,
    stage: item.stage,
    closingAt: item.closingAt,
    ownerName: item.ownerName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
