"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatZaDate, formatZar, zaCalendarDate } from "@/lib/opportunities/dates";
import type { Account } from "@/lib/accounts/types";
import {
  PMO_HEALTH_LABELS,
  PMO_PROJECT_HEALTH,
  PMO_PROJECT_STATUSES,
  PMO_STATUS_LABELS,
  type PmoProject,
  type PmoProjectHealth,
  type PmoProjectStatus,
} from "@/lib/pmo/types";

function HealthDot({ health }: { health: PmoProjectHealth }) {
  const color =
    health === "green"
      ? "bg-[#2bac76]"
      : health === "amber"
        ? "bg-[var(--warning)]"
        : "bg-[var(--danger)]";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2.5 rounded-full ${color}`} aria-hidden />
      {PMO_HEALTH_LABELS[health]}
    </span>
  );
}

export function PmoPortfolioBoard() {
  const [projects, setProjects] = useState<PmoProject[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [status, setStatus] = useState<PmoProjectStatus | "">("");
  const [health, setHealth] = useState<PmoProjectHealth | "">("");
  const [projectManager, setProjectManager] = useState("");
  const [allManagers, setAllManagers] = useState<string[]>([]);
  const [atRiskOnly, setAtRiskOnly] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const statusRaw = params.get("status") ?? "";
    const healthRaw = params.get("health") ?? "";
    const accountRaw = params.get("accountId") ?? "";
    if (PMO_PROJECT_STATUSES.includes(statusRaw as PmoProjectStatus)) {
      setStatus(statusRaw as PmoProjectStatus);
    }
    if (PMO_PROJECT_HEALTH.includes(healthRaw as PmoProjectHealth)) {
      setHealth(healthRaw as PmoProjectHealth);
    }
    if (accountRaw) setAccountId(accountRaw);
    if (params.get("atRisk") === "1") setAtRiskOnly(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/accounts");
        if (!res.ok) return;
        const data = (await res.json()) as { accounts?: Account[] };
        if (!cancelled) setAccounts(data.accounts ?? []);
      } catch {
        // Account filter options are best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (accountId) params.set("accountId", accountId);
        if (status) params.set("status", status);
        if (health) params.set("health", health);
        if (projectManager.trim()) {
          params.set("projectManager", projectManager.trim());
        }
        const qs = params.toString();
        const res = await fetch(`/api/pmo/projects${qs ? `?${qs}` : ""}`);
        const data = (await res.json()) as {
          projects?: PmoProject[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to load portfolio.");
        if (!cancelled) {
          const list = data.projects ?? [];
          setProjects(list);
          if (!accountId && !status && !health && !projectManager) {
            const names = Array.from(
              new Set(
                list
                  .map((p) => p.projectManagerName)
                  .filter((n): n is string => Boolean(n)),
              ),
            ).sort((a, b) => a.localeCompare(b));
            setAllManagers(names);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load portfolio.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, status, health, projectManager]);

  const accountOptions = useMemo(() => {
    return accounts
      .map((a) => ({ id: a.id, name: a.clientName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts]);

  const pmOptions = useMemo(() => {
    if (allManagers.length > 0) return allManagers;
    return Array.from(
      new Set(
        projects
          .map((p) => p.projectManagerName)
          .filter((n): n is string => Boolean(n)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [allManagers, projects]);

  const visibleProjects = useMemo(() => {
    if (!atRiskOnly) return projects;
    const today = zaCalendarDate(new Date());
    return projects.filter((p) => {
      if (p.status === "closed") return false;
      const overdue = Boolean(p.dueOn) && zaCalendarDate(p.dueOn) < today;
      return p.health === "amber" || p.health === "red" || overdue;
    });
  }, [projects, atRiskOnly]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8">
        <p className="label-mono mb-2">Portfolio</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
          PMO
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Cross-account view of delivery projects. Open a row for the governance
          workspace under its parent account.
          {atRiskOnly ? " Showing at-risk projects only." : ""}
        </p>
      </header>

      <div className="mb-5 grid gap-3 rounded-[var(--radius-lg)] bg-white p-4 ring-1 ring-[var(--slack-border)] sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="label-mono">Account</span>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-[var(--slack-main-subtle)] px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-[var(--slack-rail-active)]"
          >
            <option value="">All accounts</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label-mono">Status</span>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as PmoProjectStatus | "")
            }
            className="mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-[var(--slack-main-subtle)] px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-[var(--slack-rail-active)]"
          >
            <option value="">All statuses</option>
            {PMO_PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PMO_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label-mono">Health</span>
          <select
            value={health}
            onChange={(e) =>
              setHealth(e.target.value as PmoProjectHealth | "")
            }
            className="mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-[var(--slack-main-subtle)] px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-[var(--slack-rail-active)]"
          >
            <option value="">All health</option>
            {PMO_PROJECT_HEALTH.map((h) => (
              <option key={h} value={h}>
                {PMO_HEALTH_LABELS[h]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label-mono">Project manager</span>
          <select
            value={projectManager}
            onChange={(e) => setProjectManager(e.target.value)}
            className="mt-1.5 w-full rounded-[var(--radius-md)] border border-[var(--slack-border)] bg-[var(--slack-main-subtle)] px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-[var(--slack-rail-active)]"
          >
            <option value="">All PMs</option>
            {pmOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="mb-4 text-sm font-semibold text-coral" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-white ring-1 ring-[var(--slack-border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--slack-border)] bg-[var(--slack-main-subtle)] text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-muted">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Health</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">PM</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-muted">
                  Loading portfolio…
                </td>
              </tr>
            ) : visibleProjects.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-muted">
                  No projects match these filters.
                </td>
              </tr>
            ) : (
              visibleProjects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-[var(--slack-border)] last:border-0 hover:bg-[var(--slack-row-hover)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/accounts/${project.accountId}/pmo/${project.id}`}
                      className="font-semibold text-[var(--slack-rail-active)] hover:underline"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    <Link
                      href={`/accounts/${project.accountId}`}
                      className="hover:underline"
                    >
                      {project.accountName || project.accountId}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {PMO_STATUS_LABELS[project.status]}
                  </td>
                  <td className="px-4 py-3">
                    <HealthDot health={project.health} />
                  </td>
                  <td className="px-4 py-3 font-mono text-[0.8125rem]">
                    {formatZar(project.valueZar)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[0.8125rem]">
                    {formatZaDate(project.startOn)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[0.8125rem]">
                    {formatZaDate(project.dueOn)}
                  </td>
                  <td className="px-4 py-3">
                    {project.projectManagerName || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
