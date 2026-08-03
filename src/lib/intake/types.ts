/**
 * Shared source-adapter contract.
 * Adapters only fetch + normalise. Dedupe / match / upsert / notify live in the pipeline.
 */

export type RawItem = unknown;

export type IntakeSector = "public" | "private";

/** Stable cross-source identity. For eTenders this is the OCID. */
export type ExternalId = string;

export type NormalisedDocument = {
  title: string;
  url: string;
  format?: string;
};

export type NormalisedBriefing = {
  isSession: boolean;
  compulsory: boolean;
  date: string | null;
  venue: string | null;
};

export type NormalisedContact = {
  name: string | null;
  email: string | null;
  telephone: string | null;
};

/**
 * Source-shaped opportunity BEFORE lane scoring / board stage.
 * Pipeline turns this into our persisted Opportunity.
 */
export type NormalisedOpportunity = {
  externalId: ExternalId;
  refNo: string;
  sourceKey: string;
  sourceLabel: string;
  sector: IntakeSector;
  buyer: string;
  title: string;
  description: string;
  closingAt: string | null;
  publishedAt: string | null;
  province: string | null;
  /**
   * Official eTenders `tender.category` label when present.
   * Falls back to coarse OCDS mainProcurementCategory only if category is empty.
   */
  category: string | null;
  /** Coarse OCDS bucket: goods | services | works | consultingServices */
  ocdsMainCategory: string | null;
  estimatedValue: number | null;
  currency: string | null;
  documents: NormalisedDocument[];
  briefing: NormalisedBriefing | null;
  contact: NormalisedContact | null;
  sourceUrl: string;
  contentHash: string;
  hasFrameworkAgreement: boolean | null;
  panelMaxParticipants: number | null;
  panelTerm: string | null;
  /** title + description + category for shared matchers */
  matchText: string;
  /** Hint from source text / method; pipeline may override with panel. */
  procurementHint: "tender" | "rfq" | null;
};

export interface SourceAdapter {
  readonly name: string;
  readonly sector: IntakeSector;
  readonly sourceLabel: string;
  fetch(dateFrom: string, dateTo: string): Promise<RawItem[]>;
  normalise(raw: RawItem): NormalisedOpportunity;
}

export type IntakeRunResult = {
  sourceKey: string;
  fetched: number;
  normalised: number;
  created: number;
  amended: number;
  unchanged: number;
  notified: number;
  errors: string[];
  status: "ok" | "degraded" | "error";
  dateFrom: string;
  dateTo: string;
};
