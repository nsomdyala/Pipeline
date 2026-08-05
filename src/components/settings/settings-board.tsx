"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ArrowUpRight } from "lucide-react";
import { ProfileAvatarCard } from "@/components/settings/profile-avatar-card";
import { UsersPermissionsBoard } from "@/components/settings/users-permissions-board";
import { OPP_LANES, type OppLane } from "@/lib/opportunities/types";
import {
  type CompanyProfile,
  type PortalWatchItem,
  type SettingsBundle,
} from "@/lib/settings/types";

type CategoryRow = {
  etendersCategory: string;
  lane: Exclude<OppLane, "Other">;
};

export function SettingsBoard() {
  const [settings, setSettings] = useState<SettingsBundle | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([]);
  const [categorySaved, setCategorySaved] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/me").then((r) => r.json()),
    ]).then(([settingsData, meData]) => {
      if (settingsData?.company) {
        setSettings(settingsData);
        setCompany(settingsData.company);
        setCategoryRows(
          (settingsData.categoryLaneMap ?? []).map(
            (row: CategoryRow) => ({
              etendersCategory: row.etendersCategory,
              lane: row.lane,
            }),
          ),
        );
      }
      setIsAdmin(meData?.user?.role === "admin");
    });
  }, []);

  function saveCategories(e: React.FormEvent) {
    e.preventDefault();
    setCategoryError(null);
    startTransition(async () => {
      const res = await fetch("/api/settings/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryLaneMap: categoryRows,
          defaultEtendersCategories: categoryRows.map((r) => r.etendersCategory),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCategoryError(data.error ?? "Could not save categories.");
        return;
      }
      setSettings(data);
      setCategorySaved(true);
      window.setTimeout(() => setCategorySaved(false), 2000);
    });
  }

  if (!settings || !company) {
    return (
      <div className="px-6 py-16 text-center text-sm text-muted">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8">
        <p className="label-mono mb-2">Company</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
          Settings
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          {isAdmin
            ? "Manage your profile, team users & permissions, intake keywords, and portal watchlist."
            : "Manage your profile and preferences."}
        </p>
      </header>

      <ProfileAvatarCard />

      <Link
        href="/company"
        className="mb-8 flex items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 transition hover:ring-mint/30 md:p-6"
      >
        <div>
          <p className="label-mono mb-1">Company</p>
          <h2 className="text-base font-semibold text-ink">{company.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {company.bbbeeLevel || "B-BBEE not set"}
            {company.csdNo ? ` · CSD ${company.csdNo}` : ""}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slack-blue">
          Open profile
          <ArrowUpRight size={16} />
        </span>
      </Link>

      {isAdmin ? <UsersPermissionsBoard /> : null}

      {isAdmin ? (
        <>
          <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:p-6">
            <h2 className="text-base font-semibold text-ink">Lane keywords</h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {settings.keywords.map((row) => (
                <li key={row.lane} className="rounded-xl bg-mist/50 px-4 py-3">
                  <p className="text-sm font-semibold text-ink">{row.lane}</p>
                  <p className="mt-1 text-xs text-muted">
                    {row.terms.join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <form
            onSubmit={saveCategories}
            className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:p-6"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">
                  eTenders category → lane map
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Official `tender.category` labels that feed the Opportunities
                  board defaults. Add rows here — no code change needed.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {categorySaved ? (
                  <span className="text-xs font-semibold text-mint">Saved</span>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    setCategoryRows((rows) => [
                      ...rows,
                      {
                        etendersCategory: "",
                        lane: "ICT / IS",
                      },
                    ])
                  }
                  className="rounded-xl border border-navy/10 px-3 py-2 text-xs font-semibold text-navy"
                >
                  Add category
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-mint px-3 py-2 text-xs font-semibold disabled:opacity-60 text-white"
                >
                  Save map
                </button>
              </div>
            </div>
            {categoryError ? (
              <p className="mt-3 text-sm font-semibold text-coral" role="alert">
                {categoryError}
              </p>
            ) : null}
            <ul className="mt-4 space-y-2">
              {categoryRows.map((row, index) => (
                <li
                  key={`${row.etendersCategory}-${index}`}
                  className="grid gap-2 md:grid-cols-[1fr_12rem_auto]"
                >
                  <input
                    value={row.etendersCategory}
                    onChange={(e) =>
                      setCategoryRows((rows) =>
                        rows.map((r, i) =>
                          i === index
                            ? { ...r, etendersCategory: e.target.value }
                            : r,
                        ),
                      )
                    }
                    placeholder="eTenders category label"
                    className="rounded-xl border border-navy/10 bg-mist/40 px-3 py-2 text-sm"
                  />
                  <select
                    value={row.lane}
                    onChange={(e) =>
                      setCategoryRows((rows) =>
                        rows.map((r, i) =>
                          i === index
                            ? {
                                ...r,
                                lane: e.target.value as Exclude<
                                  OppLane,
                                  "Other"
                                >,
                              }
                            : r,
                        ),
                      )
                    }
                    className="rounded-xl border border-navy/10 bg-mist/40 px-3 py-2 text-sm"
                  >
                    {OPP_LANES.filter((l) => l !== "Other").map((lane) => (
                      <option key={lane} value={lane}>
                        {lane}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryRows((rows) =>
                        rows.filter((_, i) => i !== index),
                      )
                    }
                    className="text-xs font-semibold text-coral"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </form>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:p-6">
            <h2 className="text-base font-semibold text-ink">
              Supplier portal watchlist
            </h2>
            <ul className="mt-4 space-y-3">
              {settings.portals.map((portal: PortalWatchItem) => (
                <li key={portal.id}>
                  <p className="text-sm font-semibold text-ink">
                    {portal.companyName}
                  </p>
                  <p className="text-xs text-muted">
                    {portal.industry} · {portal.registrationStatus}
                  </p>
                  <a
                    href={portal.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-mint hover:underline"
                  >
                    {portal.portalUrl}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
