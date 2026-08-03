/** True when a value looks like an eTenders OCID / database key, not a tender number. */
export function isOcidRef(value: string | null | undefined): boolean {
  return Boolean(value && /^ocds-/i.test(value.trim()));
}

/**
 * Human-facing tender / RFQ reference for UI.
 * Prefer a real tender number over the OCID stored as externalId.
 */
export function displayTenderRef(item: {
  refNo?: string | null;
  title?: string | null;
  externalId?: string | null;
}): string {
  const ref = item.refNo?.trim() || "";
  if (ref && !isOcidRef(ref)) return ref;

  const title = item.title?.trim() || "";
  // Titles like "NB082/2026" or "RFQ19-06-2026 A" are usable as the display ref.
  if (title && title.length <= 48 && !/\s{2,}/.test(title)) {
    return title;
  }

  if (ref) return ref;
  return item.externalId?.trim() || "—";
}

const ZA = "Africa/Johannesburg";

/** Calendar YYYY-MM-DD in Africa/Johannesburg for an instant. */
export function zaCalendarDate(isoOrDate: string | Date): string {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Working days from today until closing (excl. weekends), Africa/Johannesburg calendar. */
export function workingDaysUntil(closingAt: string, from = new Date()): number {
  const endYmd = zaCalendarDate(closingAt);
  const startYmd = zaCalendarDate(from);
  if (!endYmd || !startYmd) return 0;
  if (endYmd <= startYmd) return 0;

  // Iterate calendar days in SAST by anchoring noon UTC offsets carefully:
  // use date-only strings as UTC noon to avoid DST edge issues (ZA has none).
  const cursor = new Date(`${startYmd}T12:00:00Z`);
  const end = new Date(`${endYmd}T12:00:00Z`);
  let count = 0;
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

/** Date only: dd MMM yyyy in Africa/Johannesburg. */
export function formatZaDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: ZA,
  }).format(d);
}

/**
 * Closing display in Africa/Johannesburg.
 * Format: dd MMM yyyy, and append HH:mm when the source instant has a time.
 */
export function formatZaClosing(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const date = formatZaDate(iso);
  const hasTime = /T\d{2}:\d{2}/.test(iso);
  if (!hasTime) return date;

  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: ZA,
  }).format(d);

  return `${date} ${time}`;
}

export function formatZar(centsOrRands: number | null) {
  if (centsOrRands == null) return "—";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(centsOrRands);
}
