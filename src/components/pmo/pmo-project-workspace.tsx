"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatZaDate, formatZar } from "@/lib/opportunities/dates";
import {
  PMO_HEALTH_LABELS,
  PMO_STATUS_LABELS,
  type PmoAppointmentLetter,
  type PmoCharter,
  type PmoPlan,
  type PmoProjectHealth,
  type PmoProjectWorkspace,
  type PmoPurchaseOrder,
  type PmoSla,
  type PmoStakeholder,
  type PmoStatusReport,
} from "@/lib/pmo/types";

function HealthDot({ health }: { health: PmoProjectHealth }) {
  const color =
    health === "green"
      ? "bg-[#2bac76]"
      : health === "amber"
        ? "bg-[var(--warning)]"
        : "bg-[var(--danger)]";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`size-2.5 rounded-full ${color}`} aria-hidden />
      {PMO_HEALTH_LABELS[health]}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] bg-white p-5 ring-1 ring-[var(--slack-border)]">
      <h2 className="text-base font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h2>
      <div className="mt-3 space-y-2 text-sm text-ink">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="label-mono">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap text-sm text-ink">
        {value || "—"}
      </div>
    </div>
  );
}

function AppointmentBlock({ item }: { item: PmoAppointmentLetter }) {
  return (
    <Section title="Appointment letter">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Reference" value={item.reference} />
        <Field label="Date" value={formatZaDate(item.letterDate)} />
        <Field label="Awarded value" value={formatZar(item.awardedValueZar)} />
        <Field label="Signatory" value={item.signatory} />
        <div className="sm:col-span-2">
          <Field label="Notes" value={item.notes} />
        </div>
      </div>
    </Section>
  );
}

function SlaBlock({ item }: { item: PmoSla }) {
  return (
    <Section title="SLA">
      <Field label="Term" value={item.term} />
      <Field label="Service levels" value={item.serviceLevels} />
      <Field label="Penalties" value={item.penalties} />
      <Field
        label="Review dates"
        value={item.reviewDates.length ? item.reviewDates.join(", ") : "—"}
      />
    </Section>
  );
}

function PoBlock({ item }: { item: PmoPurchaseOrder }) {
  return (
    <Section title="Purchase order">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="PO number" value={item.poNumber} />
        <Field label="Date" value={formatZaDate(item.poDate)} />
        <Field label="Amount" value={formatZar(item.amountZar)} />
        <Field
          label="Remaining balance"
          value={formatZar(item.remainingBalanceZar)}
        />
      </div>
    </Section>
  );
}

function CharterBlock({ item }: { item: PmoCharter }) {
  return (
    <Section title="Project charter">
      <Field label="Objectives" value={item.objectives} />
      <Field label="In scope" value={item.scopeIn} />
      <Field label="Out of scope" value={item.scopeOut} />
      <Field label="Deliverables" value={item.deliverables} />
      <Field label="Milestones" value={item.milestones} />
      <Field label="Budget" value={formatZar(item.budgetZar)} />
      <Field label="Assumptions" value={item.assumptions} />
      <Field label="Constraints" value={item.constraints} />
    </Section>
  );
}

function PlanBlock({ item }: { item: PmoPlan }) {
  return (
    <Section title="Project plan">
      <Field label="Schedule" value={item.schedule} />
      <Field label="WBS" value={item.wbs} />
      <Field label="Resourcing" value={item.resourcing} />
      <Field label="Budget plan" value={item.budgetPlan} />
      <Field label="Quality" value={item.qualityApproach} />
      <Field label="Change control" value={item.changeControl} />
    </Section>
  );
}

