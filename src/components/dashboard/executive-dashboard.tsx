"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { formatZaDate, formatZar } from "@/lib/opportunities/dates";
import type { DashboardSnapshot } from "@/lib/dashboard/types";

type FiltersState = {
  from: string;
  to: string;
  accountId: string;
  lane: string;
  sector: string;
  owner: string;
};

const emptyFilters: FiltersState = {
  from: "",
  to: "",
  accountId: "",
  lane: "",
  sector: "",
  owner: "",
};

function BarList({
  items,
  max,
}: {
  items: Array<{ key: string; label: string; count: number; href?: string }>;
  max: number;
}) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const width = max > 0 ? Math.max(4, (item.count / max) * 100) : 0;
        const inner = (
          <>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate capitalize text-ink">{item.label}</span>
              <span className="font-mono text-muted">{item.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-navy/5">
              <div
                className="h-full rounded-full bg-mint"
                style={{ width: `${width}%` }}
              />
            </div>
          </>
        );
        return (
          <li key={item.key}>
            {item.href ? (
              <Link href={item.href} className="block hover:opacity-90">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ExecutiveDashboard({
  userName,
  role,
}: {
  userName: string;
  role: string;
}) {
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const [applied, setApplied] = useState<FiltersState>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async (next: FiltersState) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (next.from) params.set("from", next.from);
      if (next.to) params.set("to", next.to);
      if (next.accountId) params.set("accountId", next.accountId);
      if (next.lane) params.set("lane", next.lane);
      if (next.sector) params.set("sector", next.sector);
      if (next.owner) params.set("owner", next.owner);
      const qs = params.toString();
      const res = await fetch(`/api/dashboard${qs ? `?${qs}` : ""}`);
      const json = (await res.json()) as {
        dashboard?: DashboardSnapshot;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load dashboard.");
      setData(json.dashboard ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(applied);
  }, [applied, load]);

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    startTransition(() => setApplied({ ...filters }));
  }

  function resetFilters() {
    setFilters(emptyFilters);
    startTransition(() => setApplied(emptyFilters));
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const stageMax = Math.max(1, ...(data?.leads.byStage.map((s) => s.count) ?? [1]));
  const statusMax = Math.max(
    1,
    ...(data?.pmo.byStatus.map((s) => s.count) ?? [1]),
  );
  const healthMax = Math.max(
    1,
    ...(data?.pmo.byHealth.map((s) => s.count) ?? [1]),
  );
  const ideasStatusMax = Math.max(
    1,
    ...(data?.ideas.byStatus.map((s) => s.count) ?? [1]),
  );
  const rdStageMax = Math.max(
    1,
    ...(data?.ideas.activeRdByStage.map((s) => s.count) ?? [1]),
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-2">Dashboard</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
            {greeting}, {userName.split(" ")[0]}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Cross-module view of leads, accounts
            {role !== "viewer" ? ", delivery, ideas & R&D" : ""}
            {role === "admin" ? " and finance" : ""}. Scoped to your role.
          </p>
        </div>
        {data ? (
          <p className="text-xs text-muted">
            Updated {formatZaDate(data.generatedAt)}
          </p>
        ) : null}
      </header>

      <form
        onSubmit={applyFilters}
        className="mb-8 grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-navy/5 sm:grid-cols-2 lg:grid-cols-6"
      >
        <label className="text-xs">
          <span className="label-mono">From</span>
          <input
            type="date"
            value={filters.from}
            onChange={(e) =>
              setFilters((f) => ({ ...f, from: e.target.value }))
            }
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="label-mono">To</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="label-mono">Account</span>
          <select
            value={filters.accountId}
            onChange={(e) =>
              setFilters((f) => ({ ...f, accountId: e.target.value }))
            }
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All accounts</option>
            {(data?.filterOptions.accounts ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="label-mono">Lane</span>
          <select
            value={filters.lane}
            onChange={(e) =>
              setFilters((f) => ({ ...f, lane: e.target.value }))
            }
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All lanes</option>
            {(data?.filterOptions.lanes ?? []).map((lane) => (
              <option key={lane} value={lane}>
                {lane}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="label-mono">Sector</span>
          <select
            value={filters.sector}
            onChange={(e) =>
              setFilters((f) => ({ ...f, sector: e.target.value }))
            }
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All sectors</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="label-mono">Owner</span>
          <select
            value={filters.owner}
            onChange={(e) =>
              setFilters((f) => ({ ...f, owner: e.target.value }))
            }
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All owners</option>
            {(data?.filterOptions.owners ?? []).map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            Apply filters
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={resetFilters}
            disabled={pending}
          >
            Reset
          </button>
        </div>
      </form>

      {error ? (
        <div className="mb-6 rounded-2xl bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </div>
      ) : null}

      {/* KPI row */}
      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(loading && !data
          ? Array.from({ length: 4 }).map((_, i) => ({
              key: `skeleton-${i}`,
              label: "…",
              value: "…",
              href: undefined as string | undefined,
              coral: false,
              hint: undefined as string | undefined,
              blocked: false,
            }))
          : [
              ...(data?.leads.kpis ?? []),
              ...(data?.accounts.kpis ?? []),
              ...(data?.pmo.kpis ?? []),
              ...(data?.ideas.kpis ?? []),
            ]
        ).map((kpi) => {
          const body = (
            <>
              <div className="label-mono">{kpi.label}</div>
              <div
                className={`mt-2 font-mono text-2xl font-semibold tracking-tight ${kpi.coral ? "text-coral" : "text-ink"}`}
              >
                {kpi.value}
              </div>
              {kpi.hint ? (
                <div className="mt-1 text-xs text-muted">{kpi.hint}</div>
              ) : null}
            </>
          );
          const className = `rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-navy/5 ${kpi.blocked ? "opacity-70" : ""}`;
          if (kpi.href && !kpi.blocked) {
            return (
              <Link
                key={kpi.key}
                href={kpi.href}
                className={`${className} block transition hover:opacity-95`}
              >
                {body}
              </Link>
            );
          }
          return (
            <div key={kpi.key} className={className}>
              {body}
            </div>
          );
        })}
      </section>

      {/* Charts */}
      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Leads by stage</h2>
            <Link href="/leads" className="text-xs font-semibold text-mint hover:underline">
              Open leads
            </Link>
          </div>
          {data ? (
            <BarList items={data.leads.byStage} max={stageMax} />
          ) : (
            <p className="text-sm text-muted">Loading…</p>
          )}
          {data ? (
            <p className="mt-4 text-xs text-muted">
              Conversion:{" "}
              {data.leads.conversionRate == null
                ? "—"
                : `${Math.round(data.leads.conversionRate * 1000) / 10}%`}{" "}
              · {data.leads.conversionHint}
            </p>
          ) : null}
        </div>

        {data?.pmo.available ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">
                Projects by status
              </h2>
              <Link href="/pmo" className="text-xs font-semibold text-mint hover:underline">
                Open PMO
              </Link>
            </div>
            <BarList items={data.pmo.byStatus} max={statusMax} />
            <h3 className="label-mono mt-6 mb-3">By health</h3>
            <BarList items={data.pmo.byHealth} max={healthMax} />
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
            <h2 className="text-lg font-semibold text-ink">PMO / delivery</h2>
            <p className="mt-2 text-sm text-muted">
              PMO is not available for this role.
            </p>
          </div>
        )}
      </section>

      {data?.ideas.available ? (
        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Ideas by status</h2>
              <Link
                href="/ideas"
                className="text-xs font-semibold text-mint hover:underline"
              >
                Open ideas
              </Link>
            </div>
            <BarList items={data.ideas.byStatus} max={ideasStatusMax} />
            <p className="mt-4 text-xs text-muted">
              New this month: {data.ideas.newThisMonth} · Approval rate:{" "}
              {data.ideas.approvalRate == null
                ? "—"
                : `${Math.round(data.ideas.approvalRate * 1000) / 10}%`}{" "}
              · {data.ideas.approvalHint}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">
                Active R&D by stage
              </h2>
              <Link
                href="/rd"
                className="text-xs font-semibold text-mint hover:underline"
              >
                Open R&D
              </Link>
            </div>
            <BarList items={data.ideas.activeRdByStage} max={rdStageMax} />
            <p className="mt-4 text-xs text-muted">
              In progress: {data.ideas.inProgressCount} · Completed:{" "}
              {data.ideas.completedCount}
              {data.ideas.overdueAtRiskCount > 0 ? (
                <>
                  {" "}
                  ·{" "}
                  <Link
                    href="/rd?atRisk=1"
                    className="font-semibold text-coral hover:underline"
                  >
                    {data.ideas.overdueAtRiskCount} overdue / at-risk
                  </Link>
                </>
              ) : (
                " · No overdue / at-risk"
              )}
            </p>
          </div>
        </section>
      ) : null}

      {/* Tables */}
      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">
              Top accounts by value
            </h2>
            <Link
              href="/accounts"
              className="text-xs font-semibold text-mint hover:underline"
            >
              All accounts
            </Link>
          </div>
          {data && data.accounts.topByValue.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--slack-border)] text-xs text-muted">
                  <th className="pb-2 font-medium">Account</th>
                  <th className="pb-2 font-medium">Project</th>
                  <th className="pb-2 text-right font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.topByValue.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--slack-border)]/70 last:border-0"
                  >
                    <td className="py-2.5">
                      <Link
                        href={row.href}
                        className="font-medium text-ink hover:text-mint"
                      >
                        {row.clientName}
                      </Link>
                    </td>
                    <td className="py-2.5 text-muted">{row.projectTitle}</td>
                    <td className="py-2.5 text-right font-mono">
                      {formatZar(row.valueZar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">
              {loading ? "Loading…" : "No valued accounts in scope."}
            </p>
          )}
        </div>

        {data?.finance.available ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
            <h2 className="mb-4 text-lg font-semibold text-ink">Finance</h2>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {data.finance.kpis
                .filter((k) => !k.key.startsWith("invoice-"))
                .map((kpi) => (
                  <Link
                    key={kpi.key}
                    href={kpi.href ?? "/opportunities"}
                    className="rounded-xl bg-mist/80 px-3 py-3 transition hover:bg-mist"
                  >
                    <div className="label-mono">{kpi.label}</div>
                    <div
                      className={`mt-1 font-mono text-lg font-semibold ${kpi.coral ? "text-coral" : "text-ink"}`}
                    >
                      {kpi.value}
                    </div>
                    {kpi.hint ? (
                      <div className="mt-0.5 text-[0.7rem] text-muted">
                        {kpi.hint}
                      </div>
                    ) : null}
                  </Link>
                ))}
            </div>

            {data.finance.fullAccess ? (
              <>
                {data.finance.poRollup.length > 0 ? (
                  <table className="mb-4 w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--slack-border)] text-xs text-muted">
                        <th className="pb-2 font-medium">Project</th>
                        <th className="pb-2 text-right font-medium">PO</th>
                        <th className="pb-2 text-right font-medium">Drawn</th>
                        <th className="pb-2 text-right font-medium">Left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.finance.poRollup.map((row) => (
                        <tr
                          key={row.projectId}
                          className="border-b border-[var(--slack-border)]/70 last:border-0"
                        >
                          <td className="py-2.5">
                            <Link
                              href={row.href}
                              className="font-medium text-ink hover:text-mint"
                            >
                              {row.projectName}
                            </Link>
                            <div className="text-xs text-muted">
                              {row.accountName}
                            </div>
                          </td>
                          <td className="py-2.5 text-right font-mono">
                            {formatZar(row.poValueZar)}
                          </td>
                          <td className="py-2.5 text-right font-mono">
                            {formatZar(row.invoicedZar)}
                          </td>
                          <td className="py-2.5 text-right font-mono">
                            {formatZar(row.remainingZar)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mb-4 text-sm text-muted">
                    No purchase orders on scoped projects.
                  </p>
                )}
                <div className="rounded-xl border border-dashed border-[var(--slack-border)] px-3 py-3 text-xs text-muted">
                  Invoice KPIs (invoiced / paid / outstanding / overdue), ageing
                  and revenue-by-month are blocked — invoices table exists in
                  schema but has no app store or API yet.
                </div>
              </>
            ) : (
              <p className="text-xs text-muted">
                Full finance (PO rollups and invoices) is limited to admins.
              </p>
            )}
          </div>
        ) : null}
      </section>

      {data && data.blocked.length > 0 ? (
        <details className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-navy/5">
          <summary className="cursor-pointer font-semibold text-ink">
            Blocked metrics awaiting approval ({data.blocked.length})
          </summary>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
            {data.blocked.map((item) => (
              <li key={item.key}>
                <span className="font-mono text-xs text-ink">{item.key}</span>
                {" — "}
                {item.reason}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
