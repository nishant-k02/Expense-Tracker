export function formatCurrency(amount: number | string | null | undefined, currency = "USD"): string {
  if (amount === null || amount === undefined) return "—";
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

// All callers pass `@db.Date` values (calendar dates, not instants) that
// Postgres/Prisma represent as UTC midnight. Formatting without a fixed
// timeZone uses the server's local zone instead, which rolls the date back
// by a day west of UTC (e.g. "2026-10-12" -> "Oct 11" in America/Chicago).
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(d);
}
