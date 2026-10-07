// iCal in both directions.
//   Import: pull an Airbnb / Booking.com calendar and turn every reservation into BlockedDate rows.
//   Export: publish our own bookings and blocks so those platforms can block the same nights.

import { prisma } from "./prisma";
import { addDays, parseISODate, toISODate, todayISO } from "./dates";
import { liveBookingWhere } from "./availability";

export type IcalRange = { start: string; end: string; summary: string }; // end is exclusive

/** Unfold wrapped lines, then read DTSTART/DTEND from each VEVENT. Handles DATE and DATE-TIME values. */
export function parseIcal(text: string): IcalRange[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const out: IcalRange[] = [];
  let cur: { start?: string; end?: string; summary: string } | null = null;

  const toDate = (v: string): string | null => {
    const m = v.match(/(\d{4})(\d{2})(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  };

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) cur = { summary: "" };
    else if (line.startsWith("END:VEVENT")) {
      if (cur?.start) {
        const end = cur.end && cur.end > cur.start ? cur.end : addDays(cur.start, 1);
        out.push({ start: cur.start, end, summary: cur.summary });
      }
      cur = null;
    } else if (cur) {
      const [key, ...rest] = line.split(":");
      const value = rest.join(":");
      const name = key.split(";")[0];
      if (name === "DTSTART") cur.start = toDate(value) ?? undefined;
      else if (name === "DTEND") cur.end = toDate(value) ?? undefined;
      else if (name === "SUMMARY") cur.summary = value.trim();
    }
  }
  return out;
}

export async function syncFeed(feedId: string): Promise<{ imported: number; error?: string }> {
  const feed = await prisma.icalFeed.findUnique({ where: { id: feedId } });
  if (!feed) return { imported: 0, error: "Feed not found" };

  try {
    if (!/^https?:\/\//i.test(feed.url)) throw new Error("The calendar link must start with https://");
    const res = await fetch(feed.url, { headers: { Accept: "text/calendar" }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`The calendar server answered ${res.status}`);
    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("That link did not return an iCal calendar");

    const today = todayISO();
    const ranges = parseIcal(text).filter((r) => r.end > today);

    await prisma.$transaction([
      prisma.blockedDate.deleteMany({ where: { feedId: feed.id } }),
      prisma.blockedDate.createMany({
        data: ranges.map((r) => ({
          apartmentId: feed.apartmentId,
          startDate: parseISODate(r.start < today ? today : r.start),
          endDate: parseISODate(r.end),
          reason: `${feed.name}${r.summary ? `: ${r.summary}` : ""}`.slice(0, 120),
          source: "ICAL" as const,
          feedId: feed.id,
        })),
      }),
      prisma.icalFeed.update({ where: { id: feed.id }, data: { lastSyncedAt: new Date(), lastError: null } }),
    ]);
    return { imported: ranges.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    await prisma.icalFeed.update({ where: { id: feed.id }, data: { lastError: message.slice(0, 200) } }).catch(() => {});
    return { imported: 0, error: message };
  }
}

export async function syncAllFeeds(): Promise<{ feeds: number; failed: number }> {
  const feeds = await prisma.icalFeed.findMany({ select: { id: true } });
  let failed = 0;
  for (const f of feeds) {
    const r = await syncFeed(f.id);
    if (r.error) failed++;
  }
  return { feeds: feeds.length, failed };
}

const compact = (iso: string) => iso.replace(/-/g, "");
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Our calendar. Only manual blocks and our own bookings are exported, never imported feeds, which would echo back. */
export async function buildIcal(apartmentId: string, title: string): Promise<string> {
  const from = parseISODate(addDays(todayISO(), -1));
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({ where: { apartmentId, checkOut: { gt: from }, AND: [liveBookingWhere()] }, select: { id: true, checkIn: true, checkOut: true } }),
    prisma.blockedDate.findMany({ where: { apartmentId, endDate: { gt: from }, source: "MANUAL" }, select: { id: true, startDate: true, endDate: true, reason: true } }),
  ]);

  const events = [
    ...bookings.map((b) => ({ uid: `booking-${b.id}`, s: toISODate(b.checkIn), e: toISODate(b.checkOut), summary: "Reserved (Podium)" })),
    ...blocks.map((b) => ({ uid: `block-${b.id}`, s: toISODate(b.startDate), e: toISODate(b.endDate), summary: "Blocked (Podium)" })),
  ];

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Podium Apartments//Availability//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${title.replace(/[\r\n,;]/g, " ")}`,
    ...events.flatMap((ev) => ["BEGIN:VEVENT", `UID:${ev.uid}@podiumapartments`, `DTSTAMP:${stamp()}`, `DTSTART;VALUE=DATE:${compact(ev.s)}`, `DTEND;VALUE=DATE:${compact(ev.e)}`, `SUMMARY:${ev.summary}`, "END:VEVENT"]),
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
