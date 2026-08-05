import { zaCalendarDate, formatZar } from "@/lib/opportunities/dates";
import type { Account } from "@/lib/accounts/types";
import type { Lead } from "@/lib/leads/types";
import { LEAD_STATUSES } from "@/lib/leads/types";
import type { Opportunity } from "@/lib/opportunities/types";
import {
  IDEA_STATUS_LABELS,
  IDEA_STATUSES,
  RD_STAGE_LABELS,
  RD_STAGES,
  type Idea,
  type RdItem,
} from "@/lib/ideas/types";
import {
  PMO_HEALTH_LABELS,
  PMO_PROJECT_HEALTH,
  PMO_PROJECT_STATUSES,
  PMO_STATUS_LABELS,
  type PmoProject,
  type PmoProjectWorkspace,
} from "@/lib/pmo/types";
import type {
  DashboardBlockedMetric,
  DashboardFilters,
  DashboardSnapshot,
  NamedCount,
} from "@/lib/dashboard/types";

const OPEN_LEAD_STATUSES = new Set(["new", "contacted", "qualified"]);

function monthKey(iso: string): string {
  const ymd = zaCalendarDate(iso);
  return ymd ? ymd.slice(0, 7) : "";
}

function currentAndLastMonthKeys(now = new Date()): {
  thisMonth: string;
  lastMonth: string;
} {
  const thisMonth = monthKey(now.toISOString());
  const d = new Date(now);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return { thisMonth, lastMonth: monthKey(d.toISOString()) };
}

function inDateRange(iso: string, filters: DashboardFilters): boolean {
  if (!filters.from && !filters.to) return true;
  const ymd = zaCalendarDate(iso);
  if (!ymd) return false;
  if (filters.from && ymd < filters.from) return false;
  if (filters.to && ymd > filters.to) return false;
  return true;
}

function matchesOwner(ownerName: string, ownerFilter?: string): boolean {
  if (!ownerFilter?.trim()) return true;
  return ownerName.toLowerCase().includes(ownerFilter.trim().toLowerCase());
}

