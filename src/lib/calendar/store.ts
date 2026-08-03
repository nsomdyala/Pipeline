import { randomUUID } from "node:crypto";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import type {
  CalendarEvent,
  CreateCalendarEventInput,
  EventKind,
  UpdateCalendarEventInput,
} from "@/lib/calendar/types";
import { EVENT_KINDS } from "@/lib/calendar/types";

const FILE = "calendar-events.json";

function atDay(base: Date, days: number, hour: number, minute = 0) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function withDefaults(
  event: Partial<CalendarEvent> &
    Pick<
      CalendarEvent,
      "id" | "kind" | "title" | "startsAt" | "createdAt"
    >,
): CalendarEvent {
  return {
    endsAt: event.endsAt ?? event.startsAt,
    location: event.location ?? "",
    agenda: event.agenda ?? "",
    linkedTo: event.linkedTo ?? "",
    attendees: event.attendees ?? "",
    createdBy: event.createdBy ?? "Ndumiso Somdyala",
    allDay: event.allDay ?? false,
    updatedAt: event.updatedAt ?? event.createdAt,
    ...event,
    kind: EVENT_KINDS.includes(event.kind as EventKind)
      ? event.kind
      : "meeting",
  };
}

function seed(now = new Date()): CalendarEvent[] {
  const iso = now.toISOString();
  return [
    withDefaults({
      id: "evt-tih-standup",
      kind: "meeting",
      title: "The Innovation Hub — delivery standup",
      startsAt: atDay(now, 0, 9, 30),
      endsAt: atDay(now, 0, 10),
      location: "Google Meet",
      agenda: "Progress, blockers, docs still outstanding.",
      linkedTo: "Account · The Innovation Hub",
      attendees: "Ndumiso Somdyala, Bid Team Member",
      createdBy: "Ndumiso Somdyala",
      createdAt: iso,
    }),
    withDefaults({
      id: "evt-saqa-briefing",
      kind: "briefing",
      title: "SAQA asset verification — compulsory briefing",
      startsAt: atDay(now, 1, 10),
      endsAt: atDay(now, 1, 11),
      location: "Virtual — MS Teams",
      agenda: "Scope walkthrough and returnables checklist.",
      linkedTo: "RFQ-SAQA-2026-041",
      attendees: "Ndumiso Somdyala, Bid Team Member",
      createdAt: iso,
    }),
    withDefaults({
      id: "evt-reminder-bid",
      kind: "reminder",
      title: "Reminder — confirm bid/no-bid on SAQA",
      startsAt: atDay(now, 1, 15),
      endsAt: atDay(now, 1, 15),
      location: "",
      agenda: "Team decision before drafting starts.",
      linkedTo: "RFQ-SAQA-2026-041",
      attendees: "Bid team",
      createdAt: iso,
    }),
    withDefaults({
      id: "evt-saqa-close",
      kind: "closing",
      title: "Closing — SAQA asset verification RFQ",
      startsAt: atDay(now, 2, 11),
      endsAt: atDay(now, 2, 11),
      location: "eTenders",
      agenda: "Submission deadline.",
      linkedTo: "RFQ-SAQA-2026-041",
      attendees: "Bid team",
      createdAt: iso,
    }),
    withDefaults({
      id: "evt-sita-briefing",
      kind: "briefing",
      title: "SITA ICT RFQ briefing",
      startsAt: atDay(now, 5, 9),
      endsAt: atDay(now, 5, 10),
      location: "SITA Erasmuskloof",
      agenda: "Optional briefing for RFQ-SITA-2607-09.",
      linkedTo: "RFQ-SITA-2607-09",
      attendees: "Bid team",
      createdAt: iso,
    }),
    withDefaults({
      id: "evt-eskom-briefing",
      kind: "briefing",
      title: "Eskom solar PV — compulsory site briefing",
      startsAt: atDay(now, 6, 10),
      endsAt: atDay(now, 6, 12),
      location: "Megawatt Park, Sandton",
      agenda: "Depot walk-through for solar/electrical scope.",
      linkedTo: "MWP2484CX",
      attendees: "Ndumiso Somdyala",
      createdAt: iso,
    }),
    withDefaults({
      id: "evt-gep-close",
      kind: "closing",
      title: "Closing — GEP website migration RFQ",
      startsAt: atDay(now, 7, 16),
      endsAt: atDay(now, 7, 16),
      location: "eTenders",
      agenda: "Submission deadline.",
      linkedTo: "RFQ-GEP-2026-118",
      attendees: "Bid team",
      createdAt: iso,
    }),
  ];
}

async function ensure() {
  const existing = await readJsonFile<CalendarEvent[]>(FILE, []);
  if (existing.length > 0) {
    return existing.map((e) => withDefaults(e));
  }
  const seeded = seed();
  await writeJsonFile(FILE, seeded);
  return seeded;
}

async function save(events: CalendarEvent[]) {
  await writeJsonFile(FILE, events);
}

export async function listEvents() {
  const events = await ensure();
  return events.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

export async function getEvent(id: string) {
  const events = await ensure();
  return events.find((e) => e.id === id) ?? null;
}

export async function createEvent(input: CreateCalendarEventInput) {
  const now = new Date().toISOString();
  const startsAt = new Date(input.startsAt).toISOString();
  const event = withDefaults({
    id: randomUUID(),
    kind: input.kind,
    title: input.title.trim(),
    startsAt,
    endsAt: input.endsAt ? new Date(input.endsAt).toISOString() : startsAt,
    location: input.location?.trim() ?? "",
    agenda: input.agenda?.trim() ?? "",
    linkedTo: input.linkedTo?.trim() ?? "",
    attendees: input.attendees?.trim() ?? "",
    createdBy: input.createdBy?.trim() || "Ndumiso Somdyala",
    allDay: Boolean(input.allDay),
    createdAt: now,
    updatedAt: now,
  });
  const events = await ensure();
  events.push(event);
  await save(events);
  return event;
}

export async function updateEvent(id: string, input: UpdateCalendarEventInput) {
  const events = await ensure();
  const index = events.findIndex((e) => e.id === id);
  if (index < 0) return null;
  const prev = withDefaults(events[index]);
  const next = withDefaults({
    ...prev,
    kind: input.kind ?? prev.kind,
    title: input.title?.trim() ?? prev.title,
    startsAt: input.startsAt
      ? new Date(input.startsAt).toISOString()
      : prev.startsAt,
    endsAt: input.endsAt
      ? new Date(input.endsAt).toISOString()
      : prev.endsAt,
    location:
      input.location !== undefined ? input.location.trim() : prev.location,
    agenda: input.agenda !== undefined ? input.agenda.trim() : prev.agenda,
    linkedTo:
      input.linkedTo !== undefined ? input.linkedTo.trim() : prev.linkedTo,
    attendees:
      input.attendees !== undefined ? input.attendees.trim() : prev.attendees,
    createdBy:
      input.createdBy !== undefined ? input.createdBy.trim() : prev.createdBy,
    allDay: input.allDay ?? prev.allDay,
    updatedAt: new Date().toISOString(),
  });
  events[index] = next;
  await save(events);
  return next;
}

export async function deleteEvent(id: string) {
  const events = await ensure();
  const next = events.filter((e) => e.id !== id);
  if (next.length === events.length) return false;
  await save(next);
  return true;
}
