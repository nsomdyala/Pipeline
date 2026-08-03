/** Working days from today until closing (excl. weekends), Africa/Johannesburg-oriented calendar. */
export function workingDaysUntil(closingAt: string, from = new Date()): number {
  const end = new Date(closingAt);
  if (Number.isNaN(end.getTime())) return 0;

  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end <= cursor) return 0;

  let count = 0;
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export function formatZaDate(iso: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
}

export function formatZar(centsOrRands: number | null) {
  if (centsOrRands == null) return "—";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(centsOrRands);
}
