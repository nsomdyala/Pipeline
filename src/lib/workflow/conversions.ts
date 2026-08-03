import { createAccount } from "@/lib/accounts/store";
import type { Account } from "@/lib/accounts/types";
import { persistLeadFiles } from "@/lib/leads/files";
import { createLead, getLead, updateLead } from "@/lib/leads/store";
import type { Lead, SubmissionKind } from "@/lib/leads/types";
import { SUBMISSION_KINDS } from "@/lib/leads/types";
import {
  getOpportunity,
  updateOpportunity,
} from "@/lib/opportunities/store";
import type { Opportunity } from "@/lib/opportunities/types";

export function isSubmissionKind(value: string): value is SubmissionKind {
  return SUBMISSION_KINDS.includes(value as SubmissionKind);
}

/** Upload quotation/pricing for a submitted tender/RFQ → move into Leads. */
export async function submitOpportunityToLead(
  opportunityId: string,
  kind: SubmissionKind,
  uploads: File[],
): Promise<{ lead: Lead; opportunity: Opportunity }> {
  const opportunity = await getOpportunity(opportunityId);
  if (!opportunity) throw new Error("Opportunity not found.");
  if (opportunity.convertedToLeadId) {
    throw new Error("This opportunity is already in Leads.");
  }
  if (uploads.length === 0) {
    throw new Error("Upload the quotation or pricing file.");
  }

  const kindLabel = kind === "quotation" ? "Quotation" : "Pricing";
  const lead = await createLead({
    title: opportunity.title,
    company: opportunity.buyer,
    contactName: opportunity.contactName ?? "",
    contactEmail: opportunity.contactEmail ?? "",
    contactPhone: opportunity.contactPhone ?? "",
    lane: opportunity.lane,
    sector: opportunity.sector,
    source: "submitted_bid",
    notes: `${kindLabel} submitted for ${opportunity.refNo}. Moved from Opportunities.`,
    opportunityId: opportunity.id,
    refNo: opportunity.refNo,
    submissionKind: kind,
    files: [],
    ownerName: opportunity.ownerName,
  });

  const files = await persistLeadFiles(lead.id, kind, uploads);
  if (files.length === 0) {
    throw new Error("Upload the quotation or pricing file.");
  }
  const withFiles = await updateLead(lead.id, { files });
  if (!withFiles) throw new Error("Could not attach submission files.");

  const updatedOpp = await updateOpportunity(opportunity.id, {
    stage: "Submitted",
    inPipeline: false,
    convertedToLeadId: withFiles.id,
  });
  if (!updatedOpp) throw new Error("Could not update opportunity.");

  return { lead: withFiles, opportunity: updatedOpp };
}

/** Mark lead as appointed → create Account and link back. */
export async function appointLeadToAccount(
  leadId: string,
): Promise<{ account: Account; lead: Lead; opportunity: Opportunity | null }> {
  const lead = await getLead(leadId);
  if (!lead) throw new Error("Lead not found.");
  if (lead.accountId) throw new Error("This lead is already an Account.");
  if (lead.status === "lost") {
    throw new Error("A lost lead cannot be appointed.");
  }

  const opportunity = lead.opportunityId
    ? await getOpportunity(lead.opportunityId)
    : null;

  const account = await createAccount({
    clientName: lead.company,
    projectTitle: lead.title,
    refNo: lead.refNo || opportunity?.refNo || "",
    lane: lead.lane,
    sector: lead.sector,
    status: "active",
    progressPercent: 5,
    valueZar: opportunity?.estimatedValueZar ?? null,
    notes: `Appointed from lead. ${lead.notes}`.trim(),
    convertedFromOpportunity: Boolean(lead.opportunityId),
  });

  const updatedLead = await updateLead(leadId, {
    status: "converted",
    accountId: account.id,
  });
  if (!updatedLead) throw new Error("Could not update lead.");

  let updatedOpp: Opportunity | null = null;
  if (opportunity) {
    updatedOpp = await updateOpportunity(opportunity.id, {
      stage: "Active account",
      convertedToAccountId: account.id,
    });
  }

  return { account, lead: updatedLead, opportunity: updatedOpp };
}
