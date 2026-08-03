import { randomUUID } from "node:crypto";
import { readJsonFile, writeJsonFile } from "@/lib/json-store";
import type { CalendarEvent, EventKind } from "@/lib/calendar/types";

const FILE = "calendar-events.json";

function atDay(base: Date, days: number, hour: number, minute = 0) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function seed(now = new Date()): CalendarEvent[] {
  const iso = now.toISOString();
  return [
    {
      id: "evt-saqa-briefing",
      kind: "briefing",
      title: "SAQA asset verification — compulsory briefing",
      startsAt: atDay(now, 1, 10),
      endsAt: atDay(now, 1, 11),
      location: "Virtual — MS Teams",
      agenda: "Scope walkthrough and returnables checklist.",
      linkedTo: "RFQ-SAQA-2026-041",
      attendees: "Ndumiso Somdyala",
      createdAt: iso,
    },
    {
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
    },
    {
      id: "evt-tih-standup",
      kind: "meeting",
      title: "The Innovation Hub — delivery standup",
      startsAt: atDay(now, 0, 9, 30),
      endsAt: atDay(now, 0, 10),
      location: "Google Meet",
      agenda: "Progress, blockers, docs still outstanding.",
      linkedTo: "Account · The Innovation Hub",
      attendees: "Ndumiso Somdyala, TIH PM",
      createdAt: iso,
    },
    {
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
    },
    {
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
    },
    {
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
    },
  ];
}

async function ensure() {
  const existing = await readJsonFile<CalendarEvent[]>(FILE, []);
  if (existing.length > 0) return existing;
  const seeded = seed();
  await writeJsonFile(FILE, seeded);
  return seeded;
}

export async function listEvents() {
  const events = await ensure();
  return events.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

export async function createEvent(input: {
  kind: EventKind;
  title: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  agenda?: string;
  linkedTo?: string;
  attendees?: string;
}) {
  const event: CalendarEvent = {
    id: randomUUID(),
    kind: input.kind,
    title: input.title.trim(),
    startsAt: new Date(input.startsAt).toISOString(),
    endsAt: input.endsAt
      ? new Date(input.endsAt).toISOString()
      : new Date(input.startsAt).toISOString(),
    location: input.location?.trim() ?? "",
    agenda: input.agenda?.trim() ?? "",
    linkedTo: input.linkedTo?.trim() ?? "",
    attendees: input.attendees?.trim() ?? "Ndumiso Somdyala",
    createdAt: new Date().toISOString(),
  };
  const events = await ensure();
  events.push(event);
  await writeJsonFile(FILE, events);
  return event;
}
