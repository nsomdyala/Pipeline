export const EVENT_KINDS = [
  "meeting",
  "briefing",
  "closing",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export type CalendarEvent = {
  id: string;
  kind: EventKind;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  agenda: string;
  linkedTo: string;
  attendees: string;
  createdAt: string;
};
