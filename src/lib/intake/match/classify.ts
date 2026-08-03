import type { OpportunityType } from "@/lib/opportunities/types";

export type ClassifyInput = {
  title: string;
  description: string;
  tenderId?: string | null;
  procurementMethod?: string | null;
  procurementMethodDetails?: string | null;
  hasFrameworkAgreement?: boolean | null;
};

export type ClassifyResult = {
  opportunityType: OpportunityType;
  isPanel: boolean;
  via: "framework" | "panel_text" | "method_details" | "title_id" | "default";
};

/**
 * Classify RFQ / RFP / Tender / Panel from OCDS fields.
 * Prefer procurementMethodDetails + frameworkAgreement; default to tender.
 */
export function classifyOpportunityType(input: ClassifyInput): ClassifyResult {
  const title = input.title ?? "";
  const description = input.description ?? "";
  const tenderId = input.tenderId ?? "";
  const method = (input.procurementMethod ?? "").toLowerCase();
  const details = (input.procurementMethodDetails ?? "").toLowerCase();
  const blob = `${title}\n${description}\n${tenderId}`.toLowerCase();

  if (input.hasFrameworkAgreement === true) {
    return { opportunityType: "panel", isPanel: true, via: "framework" };
  }

  // Explicit panel appointment language (common when techniques is omitted).
  if (
    /\bpanel of\b/.test(blob) ||
    /\bappointment of a panel\b/.test(blob) ||
    /\bestablishment of (an? )?.*\bpanel\b/.test(blob) ||
    /\bframework agreement\b/.test(blob)
  ) {
    return { opportunityType: "panel", isPanel: true, via: "panel_text" };
  }

  const fromDetails = typeFromMethodDetails(details, method);
  if (fromDetails) {
    return {
      opportunityType: fromDetails,
      isPanel: false,
      via: "method_details",
    };
  }

  const fromTitle = typeFromTitleOrId(`${title} ${tenderId}`);
  if (fromTitle) {
    return {
      opportunityType: fromTitle,
      isPanel: false,
      via: "title_id",
    };
  }

  return { opportunityType: "tender", isPanel: false, via: "default" };
}

function typeFromMethodDetails(
  details: string,
  method: string,
): Exclude<OpportunityType, "panel"> | null {
  const text = `${details} ${method}`;
  if (!text.trim()) return null;

  if (
    /\brequest for quotation\b/.test(text) ||
    /\brfq\b/.test(text) ||
    /\bquotation\b/.test(text)
  ) {
    return "rfq";
  }
  if (
    /\brequest for proposal\b/.test(text) ||
    /\brfp\b/.test(text) ||
    /\bproposal\b/.test(text)
  ) {
    return "rfp";
  }
  if (
    /\brequest for bid\b/.test(text) ||
    /\bopen-?tender\b/.test(text) ||
    /\btender\b/.test(text) ||
    /\bbid\b/.test(text)
  ) {
    return "tender";
  }
  // Expression of interest / participation → tender by default (not RFQ/RFP).
  return null;
}

function typeFromTitleOrId(
  value: string,
): Exclude<OpportunityType, "panel"> | null {
  const text = value.toLowerCase();
  // Path / suffix conventions: ".../RFP", "RFP01-…", "RFQ-…"
  if (/(^|[/\s_-])rfp([/\s_-]|$)/i.test(value) || /\brfp\b/.test(text)) {
    return "rfp";
  }
  if (/(^|[/\s_-])rfq([/\s_-]|$)/i.test(value) || /\brfq\b/.test(text)) {
    return "rfq";
  }
  return null;
}

export function opportunityTypeLabel(type: OpportunityType | string): string {
  if (type === "rfq") return "RFQ";
  if (type === "rfp") return "RFP";
  if (type === "panel") return "Panel";
  return "Tender";
}
