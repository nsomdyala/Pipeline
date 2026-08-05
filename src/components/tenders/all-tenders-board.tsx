"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  displayTenderRef,
  formatZaClosing,
  workingDaysUntil,
} from "@/lib/opportunities/dates";
import { fetchJson } from "@/lib/http/fetch-json";
import {
  deriveTenderStatus,
  type TenderSearchResult,
} from "@/lib/opportunities/search";
import type { Opportunity } from "@/lib/opportunities/types";

type Scope = "defaults" | "beyond_defaults";

type Filters = {
  q: string;
  type: "all" | "rfq" | "rfp" | "tender" | "panel";
  buyer: string;
  includeClosed: boolean;
  scope: Scope;
  page: number;
};

type SearchPayload = TenderSearchResult & {
  scope?: Scope;
  defaultCategories?: string[];
  error?: string;
  notice?: string;
};

export function AllTendersBoard() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters | null>(null);
  const [draft, setDraft] = useState<Filters | null>(null);
  const [result, setResult] = useState<SearchPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [runningIntake, setRunningIntake] = useState(false);
  const [intakeSummary, setIntakeSummary] = useState<string | null>(null);

  const load = useCallback((next: Filters) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.type !== "all") params.set("type", next.type);
    if (next.buyer.trim()) params.set("buyer", next.buyer.trim());
    if (next.includeClosed) params.set("includeClosed", "true");
    params.set("scope", next.scope);
    params.set("page", String(next.page));
    params.set("pageSize", "25");

    startTransition(async () => {
      try {
        const parsed = await fetchJson<SearchPayload>(
          `/api/tenders/search?${params}`,
          { timeoutMs: 10_000 },
        );
        if (!parsed.ok) {
          throw new Error(parsed.error);
        }
        const data = parsed.data;
        if (data.error) setError(data.error);
        if (data.notice) setNotice(data.notice);
        setResult(data);
        setFilters(next);
        setDraft(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    const initial: Filters = {
      q: "",
      type: "all",
      buyer: "",
      includeClosed: false,
      scope: "defaults",
      page: 1,
    };
    setDraft(initial);
    load(initial);
  }, [load]);

  function runIntakeNow() {
    setRunningIntake(true);
    setError(null);
    setIntakeSummary(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/intake/etenders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = (await res.json()) as {
          error?: string;
          summary?: string;
          result?: {
            fetched: number;
            created: number;
            amended: number;
            unchanged: number;
            status: string;
            dateFrom: string;
            dateTo: string;
            errors?: string[];
          };
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Intake failed.");
        }
        const r = data.result;
        setIntakeSummary(
          data.summary ??
            (r
              ? `Fetched ${r.fetched}, created ${r.created}, updated ${r.amended}.`
              : "Intake finished."),
        );
        if (r) {
          setNotice(
            `eTenders ${r.status}: ${r.dateFrom} → ${r.dateTo}. ${data.summary ?? ""}`,
          );
        }
        const next = filters ?? {
          q: "",
          type: "all" as const,
          buyer: "",
          includeClosed: false,
          scope: "defaults" as const,
          page: 1,
        };
        load({ ...next, page: 1, scope: "defaults" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Intake failed.");
      } finally {
        setRunningIntake(false);
      }
    });
  }

  function browseDefaults() {
    const next: Filters = {
      q: "",
      type: "all",
      buyer: "",
      includeClosed: false,
      scope: "defaults",
      page: 1,
    };
    setDraft(next);
    load(next);
  }

  function searchBeyond(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    load({
      ...draft,
      scope: "beyond_defaults",
      page: 1,
    });
  }

  function applyDraft(patch: Partial<Filters>) {
    if (!draft) return;
    const next: Filters = {
      ...draft,
      ...patch,
      scope: filters?.scope ?? draft.scope,
      page: 1,
    };
    setDraft(next);
    load(next);
  }

  function promote(item: Opportunity, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setPromotingId(item.id);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tenders/${item.id}/promote`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Could not move to Opportunities.");
        }
        // Remove from All Tenders — it now lives on the Opportunities board.
        setResult((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.filter((row) => row.id !== item.id),
                total: Math.max(0, prev.total - 1),
              }
            : prev,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not add to Opportunities.",
        );
      } finally {
        setPromotingId(null);
      }
    });
  }

  if (!draft) {
    return (
      <div className="px-6 py-16 text-center text-sm text-muted">
        Loading All Tenders…
      </div>
    );
  }

  const activeScope = filters?.scope ?? "defaults";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-2">Intake</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
            All Tenders
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Browse RFQs, tenders and RFPs from eTenders. Use{" "}
            <span className="font-semibold text-ink">Move to Opportunities</span>{" "}
            to pull one onto the team board — it leaves this list when moved.
            Click a row to view details and download documents.
          </p>
        </div>
        <Link
          href="/opportunities"
          className="text-sm font-semibold text-mint hover:underline"
        >
          Opportunities
        </Link>
      </header>

      <form
        onSubmit={searchBeyond}
        className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-navy/5 md:p-5"
      >
        <label className="block">
          <span className="label-mono">
            Search outside our defaults (RFQ / Tender / RFP)
          </span>
          <input
            value={draft.q}
            onChange={(e) =>
              setDraft((d) => (d ? { ...d, q: e.target.value } : d))
            }
            placeholder="Title, buyer, reference, province…"
            className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All types"],
              ["rfq", "RFQs"],
              ["rfp", "RFPs"],
              ["tender", "Tenders"],
              ["panel", "Panels"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => applyDraft({ type: value })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${draft.type === value ? "bg-navy text-white" : "bg-mist text-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label-mono">Buyer</span>
            <input
              value={draft.buyer}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, buyer: e.target.value } : d))
              }
              placeholder="Contains…"
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              checked={draft.includeClosed}
              onChange={(e) => applyDraft({ includeClosed: e.target.checked })}
              className="size-4 rounded border-navy/20 text-mint"
            />
            <span className="text-sm text-ink">Include closed / awarded</span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={pending || runningIntake}
            className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold disabled:opacity-60 text-white"
          >
            {pending && activeScope === "beyond_defaults"
              ? "Searching…"
              : "Search outside defaults"}
          </button>
          <button
            type="button"
            onClick={browseDefaults}
            disabled={pending && activeScope === "defaults"}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${activeScope === "defaults" ? "bg-navy text-white" : "border border-navy/10 bg-white text-navy"}`}
          >
            {pending && activeScope === "defaults"
              ? "Loading defaults…"
              : "Show our defaults"}
          </button>
          <button
            type="button"
            onClick={runIntakeNow}
            disabled={runningIntake || pending}
            className="rounded-xl border border-navy/10 bg-white px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
          >
            {runningIntake ? "Running intake…" : "Run intake now"}
          </button>
          <span className="font-mono text-xs text-muted">
            {result
              ? `${result.total} result${result.total === 1 ? "" : "s"} · ${activeScope === "defaults" ? "our defaults" : "outside defaults"}`
              : null}
          </span>
        </div>
      </form>

      {error ? (
        <p className="mb-3 text-sm font-semibold text-coral" role="alert">
          {error}
        </p>
      ) : null}
      {intakeSummary && !error ? (
        <p className="mb-3 text-sm font-semibold text-mint" role="status">
          {intakeSummary}
        </p>
      ) : null}
      {notice && !error ? (
        <p className="mb-3 text-sm text-navy" role="status">
          {notice}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-navy/5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-navy/8 bg-mist/50 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Title / buyer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Closing</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && !result ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    <div className="font-semibold text-ink">Loading tenders…</div>
                  </td>
                </tr>
              ) : null}
              {result && result.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    {activeScope === "defaults" ? (
                      <div className="mx-auto max-w-md space-y-3">
                        <p className="font-semibold text-ink">
                          No default-category tenders in the database yet
                        </p>
                        <p className="text-sm">
                          Run eTenders intake to pull our default categories
                          (ICT, telecoms, electrical) across all provinces.
                        </p>
                        <button
                          type="button"
                          onClick={runIntakeNow}
                          disabled={runningIntake}
                          className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {runningIntake ? "Running intake…" : "Run intake now"}
                        </button>
                      </div>
                    ) : (
                      "No RFQs / tenders / RFPs outside our defaults match this search. Try clearing the type filter or include closed."
                    )}
                  </td>
                </tr>
              ) : null}
              {result?.items.map((item) => {
                const days = workingDaysUntil(item.closingAt);
                const status = deriveTenderStatus(item);
                const atRisk = status === "closing_soon";
                const typeLabel = item.isPanel
                  ? "Panel"
                  : item.opportunityType === "rfq"
                    ? "RFQ"
                    : item.opportunityType === "rfp"
                      ? "RFP"
                      : "Tender";
                return (
                  <tr
                    key={item.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/tenders/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/tenders/${item.id}`);
                      }
                    }}
                    className="cursor-pointer border-b border-navy/5 align-top last:border-0 hover:bg-mist/40"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-mint">
                        {displayTenderRef(item)}
                      </span>
                      <div className="mt-1 text-[0.65rem] font-semibold text-navy/70">
                        Open →
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{item.title}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {item.buyer}
                        {item.province ? ` · ${item.province}` : ""}
                      </div>
                      {item.category ? (
                        <div className="mt-1 text-[0.65rem] text-muted">
                          {item.category}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-mint/15 px-2 py-1 text-[0.65rem] font-semibold text-ink">
                        {typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className={`font-mono text-xs font-semibold ${atRisk ? "text-coral" : "text-ink"}`}
                      >
                        {formatZaClosing(item.closingAt)}
                      </div>
                      <div
                        className={`mt-0.5 text-xs ${atRisk ? "font-semibold text-coral" : "text-muted"}`}
                      >
                        {days} working {days === 1 ? "day" : "days"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold capitalize text-muted">
                        {status.replace("_", " ")}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={promotingId === item.id || pending}
                        onClick={(e) => promote(item, e)}
                        title="Move to Opportunities"
                        aria-label="Move to Opportunities"
                        className="rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy/90 disabled:opacity-50"
                      >
                        {promotingId === item.id
                          ? "Moving…"
                          : "To Opportunities"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {result && filters && result.pageCount > 1 ? (
          <div className="flex items-center justify-between border-t border-navy/8 px-4 py-3">
            <button
              type="button"
              disabled={filters.page <= 1 || pending}
              onClick={() => load({ ...filters, page: filters.page - 1 })}
              className="text-sm font-semibold text-navy disabled:text-muted"
            >
              Previous
            </button>
            <span className="font-mono text-xs text-muted">
              Page {result.page} of {result.pageCount}
            </span>
            <button
              type="button"
              disabled={filters.page >= result.pageCount || pending}
              onClick={() => load({ ...filters, page: filters.page + 1 })}
              className="text-sm font-semibold text-navy disabled:text-muted"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
