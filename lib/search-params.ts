import { isISODate, todayISO } from "./dates";
import type { ApartmentFilters } from "./types";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) =>
  (first(v) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const int = (v: string | string[] | undefined) => {
  const n = parseInt(first(v) ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function parseSearchParams(sp: RawSearchParams): ApartmentFilters & { view: "grid" | "map" } {
  const checkIn = first(sp.in);
  const checkOut = first(sp.out);
  const datesOk = isISODate(checkIn) && isISODate(checkOut) && checkIn >= todayISO() && checkOut > checkIn;
  const sort = first(sp.sort);

  return {
    q: first(sp.q)?.slice(0, 80) || undefined,
    minPrice: int(sp.min),
    maxPrice: int(sp.max),
    amenities: list(sp.am),
    types: list(sp.type),
    instant: first(sp.instant) === "1" || undefined,
    guests: int(sp.guests),
    checkIn: datesOk ? checkIn : undefined,
    checkOut: datesOk ? checkOut : undefined,
    sort: sort === "price-asc" || sort === "price-desc" || sort === "rating" ? sort : "featured",
    view: first(sp.view) === "map" ? "map" : "grid",
  };
}

/** Dates and guests that should follow the guest from the grid into an apartment page. */
export function carryQuery(f: ApartmentFilters): string {
  const p = new URLSearchParams();
  if (f.checkIn && f.checkOut) {
    p.set("in", f.checkIn);
    p.set("out", f.checkOut);
  }
  if (f.guests) p.set("guests", String(f.guests));
  return p.toString();
}
