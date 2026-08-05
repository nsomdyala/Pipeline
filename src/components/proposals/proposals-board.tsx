"use client";

import { useEffect, useState, useTransition } from "react";
import { formatZaDate, formatZar } from "@/lib/opportunities/dates";
import {
  PROPOSAL_STATUSES,
  type Proposal,
  type ProposalStatus,
} from "@/lib/proposals/types";

const statusLabel: Record<ProposalStatus, string> = {
  draft: "Draft",
  review: "In review",
  approved: "Approved",
};

export function ProposalsBoard() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    client: "",
    opportunityRef: "",
    summary: "",
    valueZar: "",
  });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void fetch("/api/proposals")
      .then((r) => r.json())
      .then((d: { proposals: Proposal[] }) => setProposals(d.proposals));
  }, []);

  function create(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          valueZar: form.valueZar === "" ? null : Number(form.valueZar),
        }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setProposals((prev) => [data.proposal, ...prev]);
      setOpen(false);
      setForm({
        title: "",
        client: "",
        opportunityRef: "",
        summary: "",
        valueZar: "",
      });
    });
  }

  function setStatus(id: string, status: ProposalStatus) {
    startTransition(async () => {
      const res = await fetch(`/api/proposals/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? data.proposal : p)),
      );
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-2">Bids</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
            Proposals
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Draft → review → approved. Seeded with The Innovation Hub and open
            RFQs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-white"
        >
          {open ? "Cancel" : "New proposal"}
        </button>
      </header>

      {open ? (
        <form
          onSubmit={create}
          className="mb-8 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:grid-cols-2"
        >
          <label className="md:col-span-2">
            <span className="label-mono">Title</span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label>
            <span className="label-mono">Client</span>
            <input
              required
              value={form.client}
              onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label>
            <span className="label-mono">Opportunity ref</span>
            <input
              value={form.opportunityRef}
              onChange={(e) =>
                setForm((f) => ({ ...f, opportunityRef: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm"
            />
          </label>
          <label>
            <span className="label-mono">Value (R)</span>
            <input
              type="number"
              value={form.valueZar}
              onChange={(e) =>
                setForm((f) => ({ ...f, valueZar: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm"
            />
          </label>
          <label className="md:col-span-2">
            <span className="label-mono">Summary</span>
            <textarea
              rows={3}
              value={form.summary}
              onChange={(e) =>
                setForm((f) => ({ ...f, summary: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-white"
            >
              Create draft
            </button>
          </div>
        </form>
      ) : null}

      <ul className="space-y-3">
        {proposals.map((proposal) => (
          <li
            key={proposal.id}
            className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-navy/5"
          >
            <div className="flex flex-wrap items-center gap-2">
              {proposal.opportunityRef ? (
                <span className="font-mono text-xs text-muted">
                  {proposal.opportunityRef}
                </span>
              ) : null}
              <span className="rounded-md bg-mint/15 px-2 py-0.5 text-[0.65rem] font-semibold text-ink">
                {statusLabel[proposal.status]}
              </span>
            </div>
            <h2 className="mt-1.5 text-lg font-semibold text-ink">
              {proposal.title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {proposal.client}
              {proposal.valueZar != null
                ? ` · ${formatZar(proposal.valueZar)}`
                : ""}
              {" · "}
              {formatZaDate(proposal.updatedAt)}
            </p>
            {proposal.summary ? (
              <p className="mt-2 text-sm text-ink/80">{proposal.summary}</p>
            ) : null}
            <label className="mt-4 block max-w-xs">
              <span className="label-mono">Status</span>
              <select
                value={proposal.status}
                disabled={pending}
                onChange={(e) =>
                  setStatus(proposal.id, e.target.value as ProposalStatus)
                }
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2 disabled:opacity-60"
              >
                {PROPOSAL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel[status]}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
