"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { formatZaDate } from "@/lib/opportunities/dates";
import { EVENT_KINDS, type CalendarEvent, type EventKind } from "@/lib/calendar/types";

const kindLabel: Record<EventKind, string> = {
  meeting: "Meeting",
  briefing: "Briefing",
  closing: "Closing",
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
}

export function CalendarBoard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    kind: "meeting" as EventKind,
    title: "",
    startsAt: "",
    location: "",
    agenda: "",
    linkedTo: "",
    attendees: "Ndumiso Somdyala",
  });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void fetch("/api/calendar")
      .then((r) => r.json())
      .then((d: { events: CalendarEvent[] }) => setEvents(d.events));
  }, []);

  const upcoming = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 14);
    return events.filter((e) => new Date(e.startsAt) <= limit);
  }, [events]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return;
      setEvents((prev) =>
        [...prev, data.event].sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        ),
      );
      setOpen(false);
      setForm((f) => ({ ...f, title: "", startsAt: "", agenda: "", linkedTo: "" }));
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-2">Schedule</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
            Calendar
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Meetings, tender briefings and closing deadlines — auto-seeded from
            the opportunity pipeline.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy"
        >
          {open ? "Cancel" : "Book meeting"}
        </button>
      </header>

      {open ? (
        <form
          onSubmit={submit}
          className="mb-8 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:grid-cols-2"
        >
          <label>
            <span className="label-mono">Type</span>
            <select
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({ ...f, kind: e.target.value as EventKind }))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            >
              {EVENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {kindLabel[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-mono">Starts</span>
            <input
              required
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm"
            />
          </label>
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
            <span className="label-mono">Location / link</span>
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label>
            <span className="label-mono">Linked to</span>
            <input
              value={form.linkedTo}
              onChange={(e) => setForm((f) => ({ ...f, linkedTo: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="md:col-span-2">
            <span className="label-mono">Agenda</span>
            <textarea
              rows={2}
              value={form.agenda}
              onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy"
            >
              Save event
            </button>
          </div>
        </form>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">Next 14 days</h2>
        <ul className="space-y-3">
          {upcoming.map((event) => {
            const closing = event.kind === "closing";
            return (
              <li
                key={event.id}
                className="flex flex-col gap-2 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-navy/5 md:flex-row md:items-start md:justify-between"
              >
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[0.65rem] font-semibold ${
                        closing
                          ? "bg-coral/15 text-coral"
                          : "bg-mint/15 text-navy"
                      }`}
                    >
                      {kindLabel[event.kind]}
                    </span>
                    {event.linkedTo ? (
                      <span className="rounded-md bg-mist px-2 py-0.5 font-mono text-[0.65rem] text-muted">
                        {event.linkedTo}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1.5 font-semibold text-ink">{event.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {event.location || "No venue"}
                    {event.agenda ? ` · ${event.agenda}` : ""}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <div className={`font-mono text-sm font-semibold ${closing ? "text-coral" : "text-ink"}`}>
                    {formatZaDate(event.startsAt)}
                  </div>
                  <div className="font-mono text-xs text-muted">
                    {formatTime(event.startsAt)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
