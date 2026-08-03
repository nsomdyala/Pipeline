"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  formatZaDate,
  workingDaysUntil,
} from "@/lib/opportunities/dates";
import {
  deriveTenderStatus,
  type TenderSearchResult,
} from "@/lib/opportunities/search";
import type { Opportunity } from "@/lib/opportunities/types";

type Scope = "defaults" | "beyond_defaults";

type Filters = {
  q: string;
  type: "all" | "rfq" | "tender" | "panel";
  buyer: string;
  includeClosed: boolean;
  scope: Scope;
  page: number;
};

type SearchPayload = TenderSearchResult & {
  scope?: Scope;
  defaultCategories?: string[];
};

export function AllTendersBoard() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters | null>(null);
  const [draft, setDraft] = useState<Filters | null>(null);
  const [result, setResult] = useState<SearchPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const load = useCallback((next: Filters) => {
    setLoading(true);
    setError(null);
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
        const res = await fetch(`/api/tenders/search?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Search failed.");
        setResult(data as SearchPayload);
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
        if (!res.ok) throw new Error(data.error ?? "Could not add to Opportunities.");
        setResult((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((row) =>
                  row.id === item.id ? data.opportunity : row,
                ),
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
            Defaults load automatically from our eTenders categories. Use{" "}
            <span className="font-semibold text-ink">Search outside defaults</span>{" "}
            for RFQs, tenders and RFPs in other categories. Click any row to open
            the tender, view details, and download documents.
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
              ["tender", "Tenders / RFPs"],
              ["panel", "Panels"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => applyDraft({ type: value })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                draft.type === value
                  ? "bg-navy text-white"
                  : "bg-mist text-muted hover:text-ink"
              }`}
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
            disabled={pending}
            className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
          >
            {pending && activeScope === "beyond_defaults"
              ? "Searching…"
              : "Search outside defaults"}
          </button>
          <button
            type="button"
            onClick={browseDefaults}
            disabled={pending && activeScope === "defaults"}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
              activeScope === "defaults"
                ? "bg-navy text-white"
                : "border border-navy/10 bg-white text-navy"
            }`}
          >
            {pending && activeScope === "defaults"
              ? "Loading defaults…"
              : "Show our defaults"}
          </button>
          <span className="font-mono text-xs text-muted">
            {result
              ? `${result.total} result${result.total === 1 ? "" : "s"} · ${
                  activeScope === "defaults"
                    ? "our defaults"
                    : "outside defaults"
                }`
              : null}
          </span>
        </div>
      </form>

      {error ? (
        <p className="mb-3 text-sm font-semibold text-coral" role="alert">
          {error}
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
                    Loading tenders…
                  </td>
                </tr>
              ) : null}
              {result && result.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    {activeScope === "defaults"
                      ? "No default-category tenders yet. Wait for auto-pull, or run eTenders from Opportunities."
                      : "No RFQs / tenders / RFPs outside our defaults match this search. Try clearing the type filter or include closed."}
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
                    : "Tender / RFP";
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
                        {item.refNo}
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
                      <span className="rounded-md bg-mint/15 px-2 py-1 text-[0.65rem] font-semibold text-navy">
                        {typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className={`font-mono text-xs font-semibold ${
                          atRisk ? "text-coral" : "text-ink"
                        }`}
                      >
                        {formatZaDate(item.closingAt)}
                      </div>
                      <div
                        className={`mt-0.5 text-xs ${
                          atRisk ? "font-semibold text-coral" : "text-muted"
                        }`}
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
                      {item.convertedToLeadId ? (
                        <Link
                          href="/leads"
                          className="text-xs font-semibold text-mint hover:underline"
                        >
                          In Leads
                        </Link>
                      ) : item.convertedToAccountId ? (
                        <Link
                          href="/accounts"
                          className="text-xs font-semibold text-mint hover:underline"
                        >
                          In Accounts
                        </Link>
                      ) : item.inPipeline ? (
                        <Link
                          href="/opportunities"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-mint/20 text-navy ring-1 ring-mint/40"
                          title="On Opportunities"
                          aria-label="On Opportunities"
                        >
                          <TickIcon />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={promotingId === item.id || pending}
                          onClick={(e) => promote(item, e)}
                          title="Add to Opportunities"
                          aria-label="Add to Opportunities"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white transition hover:bg-navy/90 disabled:opacity-50"
                        >
                          {promotingId === item.id ? (
                            <span className="text-[0.65rem] font-semibold">
                              …
                            </span>
                          ) : (
                            <TickIcon />
                          )}
                        </button>
                      )}
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

function TickIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
