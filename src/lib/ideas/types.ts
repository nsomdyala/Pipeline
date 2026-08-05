import type { OppLane } from "@/lib/opportunities/types";

export const IDEA_STATUSES = [
  "submitted",
  "under_review",
  "approved",
  "in_rd",
  "rejected",
  "parked",
] as const;

export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  in_rd: "In R&D",
  rejected: "Rejected",
  parked: "Parked",
};

/** Categories align with existing opportunity lanes. */
export const IDEA_CATEGORIES = [
  "ICT / IS",
  "Website",
  "Asset management",
  "Solar / electrical",
  "Other",
] as const;

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number] | OppLane;

export const RD_STAGES = [
  "backlog",
  "researching",
  "prototyping",
  "validating",
  "completed",
  "shelved",
] as const;

export type RdStage = (typeof RD_STAGES)[number];

export const RD_STAGE_LABELS: Record<RdStage, string> = {
  backlog: "Backlog",
  researching: "Researching",
  prototyping: "Prototyping",
  validating: "Validating",
  completed: "Completed",
  shelved: "Shelved",
};

export const RD_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type RdPriority = (typeof RD_PRIORITIES)[number];

export const RD_PRIORITY_LABELS: Record<RdPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export type IdeaAttachment = {
  id: string;
  filename: string;
  mime: string;
  size: number;
  storedName: string;
  uploadedAt: string;
};

export type IdeaReview = {
  id: string;
  ideaId: string;
  userId: string;
  userName: string;
  comment: string;
  /** 1–5 score; null when comment-only. */
  score: number | null;
  createdAt: string;
};

export type Idea = {
  id: string;
  title: string;
  description: string;
  problem: string;
  potentialValue: string;
  potentialValueZar: number | null;
  category: IdeaCategory;
  status: IdeaStatus;
  submitterUserId: string;
  submitterName: string;
  reviewerUserId: string | null;
  reviewerName: string;
  channelId: string | null;
  decisionReason: string;
  decidedAt: string | null;
  decidedByUserId: string | null;
  decidedByName: string;
  attachments: IdeaAttachment[];
  reviews: IdeaReview[];
  rdItemId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RdAssignment = {
  id: string;
  rdItemId: string;
  userId: string;
  userName: string;
};

export type RdActivity = {
  id: string;
  rdItemId: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type RdDocument = {
  id: string;
  filename: string;
  mime: string;
  size: number;
  storedName: string;
  uploadedAt: string;
};

export type RdItem = {
  id: string;
  ideaId: string;
  title: string;
  stage: RdStage;
  ownerUserId: string | null;
  ownerName: string;
  priority: RdPriority;
  targetDate: string | null;
  effortNotes: string;
  progressNotes: string;
  atRisk: boolean;
  assignments: RdAssignment[];
  documents: RdDocument[];
  activity: RdActivity[];
  /** Approval trail snapshot from originating idea. */
  submitterName: string;
  approvedByName: string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IdeaFilters = {
  status?: IdeaStatus | "";
  category?: string;
  submitter?: string;
};

export type RdFilters = {
  stage?: RdStage | "";
  assignee?: string;
  overdue?: boolean;
  atRisk?: boolean;
};

export type CreateIdeaInput = {
  title: string;
  description: string;
  problem: string;
  potentialValue?: string;
  potentialValueZar?: number | null;
  category: IdeaCategory;
};

export type IdeaReviewInput = {
  comment?: string;
  score?: number | null;
};

export type IdeaDecisionInput = {
  decision: "approve" | "reject" | "park" | "under_review";
  reason?: string;
  reviewerUserId?: string | null;
  reviewerName?: string;
};

export type UpdateRdInput = {
  stage?: RdStage;
  ownerUserId?: string | null;
  ownerName?: string;
  priority?: RdPriority;
  targetDate?: string | null;
  effortNotes?: string;
  progressNotes?: string;
  atRisk?: boolean;
  assigneeUserIds?: Array<{ userId: string; userName: string }>;
};
