import type { CalendarEvent } from "@/lib/calendar/types";

/** Stable id prefix for closings synced from All Tenders defaults. */
export const AUTO_CLOSING_PREFIX = "auto-closing-";

export function isAutoClosingEvent(
  event: Pick<CalendarEvent, "id" | "createdBy">,
) {
  return (
    event.id.startsWith(AUTO_CLOSING_PREFIX) ||
    event.createdBy === "Pipeline · intake"
  );
}

export function opportunityIdFromAutoClosing(eventId: string): string | null {
  if (!eventId.startsWith(AUTO_CLOSING_PREFIX)) return null;
  return eventId.slice(AUTO_CLOSING_PREFIX.length) || null;
}
