import type { PmoProjectWorkspace } from "@/lib/pmo/types";

/** Stable demo ids so portfolio / deep links stay consistent across JSON + Postgres seeds. */
export const DEMO_PMO_PROJECT_ID = "a1000000-0000-4000-8000-000000000001";
export const DEMO_PMO_ACCOUNT_ID = "acct-innovationhub";
export const DEMO_PMO_ACCOUNT_NAME = "The Innovation Hub";
export const DEMO_PM_USER_ID = "user-admin";
export const DEMO_PM_NAME = "Ndumiso Somdyala";
export const DEMO_MEMBER_USER_ID = "user-member-1";
export const DEMO_MEMBER_NAME = "Bid Team Member";

export function seedDemoWorkspace(now = new Date()): PmoProjectWorkspace {
  const iso = now.toISOString();
  const on = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };
  const until = (daysAhead: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString();
  };

  return {
    project: {
      id: DEMO_PMO_PROJECT_ID,
      accountId: DEMO_PMO_ACCOUNT_ID,
      accountName: DEMO_PMO_ACCOUNT_NAME,
      name: "Digital platforms support and website enhancements",
      status: "in_delivery",
      health: "amber",
      valueZar: 680000,
      startOn: on(90),
      dueOn: until(120),
      projectManagerUserId: DEMO_PM_USER_ID,
      projectManagerName: DEMO_PM_NAME,
      notes:
        "Demo PMO project seeded under The Innovation Hub. Appointment, SLA, PO and charter are populated for walkthrough.",
      assignments: [
        {
          id: "a1000000-0000-4000-8000-000000000010",
          projectId: DEMO_PMO_PROJECT_ID,
          userId: DEMO_PM_USER_ID,
          userName: DEMO_PM_NAME,
        },
        {
          id: "a1000000-0000-4000-8000-000000000011",
          projectId: DEMO_PMO_PROJECT_ID,
          userId: DEMO_MEMBER_USER_ID,
          userName: DEMO_MEMBER_NAME,
        },
      ],
      createdAt: iso,
      updatedAt: iso,
    },
    appointment: {
      id: "a1000000-0000-4000-8000-000000000020",
      projectId: DEMO_PMO_PROJECT_ID,
      letterDate: on(100),
      reference: "TIH-AL-2025-014",
      awardedValueZar: 680000,
      signatory: "CIO — The Innovation Hub",
      notes: "Signed appointment letter on file (demo).",
    },
    sla: {
      id: "a1000000-0000-4000-8000-000000000021",
      projectId: DEMO_PMO_PROJECT_ID,
      term: "12 months + 6-month optional extension",
      serviceLevels: "P1 ≤ 4h response; P2 ≤ 1 business day; monthly status pack.",
      penalties: "Service credits for repeated P1 misses (demo wording).",
      reviewDates: [until(30).slice(0, 10), until(90).slice(0, 10)],
      notes: "",
    },
    purchaseOrder: {
      id: "a1000000-0000-4000-8000-000000000022",
      projectId: DEMO_PMO_PROJECT_ID,
      poNumber: "PO-TIH-88421",
      amountZar: 680000,
      poDate: on(95),
      remainingBalanceZar: 410000,
      notes: "Three drawdowns billed to date.",
    },
    charter: {
      id: "a1000000-0000-4000-8000-000000000023",
      projectId: DEMO_PMO_PROJECT_ID,
      objectives:
        "Stabilise digital platforms, ship agreed website enhancements, and hand over runbooks.",
      scopeIn: "CMS upgrades, accessibility fixes, hosting support, monthly reporting.",
      scopeOut: "Net-new product builds outside the RFQ schedule.",
      deliverables: "Enhanced site, support runbook, monthly status reports.",
      milestones: "Kick-off → sprint 1 hardening → UAT → go-live → warranty.",
      budgetZar: 680000,
      assumptions: "Client content owners available within 5 business days.",
      constraints: "Change freeze during annual open day.",
    },
    plan: {
      id: "a1000000-0000-4000-8000-000000000024",
      projectId: DEMO_PMO_PROJECT_ID,
      schedule: "Bi-weekly sprints; monthly steering.",
      wbs: "Discovery → Build → UAT → Hypercare → Warranty.",
      resourcing: "1 PM, 1 lead developer, 0.5 designer.",
      budgetPlan: "Time & materials against PO drawdowns.",
      qualityApproach: "Definition of done + accessibility checklist before UAT.",
      changeControl: "Written CR via PM; >R25k needs director approval.",
    },
    statusReports: [
      {
        id: "a1000000-0000-4000-8000-000000000025",
        projectId: DEMO_PMO_PROJECT_ID,
        period: "Jul 2026",
        cadence: "monthly",
        progress:
          "Accessibility backlog 60% complete; homepage redesign in UAT. Amber due to content lag.",
        percentComplete: 45,
        milestonesHit: "Sprint 3 closed; staging refresh shipped.",
        risksIssues: "Content freeze delayed by 2 weeks — tracked with client.",
        nextSteps: "Close UAT comments; schedule go-live rehearsal.",
        reportedAt: on(5),
      },
    ],
    stakeholders: [
      {
        id: "a1000000-0000-4000-8000-000000000030",
        projectId: DEMO_PMO_PROJECT_ID,
        contactId: "a1000000-0000-4000-8000-000000000040",
        contactName: "Thandi Mokoena",
        contactRole: "Project sponsor",
        contactEmail: "thandi.mokoena@example-tih.co.za",
        organisation: DEMO_PMO_ACCOUNT_NAME,
        influence: "high",
        interest: "high",
        engagementNotes: "Monthly steering; prefers written briefs.",
      },
      {
        id: "a1000000-0000-4000-8000-000000000031",
        projectId: DEMO_PMO_PROJECT_ID,
        contactId: "a1000000-0000-4000-8000-000000000041",
        contactName: "Johan Botha",
        contactRole: "ICT lead",
        contactEmail: "johan.botha@example-tih.co.za",
        organisation: DEMO_PMO_ACCOUNT_NAME,
        influence: "medium",
        interest: "high",
        engagementNotes: "Technical contact for releases.",
      },
      {
        id: "a1000000-0000-4000-8000-000000000032",
        projectId: DEMO_PMO_PROJECT_ID,
        contactId: "a1000000-0000-4000-8000-000000000042",
        contactName: "Lerato Dlamini",
        contactRole: "Content owner",
        contactEmail: "lerato.dlamini@example-tih.co.za",
        organisation: DEMO_PMO_ACCOUNT_NAME,
        influence: "low",
        interest: "medium",
        engagementNotes: "Blocks UAT content approvals.",
      },
    ],
  };
}
