"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { formatZaDate } from "@/lib/opportunities/dates";
import {
  EVENT_KINDS,
  type CalendarEvent,
  type EventKind,
} from "@/lib/calendar/types";
import {
  isAutoClosingEvent,
  opportunityIdFromAutoClosing,
} from "@/lib/calendar/tender-closings";

const kindLabel: Record<EventKind, string> = {
  meeting: "Meeting",
  briefing: "Briefing",
  closing: "Closing",
  reminder: "Reminder",
  deadline: "Deadline",
  other: "Event",
};

const kindTone: Record<EventKind, string> = {
  meeting: "bg-mint/15 text-navy",
  briefing: "bg-sky-100 text-sky-900",
  closing: "bg-coral/15 text-coral",
  reminder: "bg-amber-100 text-amber-900",
  deadline: "bg-coral/15 text-coral",
  other: "bg-mist text-muted",
};

type FormState = {
  kind: EventKind;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  agenda: string;
  linkedTo: string;
  attendees: string;
  allDay: boolean;
  notifyTeam: boolean;
};

const emptyForm = (): FormState => ({
  kind: "meeting",
  title: "",
  startsAt: "",
  endsAt: "",
  location: "",
  agenda: "",
  linkedTo: "",
  attendees: "Ndumiso Somdyala, Bid Team Member",
  allDay: false,
  notifyTeam: true,
});

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function CalendarBoard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [kindFilter, setKindFilter] = useState<"all" | EventKind>("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void fetch("/api/calendar")
      .then((r) => r.json())
      .then((d: { events: CalendarEvent[] }) => setEvents(d.events));
    void fetch("/api/settings")
      .then((r) => r.json())
      .then((d: { users?: { name: string }[] }) => {
        setTeamNames((d.users ?? []).map((u) => u.name));
      })
      .catch(() => undefined);
  }, []);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-ZA", {
        month: "long",
        year: "numeric",
        timeZone: "Africa/Johannesburg",
      }).format(monthCursor),
    [monthCursor],
  );

  const calendarDays = useMemo(() => {
    const first = startOfMonth(monthCursor);
    const startPad = (first.getDay() + 6) % 7; // Monday-first
    const days: Date[] = [];
    for (let i = 0; i < startPad; i++) {
      const d = new Date(first);
      d.setDate(d.getDate() - (startPad - i));
      days.push(d);
    }
    const cursor = new Date(first);
    while (cursor.getMonth() === monthCursor.getMonth()) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    while (days.length % 7 !== 0) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [monthCursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      if (kindFilter !== "all" && event.kind !== kindFilter) continue;
      const key = dayKey(new Date(event.startsAt));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events, kindFilter]);

  const upcoming = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 14);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return events.filter((e) => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      const start = new Date(e.startsAt);
      return start >= now && start <= limit;
    });
  }, [events, kindFilter]);

  const selectedDayEvents = useMemo(() => {
    return (eventsByDay.get(dayKey(selectedDay)) ?? []).sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }, [eventsByDay, selectedDay]);

  function openCreate(forDay?: Date) {
    const day = forDay ?? selectedDay;
    const start = new Date(day);
    if (!forDay) start.setHours(9, 0, 0, 0);
    else start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);
    setEditingId(null);
    setForm({
      ...emptyForm(),
      startsAt: toLocalInput(start.toISOString()),
      endsAt: toLocalInput(end.toISOString()),
      attendees: teamNames.slice(0, 2).join(", ") || emptyForm().attendees,
    });
    setOpen(true);
    setError(null);
  }

  function openEdit(event: CalendarEvent) {
    setEditingId(event.id);
    setForm({
      kind: event.kind,
      title: event.title,
      startsAt: toLocalInput(event.startsAt),
      endsAt: toLocalInput(event.endsAt || event.startsAt),
      location: event.location,
      agenda: event.agenda,
      linkedTo: event.linkedTo,
      attendees: event.attendees,
      allDay: event.allDay,
      notifyTeam: false,
    });
    setOpen(true);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          kind: form.kind,
          title: form.title,
          startsAt: form.startsAt,
          endsAt: form.endsAt || form.startsAt,
          location: form.location,
          agenda: form.agenda,
          linkedTo: form.linkedTo,
          attendees: form.attendees,
          allDay: form.allDay,
          notifyTeam: form.notifyTeam,
        };
        const res = await fetch(
          editingId ? `/api/calendar/${editingId}` : "/api/calendar",
          {
            method: editingId ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not save event.");
        setEvents((prev) => {
          const next = editingId
            ? prev.map((ev) => (ev.id === editingId ? data.event : ev))
            : [...prev, data.event];
          return next.sort(
            (a, b) =>
              new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
          );
        });
        setOpen(false);
        setEditingId(null);
        setForm(emptyForm());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save event.");
      }
    });
  }

  function removeEvent(id: string) {
    if (!window.confirm("Remove this event from the team calendar?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/calendar/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (editingId === id) {
        setOpen(false);
        setEditingId(null);
      }
    });
  }

  function toggleAttendee(name: string) {
    const current = form.attendees
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = current.includes(name)
      ? current.filter((n) => n !== name)
      : [...current, name];
    setForm((f) => ({ ...f, attendees: next.join(", ") }));
  }

  const today = new Date();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-2">Schedule</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
            Calendar
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Team meetings, reminders and briefings — plus closing dates for
            tenders and RFQs in your selected All Tenders categories, synced
            automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openCreate()}
            className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy"
          >
            {open && !editingId ? "Cancel" : "Add event"}
          </button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setKindFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            kindFilter === "all" ? "bg-navy text-white" : "bg-white text-muted ring-1 ring-navy/10"
          }`}
        >
          All
        </button>
        {EVENT_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setKindFilter(kind)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              kindFilter === kind
                ? "bg-navy text-white"
                : "bg-white text-muted ring-1 ring-navy/10"
            }`}
          >
            {kindLabel[kind]}
          </button>
        ))}
      </div>

      {open ? (
        <form
          onSubmit={submit}
          className="mb-8 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5 md:grid-cols-2"
        >
          <div className="md:col-span-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">
              {editingId ? "Edit event" : "New team event"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEditingId(null);
              }}
              className="text-xs font-semibold text-muted"
            >
              Close
            </button>
          </div>
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
          <label className="flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) =>
                setForm((f) => ({ ...f, allDay: e.target.checked }))
              }
              className="size-4 rounded border-navy/20 text-mint"
            />
            <span className="text-sm text-ink">All-day</span>
          </label>
          <label>
            <span className="label-mono">Starts</span>
            <input
              required
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, startsAt: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm"
            />
          </label>
          <label>
            <span className="label-mono">Ends</span>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, endsAt: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 font-mono text-sm"
            />
          </label>
          <label className="md:col-span-2">
            <span className="label-mono">Title</span>
            <input
              required
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="e.g. Bid review standup / Reminder to lodge SAQA"
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label>
            <span className="label-mono">Location / link</span>
            <input
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              placeholder="Google Meet, office, site…"
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label>
            <span className="label-mono">Linked to</span>
            <input
              value={form.linkedTo}
              onChange={(e) =>
                setForm((f) => ({ ...f, linkedTo: e.target.value }))
              }
              placeholder="RFQ / account / opportunity"
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="md:col-span-2">
            <span className="label-mono">Notes / agenda</span>
            <textarea
              rows={2}
              value={form.agenda}
              onChange={(e) =>
                setForm((f) => ({ ...f, agenda: e.target.value }))
              }
              className="mt-1.5 w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </label>
          <div className="md:col-span-2">
            <p className="label-mono mb-2">Team attendees</p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {teamNames.map((name) => {
                const on = form.attendees
                  .split(",")
                  .map((s) => s.trim())
                  .includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleAttendee(name)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      on
                        ? "bg-mint/20 text-navy ring-1 ring-mint/40"
                        : "bg-mist text-muted"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <input
              value={form.attendees}
              onChange={(e) =>
                setForm((f) => ({ ...f, attendees: e.target.value }))
              }
              placeholder="Comma-separated names"
              className="w-full rounded-xl border border-navy/10 bg-mist/40 px-3 py-2.5 text-sm"
            />
          </div>
          {!editingId ? (
            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                checked={form.notifyTeam}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notifyTeam: e.target.checked }))
                }
                className="size-4 rounded border-navy/20 text-mint"
              />
              <span className="text-sm text-ink">
                Post to #general so the team sees it
              </span>
            </label>
          ) : null}
          {error ? (
            <p className="md:col-span-2 text-sm font-semibold text-coral">
              {error}
            </p>
          ) : null}
          <div className="md:col-span-2 flex justify-end gap-2">
            {editingId ? (
              <button
                type="button"
                onClick={() => removeEvent(editingId)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-coral"
              >
                Delete
              </button>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
            >
              {pending ? "Saving…" : editingId ? "Update event" : "Save event"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mb-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-navy/5 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                setMonthCursor(
                  new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1),
                )
              }
              className="rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:bg-mist"
            >
              ←
            </button>
            <h2 className="text-base font-semibold text-ink">{monthLabel}</h2>
            <button
              type="button"
              onClick={() =>
                setMonthCursor(
                  new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1),
                )
              }
              className="rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:bg-mist"
            >
              →
            </button>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const inMonth = day.getMonth() === monthCursor.getMonth();
              const selected = sameDay(day, selectedDay);
              const isToday = sameDay(day, today);
              const dayEvents = eventsByDay.get(dayKey(day)) ?? [];
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  onDoubleClick={() => openCreate(day)}
                  className={`min-h-[4.5rem] rounded-xl border p-1.5 text-left transition ${
                    selected
                      ? "border-mint bg-mint/10"
                      : "border-transparent bg-mist/40 hover:border-navy/10"
                  } ${inMonth ? "" : "opacity-40"}`}
                >
                  <div
                    className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday
                        ? "bg-navy text-white"
                        : selected
                          ? "text-navy"
                          : "text-muted"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className={`truncate rounded px-1 py-0.5 text-[0.6rem] font-semibold ${kindTone[ev.kind]}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 ? (
                      <div className="text-[0.6rem] text-muted">
                        +{dayEvents.length - 3} more
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">
            Click a day to view · double-click to add an event
          </p>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">
              {formatZaDate(selectedDay.toISOString())}
            </h2>
            <button
              type="button"
              onClick={() => openCreate(selectedDay)}
              className="text-xs font-semibold text-mint hover:underline"
            >
              Add on this day
            </button>
          </div>
          {selectedDayEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-navy/15 bg-white px-5 py-10 text-center text-sm text-muted">
              Nothing booked — add a meeting or reminder for the team.
            </div>
          ) : (
            <ul className="space-y-3">
              {selectedDayEvents.map((event) => (
                <li
                  key={event.id}
                  className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-navy/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[0.65rem] font-semibold ${kindTone[event.kind]}`}
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
                    {event.allDay
                      ? "All day"
                      : formatTime(event.startsAt)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                  {event.attendees ? (
                    <p className="mt-1 text-xs text-muted">
                      With {event.attendees}
                    </p>
                  ) : null}
                  {event.agenda ? (
                    <p className="mt-1 text-sm text-ink/80">{event.agenda}</p>
                  ) : null}
                  <div className="mt-3 flex gap-3">
                    {isAutoClosingEvent(event) ? (
                      (() => {
                        const oppId = opportunityIdFromAutoClosing(event.id);
                        return oppId ? (
                          <Link
                            href={`/tenders/${oppId}`}
                            className="text-xs font-semibold text-mint hover:underline"
                          >
                            Open tender
                          </Link>
                        ) : (
                          <span className="text-xs text-muted">
                            Synced from All Tenders
                          </span>
                        );
                      })()
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(event)}
                          className="text-xs font-semibold text-navy hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEvent(event.id)}
                          className="text-xs font-semibold text-coral hover:underline"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Next 14 days</h2>
        <ul className="space-y-3">
          {upcoming.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-navy/15 bg-white px-5 py-10 text-center text-sm text-muted">
              No upcoming events in the next two weeks.
            </li>
          ) : (
            upcoming.map((event) => {
              const hot =
                event.kind === "closing" || event.kind === "deadline";
              return (
                <li
                  key={event.id}
                  className="flex flex-col gap-2 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-navy/5 md:flex-row md:items-start md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[0.65rem] font-semibold ${kindTone[event.kind]}`}
                      >
                        {kindLabel[event.kind]}
                      </span>
                      {event.linkedTo ? (
                        <span className="rounded-md bg-mist px-2 py-0.5 font-mono text-[0.65rem] text-muted">
                          {event.linkedTo}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1.5 font-semibold text-ink">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {event.location || "No venue"}
                      {event.agenda ? ` · ${event.agenda}` : ""}
                    </p>
                    {event.attendees ? (
                      <p className="mt-1 text-xs text-muted">
                        {event.attendees}
                      </p>
                    ) : null}
                    {isAutoClosingEvent(event) ? (
                      (() => {
                        const oppId = opportunityIdFromAutoClosing(event.id);
                        return oppId ? (
                          <Link
                            href={`/tenders/${oppId}`}
                            className="mt-2 inline-block text-xs font-semibold text-mint hover:underline"
                          >
                            Open tender
                          </Link>
                        ) : (
                          <span className="mt-2 inline-block text-xs text-muted">
                            Synced from All Tenders
                          </span>
                        );
                      })()
                    ) : (
                      <button
                        type="button"
                        onClick={() => openEdit(event)}
                        className="mt-2 text-xs font-semibold text-mint hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <div className="text-left md:text-right">
                    <div
                      className={`font-mono text-sm font-semibold ${
                        hot ? "text-coral" : "text-ink"
                      }`}
                    >
                      {formatZaDate(event.startsAt)}
                    </div>
                    <div className="font-mono text-xs text-muted">
                      {event.allDay ? "All day" : formatTime(event.startsAt)}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
