import { countTermHits, PANEL_KEYWORDS } from "@/lib/intake/match/keywords";
import type { NormalisedOpportunity } from "@/lib/intake/types";
import type { OpportunityType } from "@/lib/opportunities/types";

export type PanelMatchResult = {
  isPanel: boolean;
  opportunityType: OpportunityType;
  panelMaxParticipants: number | null;
  panelTerm: string | null;
  via: "structured" | "keyword" | null;
};

export function matchPanel(item: NormalisedOpportunity): PanelMatchResult {
  const structured = item.hasFrameworkAgreement === true;
  const keywordHit = countTermHits(item.matchText, PANEL_KEYWORDS) > 0;
  const isPanel = structured || keywordHit;

  let opportunityType: OpportunityType = "tender";
  if (isPanel) opportunityType = "panel";
  else if (item.procurementHint === "rfq") opportunityType = "rfq";

  return {
    isPanel,
    opportunityType,
    panelMaxParticipants: isPanel ? item.panelMaxParticipants : null,
    panelTerm: isPanel ? item.panelTerm : null,
    via: structured ? "structured" : keywordHit ? "keyword" : null,
  };
}
