import Link from "next/link";
import { AppShell } from "@/components/app-shell";

const demoCards = [
  {
    ref: "RFQ-SAQA-2026-041",
    title: "Asset verification system refresh",
    buyer: "SAQA",
    lane: "Asset management",
    sector: "Public",
    source: "eTenders",
    closing: "05 Aug 2026",
    daysLeft: 2,
    stage: "Reviewing",
  },
  {
    ref: "RFQ-GEP-2026-118",
    title: "Website migration and maintenance",
    buyer: "GEP",
    lane: "Website",
    sector: "Public",
    source: "eTenders",
    closing: "12 Aug 2026",
    daysLeft: 7,
    stage: "Drafting",
  },
  {
    ref: "RFQ-SITA-2607-09",
    title: "ICT software licence and support",
    buyer: "SITA",
    lane: "ICT / IS",
    sector: "Public",
    source: "SITA",
    closing: "18 Aug 2026",
    daysLeft: 11,
    stage: "Spotted",
  },
];

const stats = [
  { label: "Open opportunities", value: "3", hint: "My work" },
  { label: "Closing < 3 days", value: "1", hint: "At risk", coral: true },
  { label: "Submitted value", value: "R 0", hint: "This month" },
  { label: "Win rate", value: "—", hint: "No awards yet" },
];

export default function HomePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-mono mb-2">Dashboard</p>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink md:text-3xl">
              My work
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Your opportunities, deadlines and progress. Admin can switch to the
              full team view once auth is wired in M1.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white p-1 shadow-sm ring-1 ring-navy/5">
            <span className="rounded-full bg-mint px-3 py-1.5 text-xs font-semibold text-navy">
              My work
            </span>
            <span className="px-3 py-1.5 text-xs font-semibold text-muted">
              Team
            </span>
          </div>
        </header>

        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-navy/5"
            >
              <div className="label-mono">{stat.label}</div>
              <div
                className={`mt-2 font-mono text-2xl font-semibold tracking-tight ${
                  stat.coral ? "text-coral" : "text-ink"
                }`}
              >
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-muted">{stat.hint}</div>
            </div>
          ))}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">
              Closing soon
            </h2>
            <Link
              href="/opportunities"
              className="text-sm font-semibold text-mint hover:underline"
            >
              Open board
            </Link>
          </div>

          <ul className="space-y-3">
            {demoCards.map((card) => {
              const atRisk = card.daysLeft < 3;
              return (
                <li
                  key={card.ref}
                  className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-navy/5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted">
                          {card.ref}
                        </span>
                        <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                          {card.sector}
                        </span>
                        <span className="rounded-md bg-mist px-2 py-0.5 text-[0.65rem] font-semibold text-muted">
                          {card.source}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-base font-semibold tracking-[-0.02em] text-ink">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {card.buyer} · {card.lane} · {card.stage}
                      </p>
                    </div>
                    <div className="shrink-0 text-left md:text-right">
                      <div className="label-mono">Closing</div>
                      <div
                        className={`mt-1 font-mono text-sm font-semibold ${
                          atRisk ? "text-coral" : "text-ink"
                        }`}
                      >
                        {card.closing}
                      </div>
                      <div
                        className={`mt-0.5 text-xs font-semibold ${
                          atRisk ? "text-coral" : "text-muted"
                        }`}
                      >
                        {card.daysLeft} working{" "}
                        {card.daysLeft === 1 ? "day" : "days"} left
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="mt-10 text-center text-xs text-muted">
          Preview shell — auth, boards and intake land in M1–M3. Plan:{" "}
          <code className="font-mono">docs/plan.md</code>
        </p>
      </div>
    </AppShell>
  );
}
