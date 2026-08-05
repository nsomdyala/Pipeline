"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";
import { PipelineMark } from "@/components/brand/pipeline-mark";
import {
  COMPANY_INDUSTRIES,
  COMPANY_PILLARS,
  COMPANY_PRODUCTS,
} from "@/lib/company/content";
import type { ComplianceStatus, DocTypeKey } from "@/lib/compliance/types";
import type { CompanyProfile, SettingsBundle } from "@/lib/settings/types";

type VaultRow = {
  key: DocTypeKey;
  name: string;
  status: ComplianceStatus;
};

type Tab =
  | "overview"
  | "services"
  | "products"
  | "credentials"
  | "banking"
  | "edit";

const LANE_ACCENTS: Record<string, string> = {
  "ICT / IS": "var(--accent)",
  Website: "#38bdf8",
  "Asset management": "#f59e0b",
  "Solar / electrical": "#10b981",
  Other: "#94a3b8",
};

function CopyChip({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!value}
      className="company-cred group relative flex min-h-[5.5rem] flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border border-[var(--slack-border)] bg-white p-4 text-left transition hover:border-mint/40 hover:bg-[color-mix(in_srgb,var(--accent)_4%,white)] disabled:cursor-default disabled:opacity-60"
    >
      <span className="label-mono">{label}</span>
      <span className="mt-3 font-mono text-[0.95rem] font-semibold tracking-tight text-ink">
        {value || "—"}
      </span>
      <span className="absolute right-3 top-3 text-muted opacity-0 transition group-hover:opacity-100">
        {copied ? (
          <Check size={14} className="text-mint" />
        ) : (
          <Copy size={14} />
        )}
      </span>
    </button>
  );
}

function ReadinessRing({
  valid,
  total,
}: {
  valid: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((valid / total) * 100);
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative mx-auto size-36">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--slack-border)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="company-ring"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tracking-tight text-ink">{pct}%</span>
        <span className="label-mono mt-0.5">Bid ready</span>
      </div>
    </div>
  );
}

