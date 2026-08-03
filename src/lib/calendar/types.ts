export const EVENT_KINDS = [
  "meeting",
  "briefing",
  "closing",
  "reminder",
  "deadline",
  "other",
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
  createdBy: string;
  allDay: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCalendarEventInput = {
  kind: EventKind;
  title: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  agenda?: string;
  linkedTo?: string;
  attendees?: string;
  createdBy?: string;
  allDay?: boolean;
};

export type UpdateCalendarEventInput = Partial<CreateCalendarEventInput>;