function pct(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n * 1000) / 10}%`;
}

function sumZar(values: Array<number | null | undefined>): number | null {
  let sum = 0;
  let any = false;
  for (const v of values) {
    if (v == null || Number.isNaN(v)) continue;
    sum += v;
    any = true;
  }
  return any ? sum : null;
}

export type AggregateInput = {
  role: "admin" | "member";
  filters: DashboardFilters;
  leads: Lead[];
  accounts: Account[];
  projects: PmoProject[];
  workspaces: PmoProjectWorkspace[];
  opportunities: Opportunity[];
  opportunityById: Map<string, Opportunity>;
  ideas: Idea[];
  rdItems: RdItem[];
  pmoAvailable: boolean;
  ideasAvailable: boolean;
  fullFinance: boolean;
  pipelineFinance: boolean;
  now?: Date;
};

export function aggregateDashboard(input: AggregateInput): DashboardSnapshot {
  const now = input.now ?? new Date();
  const { thisMonth, lastMonth } = currentAndLastMonthKeys(now);
  const todayYmd = zaCalendarDate(now);
  const in30 = (() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 30);
    return zaCalendarDate(d);
  })();

  const blocked: DashboardBlockedMetric[] = [
    {
      key: "leads.estimatedValue",
      reason:
        "Lead model has no estimatedValueZar field. Showing linked opportunity value only when opportunityId is set. Approve adding estimatedValueZar on leads to unlock native pipeline value.",
    },
    {
      key: "finance.invoices",
      reason:
        "invoices table exists in DB schema but there is no invoice store, API, or UI. Total invoiced / paid / outstanding / overdue, ageing buckets, and revenue-by-month are blocked until an invoices module is approved.",
    },
  ];

  const filteredLeads = input.leads.filter((lead) => {
    if (input.filters.accountId && lead.accountId !== input.filters.accountId) {
      return false;
    }
    if (input.filters.lane && lead.lane !== input.filters.lane) return false;
    if (input.filters.sector && lead.sector !== input.filters.sector) {
      return false;
    }
    if (!matchesOwner(lead.ownerName, input.filters.owner)) return false;
    if (!inDateRange(lead.createdAt, input.filters)) return false;
    return true;
  });

  const filteredAccounts = input.accounts.filter((account) => {
    if (input.filters.accountId && account.id !== input.filters.accountId) {
      return false;
    }
    if (input.filters.lane && account.lane !== input.filters.lane) return false;
    if (input.filters.sector && account.sector !== input.filters.sector) {
      return false;
    }
    if (!matchesOwner(account.ownerName, input.filters.owner)) return false;
    if (!inDateRange(account.createdAt, input.filters)) return false;
    return true;
  });

  const filteredProjects = input.projects.filter((project) => {
    if (
      input.filters.accountId &&
      project.accountId !== input.filters.accountId
    ) {
      return false;
    }
    // PMO projects have no lane/sector — filter via linked account when set
    if (input.filters.lane || input.filters.sector) {
      const account = input.accounts.find((a) => a.id === project.accountId);
      if (!account) return false;
      if (input.filters.lane && account.lane !== input.filters.lane) return false;
      if (input.filters.sector && account.sector !== input.filters.sector) {
        return false;
      }
    }
    if (input.filters.owner) {
      const needle = input.filters.owner.trim().toLowerCase();
      const onTeam =
        project.projectManagerName.toLowerCase().includes(needle) ||
        project.assignments.some((a) =>
          a.userName.toLowerCase().includes(needle),
        );
      if (!onTeam) return false;
    }
    // Date range applies to dueOn when present, else createdAt
    const dateIso = project.dueOn || project.createdAt;
    if (!inDateRange(dateIso, input.filters)) return false;
    return true;
  });

  const filteredOpps = input.opportunities.filter((opp) => {
    if (input.filters.lane && opp.lane !== input.filters.lane) return false;
    if (input.filters.sector && opp.sector !== input.filters.sector) {
      return false;
    }
    if (!matchesOwner(opp.ownerName, input.filters.owner)) return false;
    if (!inDateRange(opp.createdAt, input.filters)) return false;
    // accountId does not exist on opportunities — skip unless we can match buyer to account client
    if (input.filters.accountId) {
      const account = input.accounts.find(
        (a) => a.id === input.filters.accountId,
      );
      if (
        account &&
        !opp.buyer.toLowerCase().includes(account.clientName.toLowerCase())
      ) {
        return false;
      }
    }
    return true;
  });

  const openLeads = filteredLeads.filter((l) =>
    OPEN_LEAD_STATUSES.has(l.status),
  );
  const linkedValues = openLeads.map((lead) => {
    if (!lead.opportunityId) return null;
    return input.opportunityById.get(lead.opportunityId)?.estimatedValueZar ?? null;
  });
  const linkedOpportunityValueZar = sumZar(linkedValues);

  const byStage: NamedCount[] = LEAD_STATUSES.map((status) => ({
    key: status,
    label: status.replace(/_/g, " "),
    count: filteredLeads.filter((l) => l.status === status).length,
    href: "/leads",
  }));

  const converted = filteredLeads.filter((l) => l.status === "converted").length;
  const lost = filteredLeads.filter((l) => l.status === "lost").length;
  const decided = converted + lost;
  const conversionRate = decided > 0 ? converted / decided : null;

  const newThisMonth = filteredLeads.filter(
    (l) => monthKey(l.createdAt) === thisMonth,
  ).length;
  const newLastMonth = filteredLeads.filter(
    (l) => monthKey(l.createdAt) === lastMonth,
  ).length;

  const activeAccounts = filteredAccounts.filter((a) => a.status === "active");
  const totalContractValueZar = sumZar(
    activeAccounts.map((a) => a.valueZar),
  );
  const accountsNewThisMonth = filteredAccounts.filter(
    (a) => monthKey(a.createdAt) === thisMonth,
  ).length;
  const topByValue = [...filteredAccounts]
    .filter((a) => a.valueZar != null)
    .sort((a, b) => (b.valueZar ?? 0) - (a.valueZar ?? 0))
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      clientName: a.clientName,
      projectTitle: a.projectTitle,
      valueZar: a.valueZar,
      href: `/accounts/${a.id}`,
    }));

  const byStatus: NamedCount[] = PMO_PROJECT_STATUSES.map((status) => ({
    key: status,
    label: PMO_STATUS_LABELS[status],
    count: filteredProjects.filter((p) => p.status === status).length,
    href: `/pmo?status=${status}`,
  }));

  const byHealth: NamedCount[] = PMO_PROJECT_HEALTH.map((health) => ({
    key: health,
    label: PMO_HEALTH_LABELS[health],
    count: filteredProjects.filter((p) => p.health === health).length,
    href: `/pmo?health=${health}`,
  }));

  const atRiskCount = filteredProjects.filter((p) => {
    if (p.status === "closed") return false;
    const overdue =
      Boolean(p.dueOn) && zaCalendarDate(p.dueOn) < todayYmd;
    return p.health === "amber" || p.health === "red" || overdue;
  }).length;

  const dueIn30Days = filteredProjects.filter((p) => {
    if (p.status === "closed" || !p.dueOn) return false;
    const due = zaCalendarDate(p.dueOn);
    return due >= todayYmd && due <= in30;
  }).length;

  const projectIds = new Set(filteredProjects.map((p) => p.id));
  const scopedWorkspaces = input.workspaces.filter((w) =>
    projectIds.has(w.project.id),
  );

  const poRollup = scopedWorkspaces
    .map((w) => {
      const po = w.purchaseOrder;
      if (!po) return null;
      const poValueZar = po.amountZar;
      const remainingZar = po.remainingBalanceZar;
      const invoicedZar =
        poValueZar != null && remainingZar != null
          ? Math.max(0, poValueZar - remainingZar)
          : null;
      return {
        projectId: w.project.id,
        projectName: w.project.name,
        accountName: w.project.accountName,
        poValueZar,
        invoicedZar,
        remainingZar,
        href: `/accounts/${w.project.accountId}/pmo/${w.project.id}`,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  const poTotals =
    poRollup.length > 0
      ? {
          poValueZar: sumZar(poRollup.map((r) => r.poValueZar)),
          invoicedZar: sumZar(poRollup.map((r) => r.invoicedZar)),
          remainingZar: sumZar(poRollup.map((r) => r.remainingZar)),
        }
      : null;

  const submittedBidValueZar = sumZar(
    filteredOpps
      .filter((o) => o.stage === "Submitted" || o.stage === "Awarded")
      .map((o) => o.estimatedValueZar),
  );
  const won = filteredOpps.filter(
    (o) =>
      o.stage === "Awarded" ||
      o.stage === "Closed (Won)" ||
      o.stage === "Active account",
  ).length;
  const lostBids = filteredOpps.filter((o) => o.stage === "Closed (Lost)").length;
  const bidDecided = won + lostBids;
  const winRate = bidDecided > 0 ? won / bidDecided : null;

  const leadKpis = [
    {
      key: "open-leads",
      label: "Open leads",
      value: String(openLeads.length),
      hint: "New · contacted · qualified",
      href: "/leads",
    },
    {
      key: "lead-value",
      label: "Est. value (linked)",
      value: formatZar(linkedOpportunityValueZar),
      hint: "From linked opportunities only",
      href: "/leads",
      blocked: true,
    },
    {
      key: "conversion",
      label: "Conversion rate",
      value: pct(conversionRate),
      hint:
        decided > 0
          ? `${converted} won / ${decided} decided`
          : "No converted or lost leads yet",
      href: "/accounts",
    },
    {
      key: "new-leads",
      label: "New this month",
      value: String(newThisMonth),
      hint: `vs ${newLastMonth} last month`,
      href: "/leads",
    },
  ];

  const accountKpis = [
    {
      key: "active-accounts",
      label: "Active accounts",
      value: String(activeAccounts.length),
      href: "/accounts",
    },
    {
      key: "contract-value",
      label: "Contract value",
      value: formatZar(totalContractValueZar),
      hint: "Active accounts",
      href: "/accounts",
    },
    {
      key: "new-accounts",
      label: "New this month",
      value: String(accountsNewThisMonth),
      href: "/accounts",
    },
  ];

  const pmoKpis = input.pmoAvailable
    ? [
        {
          key: "at-risk",
          label: "At-risk projects",
          value: String(atRiskCount),
          hint: "Amber / red / overdue",
          coral: atRiskCount > 0,
          href: "/pmo?atRisk=1",
        },
        {
          key: "due-30",
          label: "Due in 30 days",
          value: String(dueIn30Days),
          href: "/pmo",
        },
        {
          key: "in-delivery",
          label: "In delivery",
          value: String(
            filteredProjects.filter((p) => p.status === "in_delivery").length,
          ),
          href: "/pmo?status=in_delivery",
        },
      ]
    : [];

  const filteredIdeas = input.ideasAvailable
    ? input.ideas.filter((idea) => {
        if (!matchesOwner(idea.submitterName, input.filters.owner)) return false;
        if (input.filters.lane && idea.category !== input.filters.lane) {
          return false;
        }
        if (!inDateRange(idea.createdAt, input.filters)) return false;
        return true;
      })
    : [];

  const filteredRd = input.ideasAvailable
    ? input.rdItems.filter((item) => {
        if (input.filters.owner) {
          const needle = input.filters.owner.trim().toLowerCase();
          const onTeam =
            item.ownerName.toLowerCase().includes(needle) ||
            item.assignments.some((a) =>
              a.userName.toLowerCase().includes(needle),
            );
          if (!onTeam) return false;
        }
        const dateIso = item.targetDate || item.createdAt;
        if (!inDateRange(dateIso, input.filters)) return false;
        return true;
      })
    : [];

  const ideasByStatus: NamedCount[] = IDEA_STATUSES.map((status) => ({
    key: status,
    label: IDEA_STATUS_LABELS[status],
    count: filteredIdeas.filter((i) => i.status === status).length,
    href: `/ideas?status=${status}`,
  }));

  const ideasNewThisMonth = filteredIdeas.filter(
    (i) => monthKey(i.createdAt) === thisMonth,
  ).length;

  const decidedIdeas = filteredIdeas.filter((i) =>
    ["approved", "in_rd", "rejected", "parked"].includes(i.status),
  );
  const approvedIdeas = filteredIdeas.filter((i) =>
    ["approved", "in_rd"].includes(i.status),
  );
  const ideaApprovalRate =
    decidedIdeas.length > 0
      ? approvedIdeas.length / decidedIdeas.length
      : null;

  const rdByStage: NamedCount[] = RD_STAGES.map((stage) => ({
    key: stage,
    label: RD_STAGE_LABELS[stage],
    count: filteredRd.filter((i) => i.stage === stage).length,
    href: `/rd?stage=${stage}`,
  }));

  const rdInProgress = filteredRd.filter((i) =>
    ["backlog", "researching", "prototyping", "validating"].includes(i.stage),
  ).length;
  const rdCompleted = filteredRd.filter((i) => i.stage === "completed").length;
  const rdOverdueAtRisk = filteredRd.filter((i) => {
    if (i.stage === "completed" || i.stage === "shelved") return false;
    const overdue =
      Boolean(i.targetDate) && zaCalendarDate(i.targetDate!) < todayYmd;
    return i.atRisk || overdue;
  }).length;

  const ideasKpis = input.ideasAvailable
    ? [
        {
          key: "ideas-new",
          label: "New ideas (month)",
          value: String(ideasNewThisMonth),
          href: "/ideas",
        },
        {
          key: "ideas-approval",
          label: "Idea approval rate",
          value: pct(ideaApprovalRate),
          hint:
            decidedIdeas.length > 0
              ? `${approvedIdeas.length} approved / ${decidedIdeas.length} decided`
              : "No decided ideas yet",
          href: "/ideas",
        },
        {
          key: "rd-active",
          label: "Active R&D",
          value: String(rdInProgress),
          hint: `${rdCompleted} completed`,
          href: "/rd",
        },
        {
          key: "rd-at-risk",
          label: "R&D overdue / at-risk",
          value: String(rdOverdueAtRisk),
          coral: rdOverdueAtRisk > 0,
          href: "/rd?atRisk=1",
        },
      ]
    : [];

  const financeKpis = [];
  if (input.pipelineFinance) {
    financeKpis.push(
      {
        key: "submitted-bid-value",
        label: "Submitted bid value",
        value: formatZar(submittedBidValueZar),
        hint: "Submitted + awarded stages",
        href: "/opportunities",
      },
      {
        key: "win-rate",
        label: "Win rate",
        value: pct(winRate),
        hint:
          bidDecided > 0
            ? `${won} won / ${bidDecided} decided bids`
            : "No awarded or lost bids yet",
        href: "/opportunities",
      },
    );
  }
  if (input.fullFinance && poTotals) {
    financeKpis.push(
      {
        key: "po-value",
        label: "PO value",
        value: formatZar(poTotals.poValueZar),
        hint: "Across scoped projects",
        href: "/pmo",
      },
      {
        key: "po-invoiced",
        label: "PO drawn (est.)",
        value: formatZar(poTotals.invoicedZar),
        hint: "PO amount − remaining balance",
        href: "/pmo",
      },
      {
        key: "po-remaining",
        label: "PO remaining",
        value: formatZar(poTotals.remainingZar),
        href: "/pmo",
      },
    );
  }
  // Always surface blocked invoice KPIs for admins so gaps are visible
  if (input.fullFinance) {
    for (const label of [
      "Total invoiced",
      "Total paid",
      "Total outstanding",
      "Total overdue",
    ]) {
      financeKpis.push({
        key: `invoice-${label}`,
        label,
        value: "—",
        hint: "Invoices module not available",
        blocked: true,
        coral: label === "Total overdue",
        href: undefined,
      });
    }
  }

  const accountOptions = [...input.accounts]
    .map((a) => ({ id: a.id, name: a.clientName }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const lanes = Array.from(
    new Set([
      ...input.leads.map((l) => l.lane),
      ...input.accounts.map((a) => a.lane),
    ]),
  ).sort();

  const owners = Array.from(
    new Set([
      ...input.leads.map((l) => l.ownerName),
      ...input.accounts.map((a) => a.ownerName),
      ...input.projects.map((p) => p.projectManagerName),
    ]),
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return {
    generatedAt: now.toISOString(),
    role: input.role,
    filters: input.filters,
    blocked,
    leads: {
      openCount: openLeads.length,
      linkedOpportunityValueZar,
      byStage,
      conversionRate,
      conversionHint:
        decided > 0
          ? `${converted} converted of ${decided} decided (converted + lost)`
          : "No decided leads yet",
      newThisMonth,
      newLastMonth,
      kpis: leadKpis,
    },
    accounts: {
      activeCount: activeAccounts.length,
      totalContractValueZar,
      newThisMonth: accountsNewThisMonth,
      topByValue,
      kpis: accountKpis,
    },
    pmo: {
      byStatus,
      byHealth,
      atRiskCount,
      dueIn30Days,
      kpis: pmoKpis,
      available: input.pmoAvailable,
    },
    ideas: {
      available: input.ideasAvailable,
      byStatus: ideasByStatus,
      newThisMonth: ideasNewThisMonth,
      approvalRate: ideaApprovalRate,
      approvalHint:
        decidedIdeas.length > 0
          ? `${approvedIdeas.length} approved of ${decidedIdeas.length} decided (approved/in R&D vs rejected/parked)`
          : "No decided ideas yet",
      activeRdByStage: rdByStage,
      inProgressCount: rdInProgress,
      completedCount: rdCompleted,
      overdueAtRiskCount: rdOverdueAtRisk,
      kpis: ideasKpis,
    },
    finance: {
      available: input.pipelineFinance || input.fullFinance,
      fullAccess: input.fullFinance,
      kpis: financeKpis,
      poRollup: input.fullFinance ? poRollup : [],
      poTotals: input.fullFinance ? poTotals : null,
      submittedBidValueZar: input.pipelineFinance
        ? submittedBidValueZar
        : null,
      winRate: input.pipelineFinance ? winRate : null,
      winRateHint:
        bidDecided > 0
          ? `${won} won of ${bidDecided} decided bids (excl. still-open submissions)`
          : "No decided bids yet",
    },
    filterOptions: {
      accounts: accountOptions,
      lanes,
      owners,
    },
  };
}
