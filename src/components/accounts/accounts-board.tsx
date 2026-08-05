"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { formatZaDate, formatZar } from "@/lib/opportunities/dates";
import {
  ACCOUNT_DOC_LABELS,
  ACCOUNT_DOC_TYPES,
  ACCOUNT_LANES,
  ACCOUNT_STATUSES,
  type Account,
  type AccountDocType,
  type AccountLane,
  type AccountStatus,
} from "@/lib/accounts/types";

type FormState = {
  clientName: string;
  projectTitle: string;
  refNo: string;
  lane: AccountLane;
  sector: "public" | "private";
  status: AccountStatus;
  progressPercent: string;
  valueZar: string;
  startOn: string;
  endOn: string;
  notes: string;
};

const emptyForm: FormState = {
  clientName: "",
  projectTitle: "",
  refNo: "",
  lane: "ICT / IS",
  sector: "public",
  status: "active",
  progressPercent: "0",
  valueZar: "",
  startOn: "",
  endOn: "",
  notes: "",
};

const statusLabel: Record<AccountStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function AccountsBoard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [uploadTarget, setUploadTarget] = useState<{
    accountId: string;
    docType: AccountDocType;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/accounts");
        if (!res.ok) throw new Error("Failed to load accounts.");
        const data = (await res.json()) as { accounts: Account[] };
        if (!cancelled) setAccounts(data.accounts);
      } catch {
        if (!cancelled) setError("Could not load accounts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = useMemo(
    () => accounts.filter((a) => a.status === "active").length,
    [accounts],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            progressPercent: Number(form.progressPercent || 0),
            valueZar: form.valueZar === "" ? null : Number(form.valueZar),
            convertedFromOpportunity: true,
          }),
        });
        const data = (await res.json()) as {
          account?: Account;
          error?: string;
        };
        if (!res.ok || !data.account) {
          throw new Error(data.error ?? "Could not save account.");
        }
        setAccounts((prev) =>
          [data.account!, ...prev].sort((a, b) => {
            if (a.id === "acct-innovationhub") return -1;
            if (b.id === "acct-innovationhub") return 1;
            return a.clientName.localeCompare(b.clientName);
          }),
        );
        setForm(emptyForm);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save account.");
      }
    });
  }

  function onUpload(
    accountId: string,
    docType: AccountDocType,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selected = event.target.files;
    if (!selected || selected.length === 0) return;

    setUploadTarget({ accountId, docType });
    setError(null);

    startTransition(async () => {
      try {
        const body = new FormData();
        body.append("docType", docType);
        Array.from(selected).forEach((file) => body.append("files", file));
        const res = await fetch(`/api/accounts/${accountId}/documents`, {
          method: "POST",
          body,
        });
        const data = (await res.json()) as {
          account?: Account;
          error?: string;
        };
        if (!res.ok || !data.account) {
          throw new Error(data.error ?? "Upload failed.");
        }
        setAccounts((prev) =>
          prev.map((item) =>
            item.id === accountId ? data.account! : item,
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploadTarget(null);
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
            Accounts
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Converted opportunities in delivery. Keep signed contracts,
            appointment letters, billing and status packs on each account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setError(null);
          }}
          className="inline-flex items-center justify-center rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 text-white"
        >
          {open ? "Cancel" : "Add account"}
        </button>
      </header>

      {open ? (
        <form
          onSubmit={onSubmit}
          className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:p-6"
        >
          <div className="mb-4">
            <h2 className="text-base font-semibold tracking-[-0.02em] text-ink">
              Converted opportunity → account
            </h2>
            <p className="mt-1 text-sm text-muted">
              Log won work when an award moves off the pipeline.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="label-mono">Client</span>
              <input
                required
                value={form.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
                placeholder="e.g. The Innovation Hub"
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="label-mono">Original ref / RFQ</span>
              <input
                value={form.refNo}
                onChange={(e) => updateField("refNo", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="label-mono">Project title</span>
              <input
                required
                value={form.projectTitle}
                onChange={(e) => updateField("projectTitle", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="label-mono">Lane</span>
              <select
                value={form.lane}
                onChange={(e) =>
                  updateField("lane", e.target.value as AccountLane)
                }
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              >
                {ACCOUNT_LANES.map((lane) => (
                  <option key={lane} value={lane}>
                    {lane}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label-mono">Status</span>
              <select
                value={form.status}
                onChange={(e) =>
                  updateField("status", e.target.value as AccountStatus)
                }
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              >
                {ACCOUNT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel[status]}
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
              <span className="label-mono">Progress %</span>
              <input
                type="number"
                min="0"
                max="100"
                value={form.progressPercent}
                onChange={(e) => updateField("progressPercent", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="label-mono">Contract value (R)</span>
              <input
                type="number"
                min="0"
                value={form.valueZar}
                onChange={(e) => updateField("valueZar", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="label-mono">Start date</span>
              <input
                type="date"
                value={form.startOn}
                onChange={(e) => updateField("startOn", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="label-mono">End date</span>
              <input
                type="date"
                value={form.endOn}
                onChange={(e) => updateField("endOn", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm text-ink outline-none ring-mint/40 focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="label-mono">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={3}
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
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-mist"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold disabled:opacity-60 text-white"
            >
              {pending ? "Saving…" : "Save account"}
            </button>
          </div>
        </form>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">
            Active delivery
          </h2>
          <span className="font-mono text-xs text-muted">
            {loading ? "…" : `${activeCount} active · ${accounts.length} total`}
          </span>
        </div>

        {error && !open ? (
          <p className="mb-3 text-sm font-semibold text-coral" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-muted shadow-sm ring-1 ring-navy/5">
            Loading accounts…
          </div>
        ) : (
          <ul className="space-y-4">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-navy/5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {account.refNo ? (
                        <span className="font-mono text-xs text-muted">
                          {account.refNo}
                        </span>
                      ) : null}
                      <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold capitalize text-muted">
                        {account.sector}
                      </span>
                      <span className="rounded-md bg-mint/15 px-2 py-0.5 text-[0.65rem] font-semibold text-ink">
                        {statusLabel[account.status]}
                      </span>
                      <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                        {account.lane}
                      </span>
                      {account.convertedFromOpportunity ? (
                        <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                          Converted
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-ink">
                      <Link
                        href={`/accounts/${account.id}`}
                        className="hover:text-[var(--slack-rail-active)] hover:underline"
                      >
                        {account.clientName}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {account.projectTitle}
                      {account.valueZar != null
                        ? ` · ${formatZar(account.valueZar)}`
                        : ""}
                    </p>
                    <div className="mt-2">
                      <Link
                        href={`/accounts/${account.id}?tab=pmo`}
                        className="text-xs font-semibold text-[var(--slack-rail-active)] hover:underline"
                      >
                        Open PMO →
                      </Link>
                    </div>
                    {account.notes ? (
                      <p className="mt-2 text-sm text-ink/80">{account.notes}</p>
                    ) : null}

                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="label-mono">Progress</span>
                        <span className="font-mono font-semibold text-ink">
                          {account.progressPercent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-mist">
                        <div
                          className="h-full rounded-full bg-mint"
                          style={{ width: `${account.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="label-mono mb-3">Documentation</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {ACCOUNT_DOC_TYPES.map((docType) => {
                          const docs = account.documents.filter(
                            (d) => d.docType === docType,
                          );
                          const uploading =
                            uploadTarget?.accountId === account.id &&
                            uploadTarget.docType === docType;
                          return (
                            <div
                              key={docType}
                              className="rounded-xl border border-navy/8 bg-mist/30 p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-ink">
                                  {ACCOUNT_DOC_LABELS[docType]}
                                </span>
                                <label className="cursor-pointer text-xs font-semibold text-navy">
                                  <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-navy/10 hover:bg-mint/15">
                                    {uploading ? "Uploading…" : "Upload"}
                                  </span>
                                  <input
                                    type="file"
                                    multiple
                                    className="sr-only"
                                    disabled={uploading || pending}
                                    onChange={(e) =>
                                      onUpload(account.id, docType, e)
                                    }
                                  />
                                </label>
                              </div>
                              {docs.length === 0 ? (
                                <p className="mt-2 text-xs text-muted">
                                  None uploaded
                                </p>
                              ) : (
                                <ul className="mt-2 space-y-1">
                                  {docs.map((doc) => (
                                    <li key={doc.id}>
                                      <a
                                        href={`/api/accounts/${account.id}/documents/${doc.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-semibold text-mint hover:underline"
                                      >
                                        {doc.filename}
                                      </a>
                                      <span className="ml-1.5 font-mono text-[0.65rem] text-muted">
                                        {formatBytes(doc.size)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-left lg:w-40 lg:text-right">
                    <div className="label-mono">Delivery window</div>
                    <div className="mt-1 font-mono text-sm font-semibold text-ink">
                      {account.startOn
                        ? formatZaDate(account.startOn)
                        : "—"}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-muted">
                      to{" "}
                      {account.endOn ? formatZaDate(account.endOn) : "—"}
                    </div>
                    <div className="mt-3 text-xs text-muted">
                      {account.ownerName}
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
