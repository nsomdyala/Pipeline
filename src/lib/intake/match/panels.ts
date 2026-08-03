import { classifyOpportunityType } from "@/lib/intake/match/classify";
import type { NormalisedOpportunity } from "@/lib/intake/types";
import type { OpportunityType } from "@/lib/opportunities/types";

export type PanelMatchResult = {
  isPanel: boolean;
  opportunityType: OpportunityType;
  panelMaxParticipants: number | null;
  panelTerm: string | null;
  via: "framework" | "panel_text" | "method_details" | "title_id" | "default";
};

export function matchPanel(item: NormalisedOpportunity): PanelMatchResult {
  const classified = classifyOpportunityType({
    title: item.title,
    description: item.description,
    tenderId: item.tenderId,
    procurementMethod: item.procurementMethod,
    procurementMethodDetails: item.procurementMethodDetails,
    hasFrameworkAgreement: item.hasFrameworkAgreement,
  });

  return {
    isPanel: classified.isPanel,
    opportunityType: classified.opportunityType,
    panelMaxParticipants: classified.isPanel
      ? item.panelMaxParticipants
      : null,
    panelTerm: classified.isPanel ? item.panelTerm : null,
    via: classified.via,
  };
}
