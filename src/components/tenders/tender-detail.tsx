"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { fetchJson } from "@/lib/http/fetch-json";
import {
  displayTenderRef,
  formatZaClosing,
  formatZaDate,
  formatZar,
  workingDaysUntil,
} from "@/lib/opportunities/dates";
import type { Opportunity } from "@/lib/opportunities/types";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function TenderDetail({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<Opportunity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notSynced, setNotSynced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setNotSynced(false);
      const parsed = await fetchJson<{
        opportunity?: Opportunity;
        error?: string;
        code?: string;
      }>(`/api/tenders/${encodeURIComponent(id)}`, { timeoutMs: 8_000 });

      if (cancelled) return;

      if (!parsed.ok) {
        if (parsed.status === 404) {
          setNotSynced(true);
          setError(
            parsed.error ||
              "This tender is not in Pipeline yet. Wait for the next scheduled sync.",
          );
        } else {
          setError(parsed.error);
        }
        setItem(null);
        setLoading(false);
        return;
      }

      if (!parsed.data.opportunity) {
        setNotSynced(true);
        setError(
          parsed.data.error ??
            "This tender is not in Pipeline yet. Wait for the next scheduled sync.",
        );
        setItem(null);
      } else {
        setItem(parsed.data.opportunity);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function promote() {
    if (!item) return;
    setPromoting(true);
    setError(null);
    startTransition(async () => {
      try {
        const parsed = await fetchJson<{
          opportunity?: Opportunity;
          error?: string;
        }>(`/api/tenders/${item.id}/promote`, {
          method: "POST",
          timeoutMs: 10_000,
        });
        if (!parsed.ok || !parsed.data.opportunity) {
          throw new Error(
            !parsed.ok
              ? parsed.error
              : parsed.data.error ?? "Could not move to Opportunities.",
          );
        }
        setItem(parsed.data.opportunity);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not move to Opportunities.",
        );
      } finally {
        setPromoting(false);
      }
    });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm font-semibold text-ink">Loading tender…</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm font-semibold text-coral">
          {error ?? "Tender not found."}
        </p>
        {notSynced ? (
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">
            Pipeline only shows tenders already synced by the background
            intake job. We never call eTenders when you open a page.
          </p>
        ) : null}
        <Link
          href="/tenders"
          className="mt-4 inline-block text-sm font-semibold text-mint hover:underline"
        >
          Back to All Tenders
        </Link>
      </div>
    );
  }

  const days = workingDaysUntil(item.closingAt);
  const typeLabel = item.isPanel
    ? "Panel"
    : item.opportunityType === "rfq"
      ? "RFQ"
      : item.opportunityType === "rfp"
        ? "RFP"
        : "Tender";
  const docCount = item.documentLinks.length + item.files.length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:px-10">
      <button
        type="button"
        onClick={() => router.push("/tenders")}
        className="mb-6 text-sm font-semibold text-mint hover:underline"
      >
        ← All Tenders
      </button>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-mint/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ">
            {typeLabel}
          </span>
          <span className="font-mono text-xs font-semibold text-ink">
            {displayTenderRef(item)}
          </span>
          {item.category ? (
            <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
              {item.category}
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
          {item.title}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {item.buyer}
          {item.province ? ` · ${item.province}` : ""}
          {item.estimatedValueZar != null
            ? ` · ${formatZar(item.estimatedValueZar)}`
            : ""}
        </p>
      </header>

      {error ? (
        <p className="mb-4 text-sm font-semibold text-coral" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mb-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 sm:grid-cols-2">
        <div>
          <div className="label-mono">Closing</div>
          <div className="mt-1 font-mono text-sm font-semibold text-ink">
            {formatZaClosing(item.closingAt)}
          </div>
          <div className="text-xs text-muted">
            {days} working {days === 1 ? "day" : "days"} left
          </div>
        </div>
        <div>
          <div className="label-mono">Lane</div>
          <div className="mt-1 text-sm font-semibold text-ink">{item.lane}</div>
        </div>
        <div>
          <div className="label-mono">Source</div>
          <div className="mt-1 text-sm font-semibold text-ink">{item.source}</div>
        </div>
        <div>
          <div className="label-mono">Documents</div>
          <div className="mt-1 text-sm font-semibold text-ink">
            {docCount} available
          </div>
        </div>
        {item.briefingAt ? (
          <div className="sm:col-span-2">
            <div className="label-mono">Briefing</div>
            <div className="mt-1 text-sm text-ink">
              {formatZaDate(item.briefingAt)}
              {item.briefingCompulsory ? " · compulsory" : ""}
              {item.briefingVenue ? ` · ${item.briefingVenue}` : ""}
            </div>
          </div>
        ) : null}
        {(item.contactName || item.contactEmail || item.contactPhone) && (
          <div className="sm:col-span-2">
            <div className="label-mono">Contact</div>
            <div className="mt-1 text-sm text-ink">
              {[item.contactName, item.contactEmail, item.contactPhone]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        )}
      </section>

      {item.description ? (
        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
          <h2 className="text-base font-semibold text-ink">Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">
            {item.description}
          </p>
        </section>
      ) : null}

      <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
        <h2 className="text-base font-semibold text-ink">Tender documents</h2>
        <p className="mt-1 text-sm text-muted">
          Downloads run only when you click — first fetch is cached for next
          time.
        </p>
        <ul className="mt-4 space-y-2">
          {item.documentLinks.map((doc, index) => (
            <li key={`${doc.url}-${index}`}>
              <a
                href={`/api/tenders/${item.id}/documents/${index}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy/90"
              >
                <span className="min-w-0">
                  <span className="block truncate">
                    {doc.title || `Document ${index + 1}`}
                  </span>
                  {doc.format ? (
                    <span className="mt-0.5 block font-mono text-[0.65rem] font-normal text-mint/90">
                      {doc.format}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 rounded-lg bg-mint px-3 py-1.5 text-xs font-semibold text-white">
                  Download
                </span>
              </a>
            </li>
          ))}
          {item.files.map((file) => (
            <li key={file.id}>
              <a
                href={`/api/opportunities/${item.id}/files/${file.id}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy/90"
              >
                <span className="min-w-0 truncate">
                  {file.filename}
                  <span className="ml-2 font-mono text-xs font-normal text-mint/90">
                    {formatBytes(file.size)}
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-mint px-3 py-1.5 text-xs font-semibold text-white">
                  Download
                </span>
              </a>
            </li>
          ))}
          {docCount === 0 ? (
            <li className="rounded-xl border border-dashed border-navy/15 px-4 py-6 text-center text-sm text-muted">
              No document links were stored for this tender at sync time. They
              will appear after a later intake run if eTenders publishes them.
            </li>
          ) : null}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        {item.convertedToLeadId ? (
          <Link
            href="/leads"
            className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-white"
          >
            Open in Leads
          </Link>
        ) : item.convertedToAccountId ? (
          <Link
            href="/accounts"
            className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-white"
          >
            Open in Accounts
          </Link>
        ) : item.inPipeline ? (
          <Link
            href="/opportunities"
            className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-white"
          >
            View on Opportunities
          </Link>
        ) : (
          <button
            type="button"
            onClick={promote}
            disabled={promoting || pending}
            className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {promoting ? "Moving…" : "Move to Opportunities"}
          </button>
        )}
        <Link
          href="/tenders"
          className="rounded-xl border border-navy/10 bg-white px-4 py-2.5 text-sm font-semibold text-navy"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
