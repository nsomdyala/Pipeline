"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { formatZaDate, workingDaysUntil } from "@/lib/opportunities/dates";
import {
  PARTNER_KINDS,
  PARTNER_STATUSES,
  type PartnerKind,
  type PartnerStatus,
  type StrategicPartner,
} from "@/lib/partners/types";

const kindLabel: Record<PartnerKind, string> = {
  reseller: "Sells our systems",
  project: "Project partner",
  letter: "Partner letters",
  technology: "Technology",
};

type FormState = {
  name: string;
  kind: PartnerKind;
  status: PartnerStatus;
  role: string;
  contactName: string;
  contactEmail: string;
  website: string;
  notes: string;
  letterType: string;
  letterExpiresAt: string;
  providesPartnerLetter: boolean;
  sellsOurSystems: boolean;
  projectPartner: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  kind: "letter",
  status: "active",
  role: "",
  contactName: "",
  contactEmail: "",
  website: "",
  notes: "",
  letterType: "",
  letterExpiresAt: "",
  providesPartnerLetter: true,
  sellsOurSystems: false,
  projectPartner: false,
});

type Filter = "all" | "letter" | "reseller" | "project";

export function PartnersBoard() {
  const [partners, setPartners] = useState<StrategicPartner[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void fetch("/api/partners")
      .then((r) => r.json())
      .then((d: { partners: StrategicPartner[] }) => setPartners(d.partners));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return partners;
    if (filter === "letter") {
      return partners.filter((p) => p.providesPartnerLetter || p.kind === "letter");
    }
    if (filter === "reseller") {
      return partners.filter((p) => p.sellsOurSystems || p.kind === "reseller");
    }
    return partners.filter((p) => p.projectPartner || p.kind === "project");
  }, [partners, filter]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save partner.");
        return;
      }
      setPartners((prev) =>
        [...prev, data.partner].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setForm(emptyForm());
      setOpen(false);
    });
  }

  function remove(id: string) {
    if (!window.confirm("Remove this strategic partner?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/partners/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setPartners((prev) => prev.filter((p) => p.id !== id));
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-2">Network</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
            Strategic partners
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Channel partners who sell our systems, project co-bidders, and OEM
            partners (AWS, Sage, Microsoft…) who issue partner letters for bids.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setError(null);
          }}
          className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy"
        >
          {open ? "Cancel" : "Add partner"}
        </button>
      </header>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {(
          [
            ["all", "All"],
            ["letter", "Partner letters"],
            ["reseller", "Sell our systems"],
            ["project", "Project partners"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === value
                ? "bg-navy text-white"
                : "bg-white text-muted ring-1 ring-navy/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {open ? (
        <form
          onSubmit={submit}
          className="mb-8 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:grid-cols-2"
        >
          <label className="md:col-span-2">
            <span className="label-mono">Partner name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. AWS, Sage, Microsoft, Apex Digital…"
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label>
            <span className="label-mono">Type</span>
            <select
              value={form.kind}
              onChange={(e) => {
                const kind = e.target.value as PartnerKind;
                setForm((f) => ({
                  ...f,
                  kind,
                  providesPartnerLetter:
                    kind === "letter" ? true : f.providesPartnerLetter,
                  sellsOurSystems:
                    kind === "reseller" ? true : f.sellsOurSystems,
                  projectPartner:
                    kind === "project" ? true : f.projectPartner,
                }));
              }}
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            >
              {PARTNER_KINDS.map((k) => (
                <option key={k} value={k}>
                  {kindLabel[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-mono">Status</span>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as PartnerStatus,
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            >
              {PARTNER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="label-mono">Role with us</span>
            <input
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="What they do — letters, resale, co-bid…"
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label>
            <span className="label-mono">Contact</span>
            <input
              value={form.contactName}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactName: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label>
            <span className="label-mono">Email</span>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactEmail: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label>
            <span className="label-mono">Letter type</span>
            <input
              value={form.letterType}
              onChange={(e) =>
                setForm((f) => ({ ...f, letterType: e.target.value }))
              }
              placeholder="AWS Partner letter…"
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label>
            <span className="label-mono">Letter expires</span>
            <input
              type="date"
              value={form.letterExpiresAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, letterExpiresAt: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="md:col-span-2">
            <span className="label-mono">Website</span>
            <input
              value={form.website}
              onChange={(e) =>
                setForm((f) => ({ ...f, website: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="md:col-span-2">
            <span className="label-mono">Notes</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <div className="md:col-span-2 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.providesPartnerLetter}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    providesPartnerLetter: e.target.checked,
                  }))
                }
              />
              Provides partner letters
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.sellsOurSystems}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sellsOurSystems: e.target.checked,
                  }))
                }
              />
              Sells our systems
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.projectPartner}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    projectPartner: e.target.checked,
                  }))
                }
              />
              Project / co-bid partner
            </label>
          </div>
          {error ? (
            <p className="md:col-span-2 text-sm font-semibold text-coral">
              {error}
            </p>
          ) : null}
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save partner"}
            </button>
          </div>
        </form>
      ) : null}

      <ul className="space-y-3">
        {filtered.map((partner) => {
          const daysLeft = partner.letterExpiresAt
            ? workingDaysUntil(partner.letterExpiresAt)
            : null;
          const expiring =
            daysLeft != null && daysLeft >= 0 && daysLeft <= 60;
          return (
            <li
              key={partner.id}
              className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-navy/5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-mint/15 px-2 py-0.5 text-[0.65rem] font-semibold text-navy">
                      {kindLabel[partner.kind]}
                    </span>
                    <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold capitalize text-muted">
                      {partner.status}
                    </span>
                    {partner.providesPartnerLetter ? (
                      <span className="rounded-md bg-navy/5 px-2 py-0.5 text-[0.65rem] font-semibold text-navy">
                        Partner letter
                      </span>
                    ) : null}
                    {partner.sellsOurSystems ? (
                      <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                        Resells us
                      </span>
                    ) : null}
                    {partner.projectPartner ? (
                      <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                        Co-bid
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1.5 text-base font-semibold text-ink">
                    {partner.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {partner.role || "Strategic partner"}
                  </p>
                  {partner.letterType ? (
                    <p className="mt-1 text-xs text-muted">
                      {partner.letterType}
                      {partner.letterExpiresAt
                        ? ` · expires ${formatZaDate(partner.letterExpiresAt)}`
                        : ""}
                      {expiring ? " · renew soon" : ""}
                    </p>
                  ) : null}
                  {partner.contactName || partner.contactEmail ? (
                    <p className="mt-1 text-xs text-muted">
                      {[partner.contactName, partner.contactEmail]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                  {partner.notes ? (
                    <p className="mt-2 text-sm text-ink/80">{partner.notes}</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  {partner.website ? (
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-mint hover:underline"
                    >
                      Website
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(partner.id)}
                    className="text-xs font-semibold text-coral hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
