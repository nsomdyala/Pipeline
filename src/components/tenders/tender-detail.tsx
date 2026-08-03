"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
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
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tenders/${id}`);
        const data = (await res.json()) as {
          opportunity?: Opportunity;
          error?: string;
        };
        if (!res.ok || !data.opportunity) {
          throw new Error(data.error ?? "Tender not found.");
        }
        if (!cancelled) setItem(data.opportunity);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load tender.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
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
        const res = await fetch(`/api/tenders/${item.id}/promote`, {
          method: "POST",
        });
        const data = (await res.json()) as {
          opportunity?: Opportunity;
          error?: string;
        };
        if (!res.ok || !data.opportunity) {
          throw new Error(data.error ?? "Could not add to Opportunities.");
        }
        setItem(data.opportunity);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not add to Opportunities.",
        );
      } finally {
        setPromoting(false);
      }
    });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-muted">
        Loading tender…
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm font-semibold text-coral">
          {error ?? "Tender not found."}
        </p>
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
      : "Tender / RFP";

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
          <span className="rounded-md bg-mint/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-navy">
            {typeLabel}
          </span>
          <span className="font-mono text-xs text-muted">{item.refNo}</span>
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
            {formatZaDate(item.closingAt)}
          </div>
          <div className="text-xs text-muted">
            {days} working {days === 1 ? "day" : "days"} left
          </div>
        </div>
        <div>
          <div className="label-mono">Lane</div>
          <div className="mt-1 text-sm font-semibold text-ink">{item.lane}</div>
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
        <h2 className="text-base font-semibold text-ink">Documents</h2>
        <p className="mt-1 text-sm text-muted">
          Download packs here — files stay inside Pipeline.
        </p>
        <ul className="mt-4 space-y-2">
          {item.documentLinks.map((doc, index) => (
            <li key={`${doc.url}-${index}`}>
              <a
                href={`/api/tenders/${item.id}/documents/${index}`}
                download
                className="flex items-center justify-between gap-3 rounded-xl bg-mist/60 px-3 py-2.5 text-sm font-semibold text-navy hover:bg-mint/15"
              >
                <span>{doc.title || "Document"}</span>
                <span className="shrink-0 text-xs font-semibold text-mint">
                  Download
                </span>
              </a>
            </li>
          ))}
          {item.files.map((file) => (
            <li key={file.id}>
              <a
                href={`/api/opportunities/${item.id}/files/${file.id}`}
                download
                className="flex items-center justify-between gap-3 rounded-xl bg-mist/60 px-3 py-2.5 text-sm font-semibold text-navy hover:bg-mint/15"
              >
                <span>
                  {file.filename}
                  <span className="ml-2 font-mono text-xs font-normal text-muted">
                    {formatBytes(file.size)}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-mint">
                  Download
                </span>
              </a>
            </li>
          ))}
          {item.documentLinks.length === 0 && item.files.length === 0 ? (
            <li className="text-sm text-muted">
              No documents attached for this tender yet.
            </li>
          ) : null}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        {item.convertedToLeadId ? (
          <Link
            href="/leads"
            className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy"
          >
            Open in Leads
          </Link>
        ) : item.convertedToAccountId ? (
          <Link
            href="/accounts"
            className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy"
          >
            Open in Accounts
          </Link>
        ) : item.inPipeline ? (
          <Link
            href="/opportunities"
            className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy"
          >
            On Opportunities
          </Link>
        ) : (
          <button
            type="button"
            onClick={promote}
            disabled={promoting || pending}
            className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
          >
            {promoting ? "Adding…" : "Add to Opportunities"}
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
