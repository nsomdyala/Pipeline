import "server-only";

import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  contacts as contactsTable,
  pmoAppointmentLetters,
  pmoCharters,
  pmoPlans,
  pmoProjectAssignments,
  pmoProjects,
  pmoProjectStakeholders,
  pmoPurchaseOrders,
  pmoSlas,
  pmoStatusReports,
} from "@/db/schema";
import {
  DEMO_PMO_PROJECT_ID,
  seedDemoWorkspace,
} from "@/lib/pmo/seed";
import type {
  PmoAppointmentLetter,
  PmoCharter,
  PmoPlan,
  PmoPortfolioFilters,
  PmoProject,
  PmoProjectHealth,
  PmoProjectStatus,
  PmoProjectWorkspace,
  PmoPurchaseOrder,
  PmoSla,
  PmoStakeholder,
  PmoStatusReport,
} from "@/lib/pmo/types";
import {
  PMO_PROJECT_HEALTH,
  PMO_PROJECT_STATUSES,
} from "@/lib/pmo/types";

type ProjectRow = typeof pmoProjects.$inferSelect;
type AssignmentRow = typeof pmoProjectAssignments.$inferSelect;

function asIso(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString();
}

function numOrNull(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asStatus(value: string): PmoProjectStatus {
  return PMO_PROJECT_STATUSES.includes(value as PmoProjectStatus)
    ? (value as PmoProjectStatus)
    : "not_started";
}

function asHealth(value: string): PmoProjectHealth {
  return PMO_PROJECT_HEALTH.includes(value as PmoProjectHealth)
    ? (value as PmoProjectHealth)
    : "green";
}

function toProject(
  row: ProjectRow,
  assignments: AssignmentRow[],
): PmoProject {
  return {
    id: row.id,
    accountId: row.accountId,
    accountName: row.accountName ?? "",
    name: row.name,
    status: asStatus(row.status),
    health: asHealth(row.health),
    valueZar: numOrNull(row.valueZar),
    startOn: asIso(row.startOn),
    dueOn: asIso(row.dueOn),
    projectManagerUserId: row.projectManagerUserId,
    projectManagerName: row.projectManagerName ?? "",
    notes: row.notes ?? "",
    assignments: assignments.map((a) => ({
      id: a.id,
      projectId: a.projectId,
      userId: a.userId,
      userName: a.userName,
    })),
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

async function ensureSeeded(): Promise<void> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(pmoProjects);
  if ((n ?? 0) > 0) return;

  const demo = seedDemoWorkspace();
  const p = demo.project;

  await db.insert(pmoProjects).values({
    id: p.id,
    accountId: p.accountId,
    accountName: p.accountName,
    name: p.name,
    status: p.status,
    health: p.health,
    valueZar: p.valueZar != null ? String(p.valueZar) : null,
    startOn: p.startOn ? new Date(p.startOn) : null,
    dueOn: p.dueOn ? new Date(p.dueOn) : null,
    projectManagerUserId: p.projectManagerUserId,
    projectManagerName: p.projectManagerName,
    notes: p.notes,
  });

  if (p.assignments.length > 0) {
    await db.insert(pmoProjectAssignments).values(
      p.assignments.map((a) => ({
        id: a.id,
        projectId: a.projectId,
        userId: a.userId,
        userName: a.userName,
      })),
    );
  }

  if (demo.appointment) {
    await db.insert(pmoAppointmentLetters).values({
      id: demo.appointment.id,
      projectId: DEMO_PMO_PROJECT_ID,
      letterDate: demo.appointment.letterDate
        ? new Date(demo.appointment.letterDate)
        : null,
      reference: demo.appointment.reference,
      awardedValueZar:
        demo.appointment.awardedValueZar != null
          ? String(demo.appointment.awardedValueZar)
          : null,
      signatory: demo.appointment.signatory,
      notes: demo.appointment.notes,
    });
  }

  if (demo.sla) {
    await db.insert(pmoSlas).values({
      id: demo.sla.id,
      projectId: DEMO_PMO_PROJECT_ID,
      term: demo.sla.term,
      serviceLevels: demo.sla.serviceLevels,
      penalties: demo.sla.penalties,
      reviewDates: demo.sla.reviewDates,
      notes: demo.sla.notes,
    });
  }

  if (demo.purchaseOrder) {
    await db.insert(pmoPurchaseOrders).values({
      id: demo.purchaseOrder.id,
      projectId: DEMO_PMO_PROJECT_ID,
      poNumber: demo.purchaseOrder.poNumber,
      amountZar:
        demo.purchaseOrder.amountZar != null
          ? String(demo.purchaseOrder.amountZar)
          : null,
      poDate: demo.purchaseOrder.poDate
        ? new Date(demo.purchaseOrder.poDate)
        : null,
      remainingBalanceZar:
        demo.purchaseOrder.remainingBalanceZar != null
          ? String(demo.purchaseOrder.remainingBalanceZar)
          : null,
      notes: demo.purchaseOrder.notes,
    });
  }

  if (demo.charter) {
    await db.insert(pmoCharters).values({
      id: demo.charter.id,
      projectId: DEMO_PMO_PROJECT_ID,
      objectives: demo.charter.objectives,
      scopeIn: demo.charter.scopeIn,
      scopeOut: demo.charter.scopeOut,
      deliverables: demo.charter.deliverables,
      milestones: demo.charter.milestones,
      budgetZar:
        demo.charter.budgetZar != null ? String(demo.charter.budgetZar) : null,
      assumptions: demo.charter.assumptions,
      constraints: demo.charter.constraints,
    });
  }

  if (demo.plan) {
    await db.insert(pmoPlans).values({
      id: demo.plan.id,
      projectId: DEMO_PMO_PROJECT_ID,
      schedule: demo.plan.schedule,
      wbs: demo.plan.wbs,
      resourcing: demo.plan.resourcing,
      budgetPlan: demo.plan.budgetPlan,
      qualityApproach: demo.plan.qualityApproach,
      changeControl: demo.plan.changeControl,
    });
  }

  for (const report of demo.statusReports) {
    await db.insert(pmoStatusReports).values({
      id: report.id,
      projectId: DEMO_PMO_PROJECT_ID,
      period: report.period,
      cadence: report.cadence,
      progress: report.progress,
      percentComplete: report.percentComplete,
      milestonesHit: report.milestonesHit,
      risksIssues: report.risksIssues,
      nextSteps: report.nextSteps,
      reportedAt: new Date(report.reportedAt),
    });
  }

  for (const s of demo.stakeholders) {
    await db.insert(contactsTable).values({
      id: s.contactId,
      accountId: p.accountId,
      organisation: s.organisation,
      name: s.contactName,
      role: s.contactRole,
      email: s.contactEmail,
      phone: "",
      notes: "",
    });
    await db.insert(pmoProjectStakeholders).values({
      id: s.id,
      projectId: DEMO_PMO_PROJECT_ID,
      contactId: s.contactId,
      influence: s.influence,
      interest: s.interest,
      engagementNotes: s.engagementNotes,
    });
  }
}

async function loadAssignments(
  projectIds: string[],
): Promise<Map<string, AssignmentRow[]>> {
  const map = new Map<string, AssignmentRow[]>();
  if (projectIds.length === 0) return map;
  const rows = await db
    .select()
    .from(pmoProjectAssignments)
    .where(inArray(pmoProjectAssignments.projectId, projectIds));
  for (const row of rows) {
    const list = map.get(row.projectId) ?? [];
    list.push(row);
    map.set(row.projectId, list);
  }
  return map;
}

function matchesFilters(project: PmoProject, filters: PmoPortfolioFilters) {
  if (filters.accountId && project.accountId !== filters.accountId) return false;
  if (filters.status && project.status !== filters.status) return false;
  if (filters.health && project.health !== filters.health) return false;
  if (filters.projectManager) {
    const needle = filters.projectManager.trim().toLowerCase();
    if (!project.projectManagerName.toLowerCase().includes(needle)) return false;
  }
  return true;
}

export async function pgListProjects(options: {
  filters?: PmoPortfolioFilters;
  /** When set, only projects assigned to this user (or where they are PM). */
  assignedUserId?: string | null;
}): Promise<PmoProject[]> {
  await ensureSeeded();

  const rows = await db.select().from(pmoProjects);
  const assignments = await loadAssignments(rows.map((r) => r.id));
  let projects = rows.map((row) =>
    toProject(row, assignments.get(row.id) ?? []),
  );

  if (options.assignedUserId) {
    const uid = options.assignedUserId;
    projects = projects.filter(
      (p) =>
        p.projectManagerUserId === uid ||
        p.assignments.some((a) => a.userId === uid) ||
        // Also match by name for settings-store users without DB uuid
        p.projectManagerName === uid,
    );
  }

  const filters = options.filters ?? {};
  return projects
    .filter((p) => matchesFilters(p, filters))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function pgListProjectsForAccount(
  accountId: string,
  assignedUserId?: string | null,
): Promise<PmoProject[]> {
  return pgListProjects({
    filters: { accountId },
    assignedUserId,
  });
}

export async function pgGetProject(
  projectId: string,
): Promise<PmoProject | null> {
  await ensureSeeded();
  const [row] = await db
    .select()
    .from(pmoProjects)
    .where(eq(pmoProjects.id, projectId))
    .limit(1);
  if (!row) return null;
  const assignments = await loadAssignments([row.id]);
  return toProject(row, assignments.get(row.id) ?? []);
}

export async function pgGetWorkspace(
  projectId: string,
): Promise<PmoProjectWorkspace | null> {
  const project = await pgGetProject(projectId);
  if (!project) return null;

  const [appointmentRow] = await db
    .select()
    .from(pmoAppointmentLetters)
    .where(eq(pmoAppointmentLetters.projectId, projectId))
    .limit(1);
  const [slaRow] = await db
    .select()
    .from(pmoSlas)
    .where(eq(pmoSlas.projectId, projectId))
    .limit(1);
  const [poRow] = await db
    .select()
    .from(pmoPurchaseOrders)
    .where(eq(pmoPurchaseOrders.projectId, projectId))
    .limit(1);
  const [charterRow] = await db
    .select()
    .from(pmoCharters)
    .where(eq(pmoCharters.projectId, projectId))
    .limit(1);
  const [planRow] = await db
    .select()
    .from(pmoPlans)
    .where(eq(pmoPlans.projectId, projectId))
    .limit(1);
  const reportRows = await db
    .select()
    .from(pmoStatusReports)
    .where(eq(pmoStatusReports.projectId, projectId));

  const stakeholderRows = await db
    .select({
      id: pmoProjectStakeholders.id,
      projectId: pmoProjectStakeholders.projectId,
      contactId: pmoProjectStakeholders.contactId,
      influence: pmoProjectStakeholders.influence,
      interest: pmoProjectStakeholders.interest,
      engagementNotes: pmoProjectStakeholders.engagementNotes,
      contactName: contactsTable.name,
      contactRole: contactsTable.role,
      contactEmail: contactsTable.email,
      organisation: contactsTable.organisation,
    })
    .from(pmoProjectStakeholders)
    .innerJoin(
      contactsTable,
      eq(contactsTable.id, pmoProjectStakeholders.contactId),
    )
    .where(eq(pmoProjectStakeholders.projectId, projectId));

  const appointment: PmoAppointmentLetter | null = appointmentRow
    ? {
        id: appointmentRow.id,
        projectId: appointmentRow.projectId,
        letterDate: asIso(appointmentRow.letterDate),
        reference: appointmentRow.reference,
        awardedValueZar: numOrNull(appointmentRow.awardedValueZar),
        signatory: appointmentRow.signatory,
        notes: appointmentRow.notes,
      }
    : null;

  const sla: PmoSla | null = slaRow
    ? {
        id: slaRow.id,
        projectId: slaRow.projectId,
        term: slaRow.term,
        serviceLevels: slaRow.serviceLevels,
        penalties: slaRow.penalties,
        reviewDates: Array.isArray(slaRow.reviewDates)
          ? (slaRow.reviewDates as string[])
          : [],
        notes: slaRow.notes,
      }
    : null;

  const purchaseOrder: PmoPurchaseOrder | null = poRow
    ? {
        id: poRow.id,
        projectId: poRow.projectId,
        poNumber: poRow.poNumber,
        amountZar: numOrNull(poRow.amountZar),
        poDate: asIso(poRow.poDate),
        remainingBalanceZar: numOrNull(poRow.remainingBalanceZar),
        notes: poRow.notes,
      }
    : null;

  const charter: PmoCharter | null = charterRow
    ? {
        id: charterRow.id,
        projectId: charterRow.projectId,
        objectives: charterRow.objectives,
        scopeIn: charterRow.scopeIn,
        scopeOut: charterRow.scopeOut,
        deliverables: charterRow.deliverables,
        milestones: charterRow.milestones,
        budgetZar: numOrNull(charterRow.budgetZar),
        assumptions: charterRow.assumptions,
        constraints: charterRow.constraints,
      }
    : null;

  const plan: PmoPlan | null = planRow
    ? {
        id: planRow.id,
        projectId: planRow.projectId,
        schedule: planRow.schedule,
        wbs: planRow.wbs,
        resourcing: planRow.resourcing,
        budgetPlan: planRow.budgetPlan,
        qualityApproach: planRow.qualityApproach,
        changeControl: planRow.changeControl,
      }
    : null;

  const statusReports: PmoStatusReport[] = reportRows
    .map((r) => ({
      id: r.id,
      projectId: r.projectId,
      period: r.period,
      cadence: r.cadence,
      progress: r.progress,
      percentComplete: r.percentComplete,
      milestonesHit: r.milestonesHit,
      risksIssues: r.risksIssues,
      nextSteps: r.nextSteps,
      reportedAt: asIso(r.reportedAt),
    }))
    .sort(
      (a, b) =>
        new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime(),
    );

  const stakeholders: PmoStakeholder[] = stakeholderRows.map((s) => ({
    id: s.id,
    projectId: s.projectId,
    contactId: s.contactId,
    contactName: s.contactName,
    contactRole: s.contactRole,
    contactEmail: s.contactEmail,
    organisation: s.organisation ?? "",
    influence: s.influence,
    interest: s.interest,
    engagementNotes: s.engagementNotes,
  }));

  return {
    project,
    appointment,
    sla,
    purchaseOrder,
    charter,
    plan,
    statusReports,
    stakeholders,
  };
}
