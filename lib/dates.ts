// Calendar-day helpers. Everything is a plain "YYYY-MM-DD" string so the server,
// the browser and the database always agree on which night a booking covers.

export const DAY_MS = 86_400_000;
export const TIMEZONE = "Africa/Lagos";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && toISODate(d) === value;
}

export function parseISODate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return toISODate(new Date(parseISODate(value).getTime() + days * DAY_MS));
}

export function diffNights(checkIn: string, checkOut: string): number {
  return Math.round((parseISODate(checkOut).getTime() - parseISODate(checkIn).getTime()) / DAY_MS);
}

/** Every night of the stay: check-in date included, check-out date excluded. */
export function eachNight(checkIn: string, checkOut: string): string[] {
  const n = diffNights(checkIn, checkOut);
  return Array.from({ length: Math.max(0, n) }, (_, i) => addDays(checkIn, i));
}

/** Friday and Saturday nights are the "weekend" nights. */
export function isWeekendNight(value: string): boolean {
  const day = parseISODate(value).getUTCDay();
  return day === 5 || day === 6;
}

/** Today's calendar date in Nigeria, regardless of where the server runs. */
export function todayISO(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

export function formatDate(value: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat("en-NG", { ...opts, timeZone: "UTC" }).format(parseISODate(value));
}

export function formatRange(checkIn: string, checkOut: string): string {
  const a = parseISODate(checkIn);
  const b = parseISODate(checkOut);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const start = formatDate(checkIn, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  const end = formatDate(checkOut, { day: "numeric", month: "short", year: "numeric" });
  return `${start} – ${end}`;
}

/** The exact moment a guest may check in, in Nigerian time (UTC+1, no DST). */
export function checkInMoment(checkIn: string, checkInTime: string): Date {
  return new Date(`${checkIn}T${checkInTime}:00+01:00`);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  // Half-open ranges: a guest leaving on the 5th does not clash with one arriving on the 5th.
  return aStart < bEnd && bStart < aEnd;
}
