const ngn = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

/** ₦45,000 — whole naira with thousands separators. */
export function formatNGN(amount: number): string {
  return `₦${ngn.format(Math.round(amount))}`;
}

/** "45k" style for tight spaces such as slider labels. */
export function formatNGNShort(amount: number): string {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (amount >= 1_000) return `₦${Math.round(amount / 1_000)}k`;
  return `₦${amount}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Nigerian numbers in any common form → +234XXXXXXXXXX. Returns null when it cannot be one. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  if (/^\+234\d{10}$/.test(digits)) return digits;
  if (/^234\d{10}$/.test(digits)) return `+${digits}`;
  if (/^0\d{10}$/.test(digits)) return `+234${digits.slice(1)}`;
  if (/^\d{10}$/.test(digits)) return `+234${digits}`;
  if (/^\+\d{8,15}$/.test(digits)) return digits; // international guests
  return null;
}

export function bookingCode(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I to avoid mistakes when read aloud
  let out = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `PDM-${out}`;
}

export const ID_TYPE_LABEL: Record<string, string> = {
  NIN: "National ID (NIN)",
  PASSPORT: "International passport",
  DRIVERS_LICENSE: "Driver's licence",
  VOTERS_CARD: "Voter's card",
};

export const PROPERTY_LABEL: Record<string, string> = {
  STUDIO: "Studio",
  ONE_BED: "1-bedroom",
  TWO_BED: "2-bedroom",
  THREE_BED: "3-bedroom",
  PENTHOUSE: "Penthouse",
};

export const POLICY_LABEL: Record<string, string> = {
  FLEXIBLE: "Flexible",
  MODERATE: "Moderate",
  STRICT: "Strict",
};

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};