export function CompanyProfileBoard() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [draft, setDraft] = useState<CompanyProfile | null>(null);
  const [lanes, setLanes] = useState<{ lane: string; terms: string[] }[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [vault, setVault] = useState<VaultRow[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [settingsRes, complianceRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/compliance"),
        ]);
        if (!settingsRes.ok) throw new Error("Failed to load company profile.");
        const settings = (await settingsRes.json()) as SettingsBundle;
        const compliance = complianceRes.ok
          ? ((await complianceRes.json()) as { rows: VaultRow[] })
          : { rows: [] };
        if (!cancelled) {
          setCompany(settings.company);
          setDraft(settings.company);
          setLanes(settings.keywords ?? []);
          setUsersCount(settings.users?.length ?? 0);
          setVault(compliance.rows ?? []);
        }
      } catch {
        if (!cancelled) setError("Could not load company profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const readiness = useMemo(() => {
    const valid = vault.filter((r) => r.status === "valid").length;
    const atRisk = vault.filter(
      (r) => r.status === "expired" || r.status === "expiring_soon",
    ).length;
    const missing = vault.filter((r) => r.status === "missing").length;
    return { valid, total: vault.length, atRisk, missing };
  }, [vault]);

  function openEdit() {
    setDraft(company);
    setTab("edit");
  }

  function cancelEdit() {
    setDraft(company);
    setTab("overview");
  }

  function updateDraft<K extends keyof CompanyProfile>(
    key: K,
    value: CompanyProfile[K],
  ) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateBank(
    key: keyof CompanyProfile["bankDetails"],
    value: string,
  ) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            bankDetails: { ...prev.bankDetails, [key]: value },
          }
        : prev,
    );
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: draft }),
      });
      const data = (await res.json()) as SettingsBundle & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save profile.");
        return;
      }
      setCompany(data.company);
      setDraft(data.company);
      setSaved(true);
      setTab("overview");
      window.setTimeout(() => setSaved(false), 2200);
    });
  }

  if (loading) {
    return (
      <div className="px-6 py-20 text-center text-sm text-muted">
        Loading company profile…
      </div>
    );
  }

  if (!company || !draft) {
    return (
      <div className="px-6 py-20 text-center text-sm text-coral">
        {error ?? "Company profile unavailable."}
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "services", label: "Services" },
    { key: "products", label: "Products" },
    { key: "credentials", label: "Credentials" },
    { key: "banking", label: "Banking" },
    { key: "edit", label: "Edit" },
  ];

  const siteLabel = company.website.replace(/^https?:\/\//, "");

  return (
    <div className="company-profile pb-12">
      <section className="company-hero relative overflow-hidden text-white">
        <div
          className="company-hero-atmosphere pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
          <div className="company-hero-content flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-5 flex items-center gap-3">
                <PipelineMark size={52} animated className="company-hero-mark" />
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mint/90">
                    Company profile
                  </p>
                  <a
                    href={company.website || "https://www.maxattention.tech"}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 text-xs text-white/55 transition hover:text-mint"
                  >
                    {siteLabel || "www.maxattention.tech"}
                  </a>
                </div>
              </div>

              <h1 className="company-title text-[2.15rem] font-bold leading-[1.05] tracking-[-0.04em] md:text-[2.75rem]">
                {company.tradingAs || company.name}
              </h1>
              <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-white/70">
                {company.tagline ||
                  "Technology & energy solutions partner — through integrated innovation."}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/65">
                <span>
                  Reg{" "}
                  <span className="font-semibold text-white">
                    {company.regNo || "—"}
                  </span>
                </span>
                {company.foundedYear ? (
                  <span>Est. {company.foundedYear}</span>
                ) : null}
                <span>City Deep, Johannesburg</span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
              <div className="rounded-[var(--radius-lg)] border border-white/15 bg-white/8 px-4 py-3 backdrop-blur-sm">
                <p className="label-mono text-white/45">Director</p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-mint">
                  {company.directors || "—"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={company.website || "https://www.maxattention.tech"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  <ExternalLink size={14} />
                  Website
                </a>
                <button
                  type="button"
                  onClick={openEdit}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <Pencil size={14} />
                  Edit profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="company-toolbar -mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--slack-border)] bg-white px-3 py-2 shadow-[0_8px_30px_rgba(29,28,29,0.06)]">
          <div className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  if (t.key === "edit") openEdit();
                  else setTab(t.key);
                }}
                className={`rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-semibold transition ${tab === t.key ? "bg-navy text-white" : "text-muted hover:bg-[var(--slack-row-hover)] hover:text-ink"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-mint">
              <Check size={14} /> Saved
            </span>
          ) : (
            <span className="text-xs text-muted">
              {COMPANY_PILLARS.length} pillars · {usersCount} team
            </span>
          )}
        </div>

        {error ? (
          <p className="mt-4 text-sm font-semibold text-coral">{error}</p>
        ) : null}

        {tab === "overview" ? (
          <div className="company-stagger mt-8 grid gap-6 lg:grid-cols-12">
            <section className="surface company-panel p-5 md:p-6 lg:col-span-7">
              <p className="label-mono">Who we are</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink">
                A trusted technology & energy solutions partner
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {company.about}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {COMPANY_INDUSTRIES.map((industry) => (
                  <span
                    key={industry}
                    className="rounded-[var(--radius-sm)] bg-[var(--slack-main-subtle)] px-2 py-1 text-[0.7rem] font-semibold text-muted"
                  >
                    {industry}
                  </span>
                ))}
              </div>
            </section>

            <aside className="surface company-panel flex flex-col items-center justify-center gap-4 p-6 lg:col-span-5">
              <ReadinessRing
                valid={readiness.valid}
                total={readiness.total}
              />
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Valid docs</span>
                  <span className="font-semibold text-ink">
                    {readiness.valid}/{readiness.total}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>At risk</span>
                  <span className="font-semibold text-ink">
                    {readiness.atRisk}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Missing</span>
                  <span className="font-semibold text-ink">
                    {readiness.missing}
                  </span>
                </div>
              </div>
              <Link href="/compliance" className="btn btn-secondary w-full">
                <ShieldCheck size={14} />
                Open compliance vault
              </Link>
            </aside>

            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-2">
              <CopyChip label="Registration no." value={company.regNo} />
              <CopyChip label="CSD number" value={company.csdNo} />
              <CopyChip label="VAT number" value={company.vatNo} />
              <CopyChip label="B-BBEE level" value={company.bbbeeLevel} />
            </div>

            <section className="surface company-panel grid gap-5 p-5 md:p-6 lg:col-span-5">
              <div>
                <p className="label-mono">Vision</p>
                <p className="mt-2 text-sm leading-relaxed text-ink">
                  {company.vision}
                </p>
              </div>
              <div className="border-t border-[var(--slack-border)] pt-5">
                <p className="label-mono">Mission</p>
                <p className="mt-2 text-sm leading-relaxed text-ink">
                  {company.mission}
                </p>
              </div>
            </section>

            <section className="surface company-panel p-5 md:p-6 lg:col-span-5">
              <h2 className="text-base font-semibold text-ink">Contact</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <Mail size={16} className="mt-0.5 shrink-0 text-mint" />
                  <div>
                    <p className="label-mono">Email</p>
                    <a
                      href={
                        company.email ? `mailto:${company.email}` : undefined
                      }
                      className="mt-0.5 font-medium text-ink hover:text-slack-blue"
                    >
                      {company.email || "—"}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Phone size={16} className="mt-0.5 shrink-0 text-mint" />
                  <div>
                    <p className="label-mono">Phone</p>
                    <a
                      href={
                        company.phone
                          ? `tel:${company.phone.replace(/\s/g, "")}`
                          : undefined
                      }
                      className="mt-0.5 font-medium text-ink hover:text-slack-blue"
                    >
                      {company.phone || "—"}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ExternalLink
                    size={16}
                    className="mt-0.5 shrink-0 text-mint"
                  />
                  <div>
                    <p className="label-mono">Website</p>
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 font-medium text-ink hover:text-slack-blue"
                      >
                        {siteLabel}
                      </a>
                    ) : (
                      <p className="mt-0.5 font-medium text-ink">—</p>
                    )}
                  </div>
                </li>
              </ul>
            </section>

            <section className="surface company-panel relative overflow-hidden p-5 md:p-6 lg:col-span-7">
              <div
                className="company-map-bg pointer-events-none absolute inset-0"
                aria-hidden
              />
              <div className="relative">
                <h2 className="text-base font-semibold text-ink">
                  Registered address
                </h2>
                <div className="mt-4 flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-mint" />
                  <div>
                    <p className="text-sm font-medium leading-relaxed text-ink">
                      {company.address || "No address on file."}
                    </p>
                    {company.provinces ? (
                      <p className="mt-2 text-xs text-muted">
                        {company.provinces}
                      </p>
                    ) : null}
                  </div>
                </div>
                {company.directors ? (
                  <div className="mt-6 border-t border-[var(--slack-border)] pt-4">
                    <p className="label-mono">Director</p>
                    <p className="mt-1.5 text-sm font-medium text-ink">
                      {company.directors}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="surface company-panel p-5 md:p-6 lg:col-span-12">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Bid capability lanes
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Intake keywords used for tender matching in Pipeline.
                  </p>
                </div>
                <Link
                  href="/settings"
                  className="text-xs font-semibold text-slack-blue hover:underline"
                >
                  Manage keywords
                </Link>
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {lanes.map((lane, i) => (
                  <li
                    key={lane.lane}
                    className="company-lane rounded-[var(--radius-lg)] border border-[var(--slack-border)] bg-[var(--slack-main-subtle)] p-4"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{
                          background:
                            LANE_ACCENTS[lane.lane] ?? LANE_ACCENTS.Other,
                        }}
                      />
                      <h3 className="text-sm font-semibold text-ink">
                        {lane.lane}
                      </h3>
                    </div>
                    <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted">
                      {lane.terms.slice(0, 5).join(" · ")}
                      {lane.terms.length > 5 ? "…" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}

        {tab === "services" ? (
          <div className="company-stagger mt-8">
            <header className="mb-5">
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                Five core service pillars
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                From off-grid power to predictive maintenance — sourced from the
                company profile and{" "}
                <a
                  href="https://www.maxattention.tech"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-slack-blue hover:underline"
                >
                  maxattention.tech
                </a>
                .
              </p>
            </header>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {COMPANY_PILLARS.map((pillar, i) => (
                <li
                  key={pillar.title}
                  className="company-lane surface p-5"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className="label-mono">0{i + 1}</span>
                  <h3 className="mt-2 text-base font-semibold text-ink">
                    {pillar.title}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-mint">
                    {pillar.summary}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {pillar.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === "products" ? (
          <div className="company-stagger mt-8 space-y-6">
            <header>
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                Connected solution suite
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                One company, one connected suite — from the field to the back
                office. Includes SolarWatch, Chain360 and Digitise It for the
                solar lifecycle.
              </p>
            </header>
            <div className="grid gap-4 lg:grid-cols-2">
              {COMPANY_PRODUCTS.map((group) => (
                <section key={group.group} className="surface p-5 md:p-6">
                  <h3 className="label-mono">{group.group}</h3>
                  <ul className="mt-4 space-y-3">
                    {group.items.map((item) => (
                      <li
                        key={item.name}
                        className="flex items-baseline justify-between gap-3 border-b border-[var(--slack-border)] pb-3 last:border-0 last:pb-0"
                      >
                        <span className="text-sm font-semibold text-ink">
                          {item.name}
                        </span>
                        <span className="text-right text-xs text-muted">
                          {item.blurb}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <aside className="surface border-mint/25 bg-[color-mix(in_srgb,var(--accent)_6%,white)] p-5 md:p-6">
              <p className="label-mono">Solar partnership stack</p>
              <p className="mt-2 text-sm leading-relaxed text-ink">
                Installation and smart poles, monitored by{" "}
                <strong>SolarWatch</strong>, managed with{" "}
                <strong>Chain360</strong>, documented in{" "}
                <strong>Digitise It</strong> — one partner across the full solar
                lifecycle.
              </p>
            </aside>
          </div>
        ) : null}

        {tab === "credentials" ? (
          <div className="company-stagger mt-8 grid gap-4 md:grid-cols-2">
            {(
              [
                ["name", "Legal name"],
                ["tradingAs", "Trading as"],
                ["regNo", "Registration no."],
                ["csdNo", "CSD number"],
                ["vatNo", "VAT number"],
                ["taxPin", "Tax PIN"],
                ["bbbeeLevel", "B-BBEE level"],
                ["foundedYear", "Founded"],
                ["directors", "Director"],
              ] as const
            ).map(([key, label]) => (
              <CopyChip key={key} label={label} value={company[key]} />
            ))}
            <div className="surface p-5 md:col-span-2">
              <div className="flex items-start gap-3">
                <Building2 size={18} className="mt-0.5 text-mint" />
                <div>
                  <p className="label-mono">For proposals & bid packs</p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                    Legal identity from the company profile deck (Reg{" "}
                    {company.regNo}). Add CSD, VAT, tax PIN and B-BBEE here as
                    they are confirmed for each submission window.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "banking" ? (
          <div className="company-stagger mt-8">
            <section className="surface p-5 md:p-6">
              <h2 className="text-base font-semibold text-ink">
                Banking details
              </h2>
              <p className="mt-1 text-sm text-muted">
                Used for appointment letters and supplier onboarding packs.
              </p>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["bankName", "Bank"],
                    ["accountName", "Account name"],
                    ["accountNumber", "Account number"],
                    ["branchCode", "Branch code"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <dt className="label-mono">{label}</dt>
                    <dd className="mt-1.5 font-mono text-sm font-semibold text-ink">
                      {company.bankDetails[key] || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                onClick={openEdit}
                className="btn btn-secondary mt-6"
              >
                <Pencil size={14} />
                Update banking
              </button>
            </section>
          </div>
        ) : null}

        {tab === "edit" ? (
          <form
            onSubmit={save}
            className="company-stagger mt-8 surface grid gap-4 p-5 md:grid-cols-2 md:p-6"
          >
            <div className="md:col-span-2 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">
                  Edit company profile
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Changes apply across bids, proposals, and compliance packs.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                className="btn btn-ghost"
                aria-label="Cancel edit"
              >
                <X size={16} />
              </button>
            </div>

            {(
              [
                ["name", "Legal name"],
                ["tradingAs", "Trading as"],
                ["regNo", "Registration no."],
                ["csdNo", "CSD number"],
                ["vatNo", "VAT number"],
                ["taxPin", "Tax PIN"],
                ["bbbeeLevel", "B-BBEE level"],
                ["foundedYear", "Founded year"],
                ["email", "Primary email"],
                ["phone", "Phone"],
                ["website", "Website"],
                ["provinces", "Provinces / coverage"],
                ["directors", "Director(s)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="label-mono">{label}</span>
                <input
                  value={draft[key]}
                  onChange={(e) => updateDraft(key, e.target.value)}
                  className="field mt-1.5"
                />
              </label>
            ))}

            <label className="block md:col-span-2">
              <span className="label-mono">Tagline</span>
              <input
                value={draft.tagline}
                onChange={(e) => updateDraft("tagline", e.target.value)}
                className="field mt-1.5"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="label-mono">About</span>
              <textarea
                value={draft.about}
                onChange={(e) => updateDraft("about", e.target.value)}
                rows={3}
                className="field mt-1.5 resize-y"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="label-mono">Vision</span>
              <textarea
                value={draft.vision}
                onChange={(e) => updateDraft("vision", e.target.value)}
                rows={3}
                className="field mt-1.5 resize-y"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="label-mono">Mission</span>
              <textarea
                value={draft.mission}
                onChange={(e) => updateDraft("mission", e.target.value)}
                rows={3}
                className="field mt-1.5 resize-y"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="label-mono">Registered address</span>
              <input
                value={draft.address}
                onChange={(e) => updateDraft("address", e.target.value)}
                className="field mt-1.5"
              />
            </label>

            <div className="md:col-span-2 mt-2 border-t border-[var(--slack-border)] pt-4">
              <h3 className="text-sm font-semibold text-ink">Banking</h3>
            </div>
            {(
              [
                ["bankName", "Bank"],
                ["accountName", "Account name"],
                ["accountNumber", "Account number"],
                ["branchCode", "Branch code"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="label-mono">{label}</span>
                <input
                  value={draft.bankDetails[key]}
                  onChange={(e) => updateBank(key, e.target.value)}
                  className="field mt-1.5"
                />
              </label>
            ))}

            <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="btn btn-primary disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save profile"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
