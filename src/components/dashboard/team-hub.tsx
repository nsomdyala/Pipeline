"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  formatZaDate,
  formatZar,
  workingDaysUntil,
} from "@/lib/opportunities/dates";
import type { Opportunity, OppLane, OppStage } from "@/lib/opportunities/types";
import type { Lead } from "@/lib/leads/types";
import type { StrategicPartner } from "@/lib/partners/types";
import type { CalendarEvent } from "@/lib/calendar/types";

const PIPELINE_STAGES: OppStage[] = [
  "Spotted",
  "Reviewing",
  "Bid/No-Bid",
  "Drafting",
  "Submitted",
  "Awarded",
];

const LANE_COLORS: Record<string, string> = {
  "ICT / IS": "bg-mint",
  Website: "bg-sky-400",
  "Asset management": "bg-amber-400",
  "Solar / electrical": "bg-emerald-500",
  Other: "bg-navy/30",
};

export function TeamHub({ userName }: { userName: string }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [partners, setPartners] = useState<StrategicPartner[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [oppRes, leadRes, partnerRes, calRes] = await Promise.all([
          fetch("/api/opportunities?scope=pipeline"),
          fetch("/api/leads"),
          fetch("/api/partners"),
          fetch("/api/calendar"),
        ]);
        const opps = (await oppRes.json()) as { opportunities: Opportunity[] };
        const leadData = (await leadRes.json()) as { leads: Lead[] };
        const parts = (await partnerRes.json()) as {
          partners: StrategicPartner[];
        };
        const cal = (await calRes.json()) as { events: CalendarEvent[] };
        if (!cancelled) {
          setOpportunities(opps.opportunities ?? []);
          setLeads(leadData.leads ?? []);
          setPartners(parts.partners ?? []);
          setEvents(cal.events ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const open = opportunities.filter(
      (o) => !o.stage.startsWith("Closed") && o.stage !== "Active account",
    );
    const bidLeads = leads.filter(
      (l) => l.source === "submitted_bid" && l.status !== "lost",
    );
    const submissions = opportunities.filter((o) => o.stage === "Submitted");
    const awarded = opportunities.filter(
      (o) => o.stage === "Awarded" || o.stage === "Closed (Won)",
    );
    const atRisk = open.filter((o) => workingDaysUntil(o.closingAt) < 3);
    const panels = open.filter((o) => o.isPanel);
    const pipelineValue = open.reduce(
      (sum, o) => sum + (o.estimatedValueZar ?? 0),
      0,
    );
    const submittedValue =
      submissions.reduce((sum, o) => sum + (o.estimatedValueZar ?? 0), 0) ||
      null;
    const byStage = PIPELINE_STAGES.map((stage) => ({
      stage,
      count: opportunities.filter((o) => o.stage === stage).length,
    }));
    const byLane = (
      ["ICT / IS", "Website", "Asset management", "Solar / electrical"] as OppLane[]
    ).map((lane) => ({
      lane,
      count: open.filter((o) => o.lane === lane).length,
    }));
    const letterPartners = partners.filter((p) => p.providesPartnerLetter);
    const letterExpiring = letterPartners.filter((p) => {
      if (!p.letterExpiresAt) return false;
      const days = workingDaysUntil(p.letterExpiresAt);
      return days >= 0 && days <= 60;
    });
    const upcoming = events
      .filter((e) => new Date(e.startsAt).getTime() >= Date.now() - 3600_000)
      .slice(0, 4);

    return {
      open: open.length,
      submissions,
      bidLeads,
      submissionCount: Math.max(submissions.length, bidLeads.length),
      awarded: awarded.length,
      atRisk: atRisk.length,
      panels: panels.length,
      pipelineValue,
      submittedValue,
      byStage,
      byLane,
      letterPartners,
      letterExpiring,
      upcoming,
      owners: new Set(open.map((o) => o.ownerName)).size,
    };
  }, [opportunities, leads, partners, events]);

  const maxStage = Math.max(1, ...stats.byStage.map((s) => s.count));
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8">
        <p className="label-mono mb-2">Team hub</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
          {greeting}, {userName.split(" ")[0]}.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Live view of submissions, pipeline heat, partner letters and what the
          team is chasing this week.
        </p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Open pipeline",
            value: loading ? "…" : String(stats.open),
            hint: `${stats.owners} owners · ${stats.panels} panels`,
          },
          {
            label: "Submissions out",
            value: loading ? "…" : String(stats.submissionCount),
            hint:
              stats.bidLeads.length > 0
                ? `${stats.bidLeads.length} in Leads`
                : formatZar(stats.submittedValue),
            accent: "text-mint",
          },
          {
            label: "Pipeline value",
            value: loading ? "…" : formatZar(stats.pipelineValue || null),
            hint: "Open opportunities",
          },
          {
            label: "Closing < 3 days",
            value: loading ? "…" : String(stats.atRisk),
            hint: "At risk",
            accent: stats.atRisk > 0 ? "text-coral" : undefined,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-navy/5"
          >
            <div className="label-mono">{card.label}</div>
            <div
              className={`mt-2 font-mono text-2xl font-semibold tracking-tight ${card.accent ?? "text-ink"}`}
            >
              {card.value}
            </div>
            <div className="mt-1 text-xs text-muted">{card.hint}</div>
          </div>
        ))}
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Stage funnel</h2>
            <Link
              href="/opportunities"
              className="text-xs font-semibold text-mint hover:underline"
            >
              Open board
            </Link>
          </div>
          <ul className="space-y-2.5">
            {stats.byStage.map((row) => (
              <li key={row.stage} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs font-semibold text-muted">
                  {row.stage}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-mist">
                  <div
                    className={`h-full rounded-full ${row.stage === "Submitted" ? "bg-mint" : "bg-navy/70"}`}
                    style={{
                      width: `${Math.max(row.count ? 8 : 0, (row.count / maxStage) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-6 text-right font-mono text-xs font-semibold text-ink">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
          <h2 className="mb-4 text-lg font-semibold text-ink">Lane mix</h2>
          <ul className="space-y-3">
            {stats.byLane.map((row) => (
              <li key={row.lane}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold text-ink">{row.lane}</span>
                  <span className="font-mono text-muted">{row.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-mist">
                  <div
                    className={`h-full rounded-full ${LANE_COLORS[row.lane] ?? "bg-navy/40"}`}
                    style={{
                      width: `${stats.open ? (row.count / stats.open) * 100 : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Submissions</h2>
            <p className="text-sm text-muted">
              Bids with quotation or pricing uploaded — living in Leads until
              appointed
            </p>
          </div>
          <Link
            href="/leads"
            className="font-mono text-xs font-semibold text-mint hover:underline"
          >
            {stats.bidLeads.length} in Leads
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : stats.bidLeads.length === 0 && stats.submissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy/15 bg-white px-6 py-12 text-center text-sm text-muted">
            No submissions yet — on Opportunities, upload a quotation or pricing
            to move a bid into Leads.
          </div>
        ) : (
          <ul className="space-y-3">
            {stats.bidLeads.map((lead) => (
              <li
                key={lead.id}
                className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-mint/25"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md bg-mint/15 px-2 py-0.5 text-[0.65rem] font-semibold text-ink">
                        {lead.accountId ? "Appointed" : "Submitted"}
                      </span>
                      {lead.refNo ? (
                        <span className="rounded-md bg-mist px-2 py-0.5 font-mono text-[0.65rem] text-muted">
                          {lead.refNo}
                        </span>
                      ) : null}
                      {lead.submissionKind ? (
                        <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold capitalize text-muted">
                          {lead.submissionKind}
                        </span>
                      ) : null}
                      <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                        {lead.lane}
                      </span>
                    </div>
                    <h3 className="mt-1.5 font-semibold text-ink">
                      {lead.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {lead.company} · {lead.ownerName}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <Link
                      href={lead.accountId ? "/accounts" : "/leads"}
                      className="text-xs font-semibold text-mint hover:underline"
                    >
                      {lead.accountId ? "Open account" : "Open in Leads"}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-ink p-5 text-white shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Partner letters</h2>
            <Link
              href="/partners"
              className="text-xs font-semibold text-mint hover:underline"
            >
              Manage partners
            </Link>
          </div>
          <p className="mb-4 text-sm text-white/65">
            AWS, Sage, Microsoft and others we call on for OEM / partner letters.
          </p>
          <ul className="space-y-2">
            {stats.letterPartners.slice(0, 5).map((p) => {
              const expiring = stats.letterExpiring.some((x) => x.id === p.id);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-xs text-white/50">
                      {p.letterType || "Partner letter"}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold ${expiring ? "text-coral" : "text-mint"}`}
                  >
                    {p.letterExpiresAt
                      ? expiring
                        ? `Expires ${formatZaDate(p.letterExpiresAt)}`
                        : "Active"
                      : p.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Coming up</h2>
            <Link
              href="/calendar"
              className="text-xs font-semibold text-mint hover:underline"
            >
              Calendar
            </Link>
          </div>
          {stats.upcoming.length === 0 ? (
            <p className="text-sm text-muted">No upcoming calendar items.</p>
          ) : (
            <ul className="space-y-3">
              {stats.upcoming.map((event) => (
                <li key={event.id}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {event.kind}
                  </div>
                  <div className="font-semibold text-ink">{event.title}</div>
                  <div className="font-mono text-xs text-muted">
                    {formatZaDate(event.startsAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {[
          { href: "/opportunities", label: "Opportunities" },
          { href: "/tenders", label: "All Tenders" },
          { href: "/partners", label: "Strategic partners" },
          { href: "/calendar", label: "Calendar" },
          { href: "/chat", label: "Live chat" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-navy shadow-sm ring-1 ring-navy/10 hover:bg-mint/15"
          >
            {link.label}
          </Link>
        ))}
      </section>
    </div>
  );
}
