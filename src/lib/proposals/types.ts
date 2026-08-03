export const PROPOSAL_STATUSES = [
  "draft",
  "review",
  "approved",
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export type Proposal = {
  id: string;
  title: string;
  opportunityRef: string;
  client: string;
  status: ProposalStatus;
  summary: string;
  valueZar: number | null;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
};