function ReportsBlock({ items }: { items: PmoStatusReport[] }) {
  return (
    <Section title="Status reports">
      {items.length === 0 ? (
        <p className="text-muted">No status reports yet.</p>
      ) : (
        items.map((r) => (
          <div
            key={r.id}
            className="rounded-[var(--radius-md)] border border-[var(--slack-border)] p-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-semibold">{r.period}</div>
              <div className="font-mono text-[0.75rem] text-muted">
                {formatZaDate(r.reportedAt)} · {r.percentComplete}%
              </div>
            </div>
            <p className="mt-2 text-sm">{r.progress}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Field label="Milestones hit" value={r.milestonesHit} />
              <Field label="Risks / issues" value={r.risksIssues} />
              <div className="sm:col-span-2">
                <Field label="Next steps" value={r.nextSteps} />
              </div>
            </div>
          </div>
        ))
      )}
    </Section>
  );
}

function StakeholdersBlock({ items }: { items: PmoStakeholder[] }) {
  return (
    <Section title="Stakeholders">
      {items.length === 0 ? (
        <p className="text-muted">No stakeholders linked.</p>
      ) : (
        <ul className="divide-y divide-[var(--slack-border)]">
          {items.map((s) => (
            <li key={s.id} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
              <div className="font-semibold">
                {s.contactName}{" "}
                <span className="font-normal text-muted">
                  · {s.contactRole || "Contact"}
                </span>
              </div>
              <div className="text-[0.8125rem] text-muted">
                {s.organisation}
                {s.contactEmail ? ` · ${s.contactEmail}` : ""}
              </div>
              <div className="text-[0.75rem] text-muted">
                Influence {s.influence} · Interest {s.interest}
              </div>
              {s.engagementNotes ? (
                <p className="text-sm">{s.engagementNotes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function PmoProjectWorkspace({
  accountId,
  projectId,
}: {
  accountId: string;
  projectId: string;
}) {
  const [workspace, setWorkspace] = useState<PmoProjectWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/pmo/projects/${projectId}`);
        const data = (await res.json()) as {
          workspace?: PmoProjectWorkspace;
          error?: string;
        };
        if (!res.ok || !data.workspace) {
          throw new Error(data.error ?? "Could not load project.");
        }
        if (!cancelled) setWorkspace(data.workspace);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load project.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-muted md:px-10">
        Loading governance workspace…
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
        <p className="text-sm font-semibold text-coral" role="alert">
          {error ?? "Project not found."}
        </p>
        <Link
          href={`/accounts/${accountId}`}
          className="mt-3 inline-block text-sm text-[var(--slack-rail-active)] hover:underline"
        >
          ← Back to account
        </Link>
      </div>
    );
  }

  const { project } = workspace;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
        <Link href="/pmo" className="hover:text-ink hover:underline">
          PMO
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/accounts/${accountId}`}
          className="hover:text-ink hover:underline"
        >
          {project.accountName || "Account"}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink">{project.name}</span>
      </div>

      <header className="mb-8">
        <p className="label-mono mb-2">Governance workspace</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
          {project.name}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
          <span>{PMO_STATUS_LABELS[project.status]}</span>
          <HealthDot health={project.health} />
          <span>{formatZar(project.valueZar)}</span>
          <span>
            {formatZaDate(project.startOn)} → {formatZaDate(project.dueOn)}
          </span>
          <span>PM: {project.projectManagerName || "—"}</span>
        </div>
        {project.notes ? (
          <p className="mt-3 max-w-3xl text-sm text-muted">{project.notes}</p>
        ) : null}
      </header>

      <div className="grid gap-4">
        <Section title="Overview">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Parent account" value={project.accountName} />
            <Field
              label="Assignees"
              value={
                project.assignments.length
                  ? project.assignments.map((a) => a.userName).join(", ")
                  : "—"
              }
            />
          </div>
        </Section>
        {workspace.appointment ? (
          <AppointmentBlock item={workspace.appointment} />
        ) : null}
        {workspace.sla ? <SlaBlock item={workspace.sla} /> : null}
        {workspace.purchaseOrder ? (
          <PoBlock item={workspace.purchaseOrder} />
        ) : null}
        {workspace.charter ? <CharterBlock item={workspace.charter} /> : null}
        {workspace.plan ? <PlanBlock item={workspace.plan} /> : null}
        <ReportsBlock items={workspace.statusReports} />
        <StakeholdersBlock items={workspace.stakeholders} />
      </div>
    </div>
  );
}
