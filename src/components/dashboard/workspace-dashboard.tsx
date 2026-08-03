"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  displayTenderRef,
  formatZaClosing,
  formatZaDate,
  formatZar,
  workingDaysUntil,
} from "@/lib/opportunities/dates";
import type { Opportunity } from "@/lib/opportunities/types";
import type { UserRole } from "@/lib/settings/types";

export type WorkspaceView = "mine" | "team";

const STORAGE_KEY = "pipeline.workspaceView";

const OPEN_STAGES = new Set([
  "Spotted",
  "Reviewing",
  "Bid/No-Bid",
  "Drafting",
  "Submitted",
]);

type Props = {
  userName: string;
  role: UserRole;
};

export function WorkspaceDashboard({ userName, role }: Props) {
  const canUseTeam = role === "admin" || role === "member";
  const [view, setView] = useState<WorkspaceView>(
    role === "admin" ? "team" : "mine",
  );
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "mine" || stored === "team") {
        if (stored === "team" && !canUseTeam) {
          setView("mine");
        } else {
          setView(stored);
        }
      }
    } catch {
      /* ignore */
    }
  }, [canUseTeam]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/opportunities?scope=pipeline");
        const data = (await res.json()) as { opportunities: Opportunity[] };
        if (!cancelled) setOpportunities(data.opportunities ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function switchView(next: WorkspaceView) {
    if (next === "team" && !canUseTeam) return;
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const scoped = useMemo(() => {
    if (view === "team") return opportunities;
    return opportunities.filter(
      (o) => o.ownerName.toLowerCase() === userName.toLowerCase(),
    );
  }, [opportunities, view, userName]);

  const open = scoped.filter((o) => OPEN_STAGES.has(o.stage));
  const closingSoon = [...open]
    .filter((o) => workingDaysUntil(o.closingAt) <= 14)
    .sort(
      (a, b) =>
        new Date(a.closingAt).getTime() - new Date(b.closingAt).getTime(),
    )
    .slice(0, 8);

  const atRisk = open.filter((o) => workingDaysUntil(o.closingAt) < 3).length;
  const submittedValue = scoped
    .filter((o) => o.stage === "Submitted" || o.stage === "Awarded")
    .reduce((sum, o) => sum + (o.estimatedValueZar ?? 0), 0);

  const owners = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of open) {
      map.set(o.ownerName, (map.get(o.ownerName) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [open]);

  const stats = [
    {
      label: "Open opportunities",
      value: String(open.length),
      hint: view === "team" ? "Team" : "My work",
    },
    {
      label: "Closing < 3 days",
      value: String(atRisk),
      hint: "At risk",
      coral: true,
    },
    {
      label: "Submitted value",
      value: formatZar(submittedValue || null),
      hint: view === "team" ? "Team pipeline" : "This month",
    },
    {
      label: view === "team" ? "Active owners" : "Win rate",
      value: view === "team" ? String(owners.length || "—") : "—",
      hint: view === "team" ? "Across open work" : "No awards yet",
    },
  ];

  const title = view === "team" ? "Team workspace" : "My work";
  const subtitle =
    view === "team"
      ? "Full team opportunities, owners and closing risk across Max Attention Technologies."
      : "Your opportunities, deadlines and progress. Switch to Team to see everyone’s board.";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-2">Dashboard</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">{subtitle}</p>
        </div>

        <div
          className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-navy/5"
          role="tablist"
          aria-label="Workspace view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "mine"}
            onClick={() => switchView("mine")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              view === "mine"
                ? "bg-mint text-navy"
                : "text-muted hover:text-ink"
            }`}
          >
            My work
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "team"}
            disabled={!canUseTeam}
            title={
              canUseTeam
                ? "View the full team workspace"
                : "Team workspace requires a bid team or admin role"
            }
            onClick={() => switchView("team")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              view === "team"
                ? "bg-mint text-navy"
                : "text-muted hover:text-ink"
            }`}
          >
            Team
          </button>
        </div>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-navy/5"
          >
            <div className="label-mono">{stat.label}</div>
            <div
              className={`mt-2 font-mono text-2xl font-semibold tracking-tight ${
                stat.coral ? "text-coral" : "text-ink"
              }`}
            >
              {loading ? "…" : stat.value}
            </div>
            <div className="mt-1 text-xs text-muted">{stat.hint}</div>
          </div>
        ))}
      </section>

      {view === "team" && owners.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold tracking-[-0.02em] text-ink">
            By owner
          </h2>
          <ul className="flex flex-wrap gap-2">
            {owners.map(([name, count]) => (
              <li
                key={name}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm ring-1 ring-navy/5"
              >
                {name}
                <span className="ml-1.5 font-mono text-muted">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">
            Closing soon
          </h2>
          <Link
            href="/opportunities"
            className="text-sm font-semibold text-mint hover:underline"
          >
            Open board
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading opportunities…</p>
        ) : closingSoon.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy/15 bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-ink">
              {view === "mine"
                ? "Nothing in your personal queue"
                : "No open team opportunities closing soon"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {view === "mine" && canUseTeam
                ? "Switch to Team to see the full workspace, or open the opportunities board."
                : "Add work from the opportunities board."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {closingSoon.map((card) => {
              const daysLeft = workingDaysUntil(card.closingAt);
              const atRiskItem = daysLeft < 3;
              return (
                <li
                  key={card.id}
                  className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-navy/5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted">
                          {displayTenderRef(card)}
                        </span>
                        <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold capitalize text-muted">
                          {card.sector}
                        </span>
                        <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                          {card.source}
                        </span>
                        {view === "team" &&
                        card.ownerName &&
                        card.ownerName !== "Intake" ? (
                          <span className="rounded-md bg-navy/5 px-2 py-0.5 text-[0.65rem] font-semibold text-navy">
                            {card.ownerName}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-1.5 text-base font-semibold tracking-[-0.02em] text-ink">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {card.buyer} · {card.lane} · {card.stage}
                      </p>
                    </div>
                    <div className="shrink-0 text-left md:text-right">
                      <div className="label-mono">Closing</div>
                      <div
                        className={`mt-1 font-mono text-sm font-semibold ${
                          atRiskItem ? "text-coral" : "text-ink"
                        }`}
                      >
                        {formatZaClosing(card.closingAt)}
                      </div>
                      <div
                        className={`mt-0.5 text-xs font-semibold ${
                          atRiskItem ? "text-coral" : "text-muted"
                        }`}
                      >
                        {daysLeft} working{" "}
                        {daysLeft === 1 ? "day" : "days"} left
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
