import { defaultEtendersCategories } from "@/lib/intake/config/etenders-categories";
import type { CalendarEvent } from "@/lib/calendar/types";
import { deriveTenderStatus } from "@/lib/opportunities/search";
import { listOpportunities } from "@/lib/opportunities/store";
import type { Opportunity } from "@/lib/opportunities/types";

export const AUTO_CLOSING_PREFIX = "auto-closing-";

export function isAutoClosingEvent(event: Pick<CalendarEvent, "id" | "createdBy">) {
  return (
    event.id.startsWith(AUTO_CLOSING_PREFIX) ||
    event.createdBy === "Pipeline · intake"
  );
}

export function opportunityIdFromAutoClosing(eventId: string): string | null {
  if (!eventId.startsWith(AUTO_CLOSING_PREFIX)) return null;
  return eventId.slice(AUTO_CLOSING_PREFIX.length) || null;
}

async function resolveDefaultCategories(): Promise<Set<string>> {
  try {
    if (!process.env.DATABASE_URL) {
      const { getSettings } = await import("@/lib/settings/store");
      const settings = await getSettings();
      if (settings.defaultEtendersCategories?.length) {
        return new Set(
          settings.defaultEtendersCategories.map((c) => c.trim().toLowerCase()),
        );
      }
    }
  } catch {
    // fall through to code defaults
  }
  return new Set(
    defaultEtendersCategories().map((c) => c.trim().toLowerCase()),
  );
}

function isDefaultCategoryTenderOrRfq(
  opp: Opportunity,
  defaults: Set<string>,
): boolean {
  const type = opp.opportunityType ?? (opp.isPanel ? "panel" : "tender");
  if (type !== "tender" && type !== "rfq") return false;
  const category = (opp.category ?? "").trim().toLowerCase();
  if (!category || !defaults.has(category)) return false;
  if (!opp.closingAt) return false;
  const closingMs = new Date(opp.closingAt).getTime();
  if (Number.isNaN(closingMs)) return false;

  const status = deriveTenderStatus(opp);
  // Keep open / closing-soon, plus recently closed (so the current month still shows them)
  if (status === "open" || status === "closing_soon") return true;
  if (status === "closed" || status === "awarded") {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return closingMs >= Date.now() - sevenDaysMs;
  }
  return false;
}

function closingEventFromOpportunity(opp: Opportunity): CalendarEvent {
  const now = new Date().toISOString();
  const startsAt = new Date(opp.closingAt).toISOString();
  const ref = opp.refNo?.trim() || opp.title;
  return {
    id: `${AUTO_CLOSING_PREFIX}${opp.id}`,
    kind: "closing",
    title: `Closing — ${ref}`,
    startsAt,
    endsAt: startsAt,
    location: opp.source === "eTenders" ? "eTenders" : opp.source || "",
    agenda: [
      opp.title,
      opp.buyer ? `Buyer: ${opp.buyer}` : null,
      opp.category ? `Category: ${opp.category}` : null,
      "Synced from All Tenders · selected categories",
    ]
      .filter(Boolean)
      .join("\n"),
    linkedTo: opp.refNo?.trim() || `opp:${opp.id}`,
    attendees: "Bid team",
    createdBy: "Pipeline · intake",
    allDay: false,
    createdAt: opp.createdAt || now,
    updatedAt: opp.updatedAt || now,
  };
}

/** Build Closing calendar events from default-category tenders / RFQs. */
export async function tenderClosingEvents(): Promise<CalendarEvent[]> {
  const defaults = await resolveDefaultCategories();
  const opportunities = await listOpportunities({ scope: "all" });
  return opportunities
    .filter((opp) => isDefaultCategoryTenderOrRfq(opp, defaults))
    .map(closingEventFromOpportunity);
}

/**
 * Merge manual calendar events with live tender/RFQ closings.
 * Auto events win on the same linkedTo so intake date changes stay accurate.
 */
export async function mergeTenderClosings(
  stored: CalendarEvent[],
): Promise<CalendarEvent[]> {
  const auto = await tenderClosingEvents();
  const autoLinked = new Set(
    auto
      .map((e) => e.linkedTo.trim().toLowerCase())
      .filter(Boolean),
  );

  const manual = stored.filter((event) => {
    if (isAutoClosingEvent(event)) return false;
    if (event.kind === "closing" && event.linkedTo.trim()) {
      return !autoLinked.has(event.linkedTo.trim().toLowerCase());
    }
    return true;
  });

  return [...manual, ...auto].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}
