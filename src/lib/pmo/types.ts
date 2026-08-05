export const PMO_PROJECT_STATUSES = [
  "not_started",
  "in_delivery",
  "on_hold",
  "closed",
] as const;

export const PMO_PROJECT_HEALTH = ["green", "amber", "red"] as const;

export type PmoProjectStatus = (typeof PMO_PROJECT_STATUSES)[number];
export type PmoProjectHealth = (typeof PMO_PROJECT_HEALTH)[number];

export const PMO_STATUS_LABELS: Record<PmoProjectStatus, string> = {
  not_started: "Not started",
  in_delivery: "In delivery",
  on_hold: "On hold",
  closed: "Closed",
};

export const PMO_HEALTH_LABELS: Record<PmoProjectHealth, string> = {
  green: "Green",
  amber: "Amber",
  red: "Red",
};

export type PmoAssignment = {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
};

export type PmoProject = {
  id: string;
  accountId: string;
  accountName: string;
  name: string;
  status: PmoProjectStatus;
  health: PmoProjectHealth;
  valueZar: number | null;
  startOn: string;
  dueOn: string;
  projectManagerUserId: string | null;
  projectManagerName: string;
  notes: string;
  assignments: PmoAssignment[];
  createdAt: string;
  updatedAt: string;
};

export type PmoAppointmentLetter = {
  id: string;
  projectId: string;
  letterDate: string;
  reference: string;
  awardedValueZar: number | null;
  signatory: string;
  notes: string;
};

export type PmoSla = {
  id: string;
  projectId: string;
  term: string;
  serviceLevels: string;
  penalties: string;
  reviewDates: string[];
  notes: string;
};

export type PmoPurchaseOrder = {
  id: string;
  projectId: string;
  poNumber: string;
  amountZar: number | null;
  poDate: string;
  remainingBalanceZar: number | null;
  notes: string;
};

export type PmoCharter = {
  id: string;
  projectId: string;
  objectives: string;
  scopeIn: string;
  scopeOut: string;
  deliverables: string;
  milestones: string;
  budgetZar: number | null;
  assumptions: string;
  constraints: string;
};

export type PmoPlan = {
  id: string;
  projectId: string;
  schedule: string;
  wbs: string;
  resourcing: string;
  budgetPlan: string;
  qualityApproach: string;
  changeControl: string;
};

export type PmoStatusReport = {
  id: string;
  projectId: string;
  period: string;
  cadence: string;
  progress: string;
  percentComplete: number;
  milestonesHit: string;
  risksIssues: string;
  nextSteps: string;
  reportedAt: string;
};

export type PmoStakeholder = {
  id: string;
  projectId: string;
  contactId: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  organisation: string;
  influence: string;
  interest: string;
  engagementNotes: string;
};

export type PmoProjectWorkspace = {
  project: PmoProject;
  appointment: PmoAppointmentLetter | null;
  sla: PmoSla | null;
  purchaseOrder: PmoPurchaseOrder | null;
  charter: PmoCharter | null;
  plan: PmoPlan | null;
  statusReports: PmoStatusReport[];
  stakeholders: PmoStakeholder[];
};

export type PmoPortfolioFilters = {
  accountId?: string;
  status?: PmoProjectStatus | "";
  health?: PmoProjectHealth | "";
  projectManager?: string;
};
