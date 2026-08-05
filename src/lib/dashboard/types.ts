import type { LeadStatus } from "@/lib/leads/types";
import type {
  PmoProjectHealth,
  PmoProjectStatus,
} from "@/lib/pmo/types";

export type DashboardFilters = {
  /** Inclusive YYYY-MM-DD in Africa/Johannesburg (optional). */
  from?: string;
  /** Inclusive YYYY-MM-DD in Africa/Johannesburg (optional). */
  to?: string;
  accountId?: string;
  lane?: string;
  sector?: "public" | "private" | "";
  owner?: string;
};

export type DashboardBlockedMetric = {
  key: string;
  reason: string;
};

export type NamedCount = {
  key: string;
  label: string;
  count: number;
  href?: string;
};

export type DashboardKpi = {
  key: string;
  label: string;
  value: string;
  hint?: string;
  coral?: boolean;
  href?: string;
  blocked?: boolean;
};

export type DashboardTopAccount = {
  id: string;
  clientName: string;
  projectTitle: string;
  valueZar: number | null;
  href: string;
};

export type DashboardPoRollup = {
  projectId: string;
  projectName: string;
  accountName: string;
  poValueZar: number | null;
  invoicedZar: number | null;
  remainingZar: number | null;
  href: string;
};

export type DashboardSnapshot = {
  generatedAt: string;
  role: "admin" | "member";
  filters: DashboardFilters;
  blocked: DashboardBlockedMetric[];
  leads: {
    openCount: number;
    /** Sum of linked opportunity estimated values when lead has opportunityId. */
    linkedOpportunityValueZar: number | null;
    byStage: NamedCount[];
    conversionRate: number | null;
    conversionHint: string;
    newThisMonth: number;
    newLastMonth: number;
    kpis: DashboardKpi[];
  };
  accounts: {
    activeCount: number;
    totalContractValueZar: number | null;
    newThisMonth: number;
    topByValue: DashboardTopAccount[];
    kpis: DashboardKpi[];
  };
  pmo: {
    byStatus: NamedCount[];
    byHealth: NamedCount[];
    atRiskCount: number;
    dueIn30Days: number;
    kpis: DashboardKpi[];
    available: boolean;
  };
  ideas: {
    available: boolean;
    byStatus: NamedCount[];
    newThisMonth: number;
    approvalRate: number | null;
    approvalHint: string;
    activeRdByStage: NamedCount[];
    inProgressCount: number;
    completedCount: number;
    overdueAtRiskCount: number;
    kpis: DashboardKpi[];
  };
  finance: {
    available: boolean;
    fullAccess: boolean;
    kpis: DashboardKpi[];
    poRollup: DashboardPoRollup[];
    poTotals: {
      poValueZar: number | null;
      invoicedZar: number | null;
      remainingZar: number | null;
    } | null;
    submittedBidValueZar: number | null;
    winRate: number | null;
    winRateHint: string;
  };
  filterOptions: {
    accounts: Array<{ id: string; name: string }>;
    lanes: string[];
    owners: string[];
  };
};

export type LeadStageKey = LeadStatus;
export type PmoStatusKey = PmoProjectStatus;
export type PmoHealthKey = PmoProjectHealth;
