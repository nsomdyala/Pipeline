"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatZaDate, formatZar } from "@/lib/opportunities/dates";
import type { Account } from "@/lib/accounts/types";
import {
  ACCOUNT_DOC_LABELS,
  type AccountDocType,
} from "@/lib/accounts/types";
import {
  PMO_HEALTH_LABELS,
  PMO_STATUS_LABELS,
  type PmoProject,
  type PmoProjectHealth,
} from "@/lib/pmo/types";

type Tab = "overview" | "pmo" | "documents";

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

function initialTab(searchParams: URLSearchParams | null): Tab {
  const raw = searchParams?.get("tab");
  if (raw === "overview" || raw === "pmo" || raw === "documents") return raw;
  return "pmo";
}

export function AccountDetailBoard({ accountId }: { accountId: string }) {
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<Account | null>(null);
  const [projects, setProjects] = useState<PmoProject[]>([]);
  const [tab, setTab] = useState<Tab>(() => initialTab(searchParams));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pmoError, setPmoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/accounts");
        const data = (await res.json()) as {
          accounts?: Account[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to load account.");
        const found =
          (data.accounts ?? []).find((a) => a.id === accountId) ?? null;
        if (!found) throw new Error("Account not found.");
        if (!cancelled) setAccount(found);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load account.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPmoError(null);
      try {
        const res = await fetch(`/api/accounts/${accountId}/pmo`);
        const data = (await res.json()) as {
          projects?: PmoProject[];
          error?: string;
        };
        if (!res.ok) {
          // Viewers get 403 — surface quietly on PMO tab
          throw new Error(data.error ?? "Could not load PMO projects.");
        }
        if (!cancelled) setProjects(data.projects ?? []);
      } catch (err) {
        if (!cancelled) {
          setPmoError(
            err instanceof Error ? err.message : "Could not load PMO.",
          );
          setProjects([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-muted md:px-10">
        Loading account…
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
        <p className="text-sm font-semibold text-coral" role="alert">
          {error ?? "Account not found."}
        </p>
        <Link
          href="/accounts"
          className="mt-3 inline-block text-sm text-[var(--slack-rail-active)] hover:underline"
        >
          ← Back to accounts
        </Link>
      </div>
    );
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "pmo", label: "PMO" },
    { key: "documents", label: "Documents" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
      <div className="mb-6 text-sm text-muted">
        <Link href="/accounts" className="hover:text-ink hover:underline">
          Accounts
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-ink">{account.clientName}</span>
      </div>

      <header className="mb-6">
        <p className="label-mono mb-2">Account</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
          {account.clientName}
        </h1>
        <p className="mt-2 text-sm text-muted">{account.projectTitle}</p>
      </header>

      <div
        className="mb-6 flex gap-1 border-b border-[var(--slack-border)]"
        role="tablist"
        aria-label="Account sections"
      >
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-semibold transition ${active ? "border-b-2 border-[var(--slack-rail-active)] text-ink" : "text-muted hover:text-ink"}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 rounded-[var(--radius-lg)] bg-white p-5 ring-1 ring-[var(--slack-border)] sm:grid-cols-2">
          <div>
            <div className="label-mono">Ref</div>
            <div className="mt-0.5 font-mono text-sm">{account.refNo || "—"}</div>
          </div>
          <div>
            <div className="label-mono">Lane</div>
            <div className="mt-0.5 text-sm">{account.lane}</div>
          </div>
          <div>
            <div className="label-mono">Status</div>
            <div className="mt-0.5 text-sm capitalize">
              {account.status.replace("_", " ")}
            </div>
          </div>
          <div>
            <div className="label-mono">Value</div>
            <div className="mt-0.5 font-mono text-sm">
              {formatZar(account.valueZar)}
            </div>
          </div>
          <div>
            <div className="label-mono">Start → end</div>
            <div className="mt-0.5 font-mono text-sm">
              {formatZaDate(account.startOn)} → {formatZaDate(account.endOn)}
            </div>
          </div>
          <div>
            <div className="label-mono">Owner</div>
            <div className="mt-0.5 text-sm">{account.ownerName || "—"}</div>
          </div>
          {account.notes ? (
            <div className="sm:col-span-2">
              <div className="label-mono">Notes</div>
              <p className="mt-0.5 text-sm text-muted">{account.notes}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "pmo" ? (
        <div>
          {pmoError ? (
            <p className="mb-4 text-sm font-semibold text-coral" role="alert">
              {pmoError}
            </p>
          ) : null}
          {projects.length === 0 && !pmoError ? (
            <p className="text-sm text-muted">
              No PMO projects for this account yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-white ring-1 ring-[var(--slack-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--slack-border)] bg-[var(--slack-main-subtle)] text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-muted">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Health</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">PM</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b border-[var(--slack-border)] last:border-0 hover:bg-[var(--slack-row-hover)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/accounts/${accountId}/pmo/${project.id}`}
                          className="font-semibold text-[var(--slack-rail-active)] hover:underline"
                        >
                          {project.name}
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
                      <td className="px-4 py-3">
                        {project.projectManagerName || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {tab === "documents" ? (
        <div className="rounded-[var(--radius-lg)] bg-white p-5 ring-1 ring-[var(--slack-border)]">
          {account.documents.length === 0 ? (
            <p className="text-sm text-muted">
              No documents uploaded yet. Use the Accounts board to add files.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--slack-border)]">
              {account.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2"
                >
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {doc.filename}
                    </div>
                    <div className="text-[0.75rem] text-muted">
                      {ACCOUNT_DOC_LABELS[doc.docType as AccountDocType] ??
                        doc.docType}{" "}
                      · {formatZaDate(doc.uploadedAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
