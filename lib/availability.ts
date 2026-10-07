// Availability and double-booking protection.
//
// A night is taken when ANY of these is true:
//   • a CONFIRMED or CHECKED_IN booking covers it
//   • a PENDING booking covers it and its payment hold has not expired
//   • the host (or an Airbnb / Booking.com iCal feed) blocked it
//
// Ranges are half-open: a guest leaving on the 5th does not clash with one arriving on the 5th.

import type { Prisma, PrismaClient } from "@prisma/client";
import { addDays, eachNight, parseISODate, toISODate } from "./dates";

type Db = PrismaClient | Prisma.TransactionClient;

export function liveBookingWhere(now: Date = new Date()): Prisma.BookingWhereInput {
  return {
    OR: [
      { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
      { status: "PENDING", holdExpiresAt: { gt: now } },
    ],
  };
}

export async function hasConflict(
  db: Db,
  apartmentId: string,
  checkIn: string,
  checkOut: string,
  opts: { excludeBookingId?: string } = {},
): Promise<{ conflict: boolean; reason?: "booked" | "blocked" }> {
  const start = parseISODate(checkIn);
  const end = parseISODate(checkOut);

  const booking = await db.booking.findFirst({
    where: {
      apartmentId,
      checkIn: { lt: end },
      checkOut: { gt: start },
      ...(opts.excludeBookingId ? { id: { not: opts.excludeBookingId } } : {}),
      AND: [liveBookingWhere()],
    },
    select: { id: true },
  });
  if (booking) return { conflict: true, reason: "booked" };

  const blocked = await db.blockedDate.findFirst({
    where: { apartmentId, startDate: { lt: end }, endDate: { gt: start } },
    select: { id: true },
  });
  if (blocked) return { conflict: true, reason: "blocked" };

  return { conflict: false };
}

/** Every unavailable night for the next `days` days, as ISO strings. Feeds the booking calendar. */
export async function getUnavailableNights(db: Db, apartmentId: string, from: string, days = 540): Promise<string[]> {
  const start = parseISODate(from);
  const end = parseISODate(addDays(from, days));

  const [bookings, blocks] = await Promise.all([
    db.booking.findMany({
      where: { apartmentId, checkIn: { lt: end }, checkOut: { gt: start }, AND: [liveBookingWhere()] },
      select: { checkIn: true, checkOut: true },
    }),
    db.blockedDate.findMany({
      where: { apartmentId, startDate: { lt: end }, endDate: { gt: start } },
      select: { startDate: true, endDate: true },
    }),
  ]);

  const taken = new Set<string>();
  for (const r of [...bookings.map((b) => [b.checkIn, b.checkOut] as const), ...blocks.map((b) => [b.startDate, b.endDate] as const)]) {
    for (const night of eachNight(toISODate(r[0]), toISODate(r[1]))) {
      if (night >= from) taken.add(night);
    }
  }
  return [...taken].sort();
}

/** Serialises concurrent bookings of the same apartment so two guests can never both win the same dates. */
export async function lockApartment(tx: Prisma.TransactionClient, apartmentId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Apartment" WHERE id = ${apartmentId} FOR UPDATE`;
}
