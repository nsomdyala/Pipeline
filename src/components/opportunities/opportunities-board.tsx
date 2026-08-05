"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  displayTenderRef,
  formatZaClosing,
  formatZaDate,
  formatZar,
  workingDaysUntil,
} from "@/lib/opportunities/dates";
import {
  OPP_LANES,
  OPP_SOURCES,
  OPP_STAGES,
  type Opportunity,
  type OpportunityType,
  type OppLane,
  type OppSource,
  type OppStage,
} from "@/lib/opportunities/types";
import type { SubmissionKind } from "@/lib/leads/types";

type TypeFilter = "all" | OpportunityType;

type FormState = {
  refNo: string;
  title: string;
  description: string;
  buyer: string;
  sector: "public" | "private";
  source: OppSource;
  lane: OppLane;
  stage: OppStage;
  closingAt: string;
  briefingAt: string;
  briefingCompulsory: boolean;
  briefingVenue: string;
  estimatedValueZar: string;
  sourceUrl: string;
};

const emptyForm: FormState = {
  refNo: "",
  title: "",
  description: "",
  buyer: "",
  sector: "public",
  source: "Manual",
  lane: "ICT / IS",
  stage: "Spotted",
  closingAt: "",
  briefingAt: "",
  briefingCompulsory: false,
  briefingVenue: "",
  estimatedValueZar: "",
  sourceUrl: "",
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function OpportunitiesBoard() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [files, setFiles] = useState<FileList | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const oppRes = await fetch("/api/opportunities?scope=pipeline");
        if (!oppRes.ok) throw new Error("Failed to load opportunities.");
        const data = (await oppRes.json()) as { opportunities: Opportunity[] };
        if (!cancelled) setItems(data.opportunities);
      } catch {
        if (!cancelled) setError("Could not load opportunities.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter === "all") return true;
      return (
        item.opportunityType === typeFilter ||
        (typeFilter === "panel" && item.isPanel)
      );
    });
  }, [items, typeFilter]);

  const openCount = useMemo(
    () =>
      filtered.filter(
        (item) =>
          !item.stage.startsWith("Closed") && item.stage !== "Active account",
      ).length,
    [filtered],
  );

  const panelCount = useMemo(
    () => items.filter((item) => item.isPanel).length,
    [items],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const body = new FormData();
        Object.entries(form).forEach(([key, value]) => {
          body.append(key, String(value));
        });
        if (files) {
          Array.from(files).forEach((file) => body.append("files", file));
        }

        const res = await fetch("/api/opportunities", {
          method: "POST",
          body,
        });
        const data = (await res.json()) as {
          opportunity?: Opportunity;
          error?: string;
        };
        if (!res.ok || !data.opportunity) {
          throw new Error(data.error ?? "Could not save opportunity.");
        }

        setItems((prev) =>
          [data.opportunity!, ...prev].sort(
            (a, b) =>
              new Date(a.closingAt).getTime() - new Date(b.closingAt).getTime(),
          ),
        );
        setForm(emptyForm);
        setFiles(null);
        setOpen(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not save opportunity.",
        );
      }
    });
  }

  function onUpload(
    opportunityId: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selected = event.target.files;
    if (!selected || selected.length === 0) return;

    setUploadingId(opportunityId);
    setError(null);

    startTransition(async () => {
      try {
        const body = new FormData();
        Array.from(selected).forEach((file) => body.append("files", file));
        const res = await fetch(`/api/opportunities/${opportunityId}/files`, {
          method: "POST",
          body,
        });
        const data = (await res.json()) as {
          opportunity?: Opportunity;
          error?: string;
        };
        if (!res.ok || !data.opportunity) {
          throw new Error(data.error ?? "Upload failed.");
        }
        setItems((prev) =>
          prev.map((item) =>
            item.id === opportunityId ? data.opportunity! : item,
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploadingId(null);
        event.target.value = "";
      }
    });
  }

  function onSubmitToLeads(
    opportunityId: string,
    kind: SubmissionKind,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selected = event.target.files;
    if (!selected || selected.length === 0) return;
    setMovingId(opportunityId);
    setError(null);
    startTransition(async () => {
      try {
        const body = new FormData();
        body.set("kind", kind);
        Array.from(selected).forEach((file) => body.append("files", file));
        const res = await fetch(`/api/opportunities/${opportunityId}/to-lead`, {
          method: "POST",
          body,
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Could not move to Leads.");
        }
        setItems((prev) => prev.filter((item) => item.id !== opportunityId));
        setStatusMessage(
          `${kind === "quotation" ? "Quotation" : "Pricing"} uploaded — moved to Leads.`,
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not move to Leads.",
        );
      } finally {
        setMovingId(null);
        event.target.value = "";
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-2">Board</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
            Opportunities
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Add opportunities manually, or move RFQs / tenders / RFPs here from
            All Tenders. When you submit, upload the quotation or pricing to
            move into Leads.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen((value) => !value);
              setError(null);
            }}
            className="inline-flex items-center justify-center rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 text-white"
          >
            {open ? "Cancel" : "Add opportunity"}
          </button>
        </div>
      </header>

      {statusMessage ? (
        <p className="mb-4 text-xs font-semibold text-mint">{statusMessage}</p>
      ) : null}

      {open ? (
        <form
          onSubmit={onSubmit}
          className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:p-6"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-[-0.02em] text-ink">
              New opportunity
            </h2>
            <span className="label-mono">Upload RFQ docs below</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="label-mono">Reference / RFQ no.</span>
              <input
                required
                value={form.refNo}
                onChange={(e) => updateField("refNo", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="label-mono">Buyer / client</span>
              <input
                required
                value={form.buyer}
                onChange={(e) => updateField("buyer", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="label-mono">Title</span>
              <input
                required
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="label-mono">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
                className="mt-1.5 w-full resize-y rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="label-mono">Lane</span>
              <select
                value={form.lane}
                onChange={(e) => updateField("lane", e.target.value as OppLane)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              >
                {OPP_LANES.map((lane) => (
                  <option key={lane} value={lane}>
                    {lane}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label-mono">Stage</span>
              <select
                value={form.stage}
                onChange={(e) =>
                  updateField("stage", e.target.value as OppStage)
                }
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              >
                {OPP_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
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
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="block">
              <span className="label-mono">Source</span>
              <select
                value={form.source}
                onChange={(e) =>
                  updateField("source", e.target.value as OppSource)
                }
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              >
                {OPP_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label-mono">Closing date & time</span>
              <input
                required
                type="datetime-local"
                value={form.closingAt}
                onChange={(e) => updateField("closingAt", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="label-mono">Estimated value (R)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.estimatedValueZar}
                onChange={(e) =>
                  updateField("estimatedValueZar", e.target.value)
                }
                placeholder="Optional"
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="label-mono">Briefing date & time</span>
              <input
                type="datetime-local"
                value={form.briefingAt}
                onChange={(e) => updateField("briefingAt", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="flex items-end gap-2 pb-2">
              <input
                type="checkbox"
                checked={form.briefingCompulsory}
                onChange={(e) =>
                  updateField("briefingCompulsory", e.target.checked)
                }
                className="size-4 rounded border-navy/20 text-mint focus:ring-mint"
              />
              <span className="text-sm text-ink">Compulsory briefing</span>
            </label>
            <label className="block md:col-span-2">
              <span className="label-mono">Briefing venue / link</span>
              <input
                value={form.briefingVenue}
                onChange={(e) => updateField("briefingVenue", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="label-mono">Source URL</span>
              <input
                type="url"
                value={form.sourceUrl}
                onChange={(e) => updateField("sourceUrl", e.target.value)}
                placeholder="https://"
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="label-mono">Upload information (RFQ, specs, pricing)</span>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="mt-1.5 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-mint/15 file:px-3 file:py-2 file:text-sm file:font-semibold file:"
              />
              {files && files.length > 0 ? (
                <p className="mt-1.5 text-xs text-muted">
                  {files.length} file{files.length === 1 ? "" : "s"} selected
                </p>
              ) : null}
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
              className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold disabled:opacity-60 text-white"
            >
              {pending ? "Saving…" : "Save opportunity"}
            </button>
          </div>
        </form>
      ) : null}

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">
              Pipeline
            </h2>
            <span className="font-mono text-xs text-muted">
              {loading
                ? "…"
                : `${openCount} open · ${filtered.length} shown · ${panelCount} panels`}
            </span>
          </div>
          <div
            className="flex flex-wrap items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-navy/5"
            role="tablist"
            aria-label="Opportunity type"
          >
            {(
              [
                ["all", "All"],
                ["panel", "Panels"],
                ["rfq", "RFQs"],
                ["rfp", "RFPs"],
                ["tender", "Tenders"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={typeFilter === value}
                onClick={() => setTypeFilter(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${typeFilter === value ? "bg-mint text-white" : "text-muted hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && !open ? (
          <p className="mb-3 text-sm font-semibold text-coral" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-muted shadow-sm ring-1 ring-navy/5">
            Loading opportunities…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy/15 bg-white px-6 py-16 text-center">
            <p className="text-sm font-semibold text-ink">No opportunities yet</p>
            <p className="mt-2 text-sm text-muted">
              Use{" "}
              <span className="font-semibold text-ink">Add opportunity</span>,
              or move an RFQ / tender / RFP from All Tenders.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((item) => {
              const days = workingDaysUntil(item.closingAt);
              const atRisk = days < 3;
              return (
                <li
                  key={item.id}
                  className={`rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ${item.isPanel ? "ring-mint/35" : "ring-navy/5"}`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted">
                          {displayTenderRef(item)}
                        </span>
                        {item.isPanel ? (
                          <span className="rounded-md bg-mint px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white">
                            Panel
                          </span>
                        ) : (
                          <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                            {item.opportunityType === "rfq"
                              ? "RFQ"
                              : item.opportunityType === "rfp"
                                ? "RFP"
                                : "Tender"}
                          </span>
                        )}
                        <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold capitalize text-muted">
                          {item.sector}
                        </span>
                        <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                          {item.source}
                        </span>
                        <span className="rounded-md bg-mint/15 px-2 py-0.5 text-[0.65rem] font-semibold text-ink">
                          {item.stage}
                        </span>
                        <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                          {item.lane}
                        </span>
                        {item.category ? (
                          <span className="rounded-md bg-navy/5 px-2 py-0.5 text-[0.65rem] font-semibold text-navy">
                            {item.category}
                          </span>
                        ) : null}
                        {item.isAmended ? (
                          <span className="pill pill-overdue">
                            Amended
                          </span>
                        ) : null}
                        {item.lowRelevance ? (
                          <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                            Low relevance
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-1.5 text-base font-semibold tracking-[-0.02em] text-ink">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {item.buyer}
                        {item.estimatedValueZar != null
                          ? ` · ${formatZar(item.estimatedValueZar)}`
                          : item.isPanel
                            ? " · value TBD (panel)"
                            : ""}
                        {item.panelTerm ? ` · ${item.panelTerm}` : ""}
                      </p>
                      {item.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-ink/80">
                          {item.description}
                        </p>
                      ) : null}

                      <div className="mt-3 space-y-2">
                        {item.files.length > 0 ? (
                          <ul className="space-y-1">
                            {item.files.map((file) => (
                              <li key={file.id}>
                                <a
                                  href={`/api/opportunities/${item.id}/files/${file.id}`}
                                  className="text-sm font-semibold text-mint hover:underline"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {file.filename}
                                </a>
                                <span className="ml-2 font-mono text-xs text-muted">
                                  {formatBytes(file.size)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex cursor-pointer items-center text-xs font-semibold text-navy">
                            <span className="rounded-lg bg-mist px-2.5 py-1.5 hover:bg-mint/15">
                              {uploadingId === item.id
                                ? "Uploading…"
                                : "Attach docs"}
                            </span>
                            <input
                              type="file"
                              multiple
                              className="sr-only"
                              disabled={
                                uploadingId === item.id ||
                                movingId === item.id ||
                                pending
                              }
                              onChange={(e) => onUpload(item.id, e)}
                            />
                          </label>
                          <label className="inline-flex cursor-pointer items-center text-xs font-semibold text-navy">
                            <span className="rounded-lg bg-mint/20 px-2.5 py-1.5 ring-1 ring-mint/40 hover:bg-mint/30">
                              {movingId === item.id
                                ? "Moving…"
                                : "Upload quotation → Leads"}
                            </span>
                            <input
                              type="file"
                              multiple
                              className="sr-only"
                              disabled={movingId === item.id || pending}
                              onChange={(e) =>
                                onSubmitToLeads(item.id, "quotation", e)
                              }
                            />
                          </label>
                          <label className="inline-flex cursor-pointer items-center text-xs font-semibold text-navy">
                            <span className="rounded-lg bg-mint/20 px-2.5 py-1.5 ring-1 ring-mint/40 hover:bg-mint/30">
                              {movingId === item.id
                                ? "Moving…"
                                : "Upload pricing → Leads"}
                            </span>
                            <input
                              type="file"
                              multiple
                              className="sr-only"
                              disabled={movingId === item.id || pending}
                              onChange={(e) =>
                                onSubmitToLeads(item.id, "pricing", e)
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-left md:text-right">
                      <div className="label-mono">Closing</div>
                      <div
                        className={`mt-1 font-mono text-sm font-semibold ${atRisk ? "text-coral" : "text-ink"}`}
                      >
                        {formatZaClosing(item.closingAt)}
                      </div>
                      <div
                        className={`mt-0.5 text-xs font-semibold ${atRisk ? "text-coral" : "text-muted"}`}
                      >
                        {days} working {days === 1 ? "day" : "days"} left
                      </div>
                      {item.briefingAt ? (
                        <p className="mt-2 text-xs text-muted">
                          Briefing {formatZaDate(item.briefingAt)}
                          {item.briefingCompulsory ? " · compulsory" : ""}
                        </p>
                      ) : null}
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
