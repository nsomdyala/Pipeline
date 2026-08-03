"use client";

import { useEffect, useState, useTransition } from "react";
import {
  LEAD_LANES,
  LEAD_SOURCES,
  type CreateLeadInput,
  type Lead,
  type LeadLane,
  type LeadSource,
} from "@/lib/leads/types";

const sourceLabels: Record<LeadSource, string> = {
  referral: "Referral",
  manual: "Manual",
  news: "News signal",
  portal: "Supplier portal",
  sap_bnd: "SAP Discovery",
  email: "Email",
};

const emptyForm: CreateLeadInput = {
  title: "",
  company: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  lane: "ICT / IS",
  sector: "private",
  source: "referral",
  notes: "",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
}

export function LeadsBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState<CreateLeadInput>(emptyForm);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/leads");
        if (!res.ok) throw new Error("Failed to load leads.");
        const data = (await res.json()) as { leads: Lead[] };
        if (!cancelled) setLeads(data.leads);
      } catch {
        if (!cancelled) setError("Could not load leads.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof CreateLeadInput>(
    key: K,
    value: CreateLeadInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = (await res.json()) as { lead?: Lead; error?: string };
        if (!res.ok || !data.lead) {
          throw new Error(data.error ?? "Could not save lead.");
        }
        setLeads((prev) => [data.lead!, ...prev]);
        setForm(emptyForm);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save lead.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-2">Board</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
            Leads
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Capture referrals, portal finds and early signals before they become
            opportunities. Private wins usually start here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setError(null);
          }}
          className="inline-flex items-center justify-center rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy transition-opacity hover:opacity-90"
        >
          {open ? "Cancel" : "Add lead"}
        </button>
      </header>

      {open ? (
        <form
          onSubmit={onSubmit}
          className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:p-6"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-[-0.02em] text-ink">
              New lead
            </h2>
            <span className="label-mono">Required: title + company</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="label-mono">Title</span>
              <input
                required
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="e.g. Solar rollout RFP for retail chain"
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>

            <label className="block">
              <span className="label-mono">Company / client</span>
              <input
                required
                value={form.company}
                onChange={(e) => updateField("company", e.target.value)}
                placeholder="Company name"
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>

            <label className="block">
              <span className="label-mono">Lane</span>
              <select
                value={form.lane}
                onChange={(e) => updateField("lane", e.target.value as LeadLane)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              >
                {LEAD_LANES.map((lane) => (
                  <option key={lane} value={lane}>
                    {lane}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label-mono">Sector</span>
              <select
                value={form.sector}
                onChange={(e) =>
                  updateField("sector", e.target.value as "public" | "private")
                }
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </label>

            <label className="block">
              <span className="label-mono">Source</span>
              <select
                value={form.source}
                onChange={(e) =>
                  updateField("source", e.target.value as LeadSource)
                }
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              >
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {sourceLabels[source]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label-mono">Contact name</span>
              <input
                value={form.contactName}
                onChange={(e) => updateField("contactName", e.target.value)}
                placeholder="Optional"
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>

            <label className="block">
              <span className="label-mono">Contact email</span>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => updateField("contactEmail", e.target.value)}
                placeholder="Optional"
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>

            <label className="block">
              <span className="label-mono">Contact phone</span>
              <input
                value={form.contactPhone}
                onChange={(e) => updateField("contactPhone", e.target.value)}
                placeholder="Optional"
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="label-mono">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={3}
                placeholder="How this came in, next step, who referred you…"
                className="mt-1.5 w-full resize-y rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 text-sm font-semibold text-coral" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-mist"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save lead"}
            </button>
          </div>
        </form>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">
            Your leads
          </h2>
          <span className="font-mono text-xs text-muted">
            {loading ? "…" : `${leads.length} total`}
          </span>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-muted shadow-sm ring-1 ring-navy/5">
            Loading leads…
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy/15 bg-white px-6 py-16 text-center">
            <p className="text-sm font-semibold text-ink">No leads yet</p>
            <p className="mt-2 text-sm text-muted">
              Click <span className="font-semibold text-ink">Add lead</span> to
              log a referral, portal find, or early signal.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {leads.map((lead) => (
              <li
                key={lead.id}
                className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-navy/5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold capitalize text-muted">
                        {lead.sector}
                      </span>
                      <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                        {sourceLabels[lead.source]}
                      </span>
                      <span className="rounded-md bg-mint/15 px-2 py-0.5 text-[0.65rem] font-semibold text-navy">
                        {lead.status}
                      </span>
                      <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                        {lead.lane}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-semibold tracking-[-0.02em] text-ink">
                      {lead.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {lead.company}
                      {lead.contactName ? ` · ${lead.contactName}` : ""}
                      {lead.contactEmail ? ` · ${lead.contactEmail}` : ""}
                    </p>
                    {lead.notes ? (
                      <p className="mt-2 text-sm text-ink/80">{lead.notes}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-left md:text-right">
                    <div className="label-mono">Logged</div>
                    <div className="mt-1 font-mono text-sm font-semibold text-ink">
                      {formatDate(lead.createdAt)}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {lead.ownerName}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
