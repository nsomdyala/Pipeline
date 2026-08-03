"use client";

import { useEffect, useState, useTransition } from "react";
import { formatZaDate } from "@/lib/opportunities/dates";
import type { ComplianceStatus, DocTypeKey } from "@/lib/compliance/types";

type VaultRow = {
  key: DocTypeKey;
  name: string;
  validityMonths: number | null;
  requiredByDefault: boolean;
  status: ComplianceStatus;
  document: {
    id: string;
    filename: string;
    issuedOn: string;
    expiresOn: string;
    version: number;
  } | null;
};

const statusLabel: Record<ComplianceStatus, string> = {
  valid: "Valid",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  missing: "Missing",
};

export function ComplianceBoard() {
  const [rows, setRows] = useState<VaultRow[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reload() {
    return fetch("/api/compliance")
      .then((r) => r.json())
      .then((d: { rows: VaultRow[] }) => setRows(d.rows));
  }

  useEffect(() => {
    void reload().catch(() => setError("Could not load vault."));
  }, []);

  function upload(typeKey: DocTypeKey, file: File) {
    const issuedOn = new Date().toISOString().slice(0, 10);
    const body = new FormData();
    body.append("typeKey", typeKey);
    body.append("issuedOn", issuedOn);
    body.append("file", file);
    startTransition(async () => {
      const res = await fetch("/api/compliance", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      setRows(data.rows);
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-2">Vault</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
            Compliance
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Tax clearance, CSD, B-BBEE, IDs and proofs — with expiry status for
            Max Attention Technologies.
          </p>
        </div>
        <a
          href="/api/compliance/bid-pack"
          className="inline-flex rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy"
        >
          Download bid pack
        </a>
      </header>

      {error ? <p className="mb-3 text-sm font-semibold text-coral">{error}</p> : null}

      <ul className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const atRisk =
            row.status === "expired" || row.status === "expiring_soon";
          return (
            <li
              key={row.key}
              className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-navy/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">{row.name}</h2>
                  <p className="mt-1 text-xs text-muted">
                    {row.validityMonths
                      ? `Valid ${row.validityMonths} months from issue`
                      : "No expiry rule"}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[0.65rem] font-semibold ${
                    row.status === "valid"
                      ? "bg-mint/15 text-navy"
                      : atRisk
                        ? "bg-coral/15 text-coral"
                        : "bg-mist text-muted"
                  }`}
                >
                  {statusLabel[row.status]}
                </span>
              </div>

              {row.document ? (
                <p className="mt-3 text-sm text-muted">
                  {row.document.filename}
                  <br />
                  Issued {formatZaDate(row.document.issuedOn)}
                  {row.document.expiresOn
                    ? ` · expires ${formatZaDate(row.document.expiresOn)}`
                    : ""}
                  {" · "}v{row.document.version}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted">No file uploaded yet.</p>
              )}

              <label className="mt-3 inline-flex cursor-pointer">
                <span className="rounded-lg bg-mist px-3 py-1.5 text-xs font-semibold text-navy hover:bg-mint/15">
                  {pending ? "Uploading…" : "Upload / replace"}
                </span>
                <input
                  type="file"
                  className="sr-only"
                  disabled={pending}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload(row.key, file);
                    e.target.value = "";
                  }}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
