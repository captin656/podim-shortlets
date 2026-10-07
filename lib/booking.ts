// The booking engine. Every way a booking changes (a guest pays, an admin confirms,
// a guest cancels, a hold expires) goes through a function in this file, so the rules live in one place:
//
//   • Dates are protected by a row lock on the apartment plus an overlap check inside one transaction.
//   • Prices are always recomputed on the server with lib/pricing.ts and stored as a snapshot.
//   • The caution fee is separate, refundable and tracked (cautionStatus).
//   • Gate code and Wi-Fi are returned only when the booking is paid (canSeeInstructions).
//   • Money-moving steps are idempotent: a Paystack webhook and the browser redirect can both arrive safely.

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ApiError } from "./api";
import { hasConflict, lockApartment } from "./availability";
import { quoteRefund, type RefundQuote } from "./cancellation";
import { addDays, diffNights, parseISODate, toISODate, todayISO } from "./dates";
import { bookingCode } from "./format";
import { getSettings, toApartmentView } from "./data";
import { notifyBooking, sendEmail, simpleEmail, type MailBooking } from "./notify";
import { initializeTransaction, paystackConfigured, refundTransaction, verifyTransaction } from "./paystack";
import { calculatePrice, type CouponRule, type FeeSettings, type PriceBreakdown, type PricingConfig } from "./pricing";
import { SAMPLE_COUPONS } from "./sample-data";
import type { ApartmentView, SettingsView } from "./types";
import type { BookingView, PaymentView } from "./booking-types";
import type { BookingRequest } from "./validation";

export const BANK_HOLD_MS = 24 * 3_600_000; // time a guest has to send a transfer
export const REVIEW_HOLD_MS = 48 * 3_600_000; // time the host has to approve a paid request or check a receipt

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// ───────────────────────── shared shapes ─────────────────────────

export const apartmentInclude = {
  images: { orderBy: { position: "asc" } },
  amenities: true,
  seasonalPrices: true,
} satisfies Prisma.ApartmentInclude;

export const bookingInclude = {
  apartment: { include: { images: { orderBy: { position: "asc" }, take: 1 } } },
  payments: { orderBy: { createdAt: "asc" } },
  review: { select: { id: true } },
} satisfies Prisma.BookingInclude;

export type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;
type Tx = Prisma.TransactionClient;

export function pricingConfigOf(a: ApartmentView): PricingConfig {
  return {
    pricePerNight: a.pricePerNight,
    weekendPrice: a.weekendPrice,
    weeklyDiscount: a.weeklyDiscount,
    monthlyDiscount: a.monthlyDiscount,
    cleaningFee: a.cleaningFee,
    cautionFee: a.cautionFee,
    minNights: a.minNights,
    maxNights: a.maxNights,
    seasonal: a.seasonal,
  };
}

export const feeSettingsOf = (s: SettingsView): FeeSettings => ({ serviceFeePercent: s.serviceFeePercent, taxPercent: s.taxPercent });

/** What must be paid up front. Mirrors `payNow` in lib/pricing.ts. */
export function dueNowFor(b: { total: number; cautionFee: number; paymentOption: "FULL" | "DEPOSIT" }): number {
  const stay = b.total - b.cautionFee;
  return b.paymentOption === "DEPOSIT" ? Math.ceil(stay / 2) + b.cautionFee : b.total;
}

/** Check-in instructions stay hidden until money has been received and the host has confirmed. */
export function canSeeInstructions(b: { status: string; paymentStatus: string }): boolean {
  return (b.paymentStatus === "PAID" || b.paymentStatus === "PARTIAL") && (b.status === "CONFIRMED" || b.status === "CHECKED_IN");
}

// ───────────────────────── views ─────────────────────────

export function toBookingView(b: BookingRow, settings: SettingsView, now: Date = new Date()): BookingView {
  const checkIn = toISODate(b.checkIn);
  const checkOut = toISODate(b.checkOut);
  const apt = b.apartment;
  const open = b.status === "PENDING" || b.status === "CONFIRMED";
  const proofSubmitted = b.payments.some((p) => p.proofUrl && p.status === "PENDING");
  const stayTotal = b.total - b.cautionFee;

  return {
    id: b.id,
    code: b.code,
    token: b.accessToken,
    status: b.status,
    paymentStatus: b.paymentStatus,
    paymentOption: b.paymentOption,
    paymentMethod: b.paymentMethod,
    cautionStatus: b.cautionStatus,
    checkIn,
    checkOut,
    nights: b.nights,
    guests: b.guests,
    createdAt: b.createdAt.toISOString(),
    guest: {
      name: b.guestName,
      email: b.guestEmail,
      phone: b.guestPhone,
      whatsapp: b.guestWhatsapp,
      idType: b.idType,
      idNumberMasked: b.idNumber.length > 4 ? `${"•".repeat(Math.min(6, b.idNumber.length - 4))}${b.idNumber.slice(-4)}` : "••••",
    },
    apartment: {
      id: apt.id,
      slug: apt.slug,
      title: apt.title,
      address: apt.address,
      area: apt.area,
      city: apt.city,
      image: apt.images[0]?.url ?? null,
      checkInTime: apt.checkInTime,
      checkOutTime: apt.checkOutTime,
      hostName: apt.hostName,
      hostPhone: apt.hostPhone,
      lat: apt.lat,
      lng: apt.lng,
    },
    price: {
      nightly: b.nightlyBreakdown as unknown as BookingView["price"]["nightly"],
      accommodation: b.accommodation,
      discountLabel: b.discountLabel,
      discountAmount: b.discountAmount,
      couponCode: b.couponCode,
      couponDiscount: b.couponDiscount,
      cleaningFee: b.cleaningFee,
      serviceFee: b.serviceFee,
      taxAmount: b.taxAmount,
      cautionFee: b.cautionFee,
      stayTotal,
      total: b.total,
      amountPaid: b.amountPaid,
      balanceDue: Math.max(0, b.total - b.amountPaid),
      dueNow: dueNowFor(b),
    },
    policy: b.cancellationPolicy,
    cancelledAt: b.cancelledAt?.toISOString() ?? null,
    cancelReason: b.cancelReason,
    refundAmount: b.refundAmount,
    holdExpiresAt: b.holdExpiresAt?.toISOString() ?? null,
    instructions: canSeeInstructions(b)
      ? { gateCode: apt.gateCode, wifiName: apt.wifiName, wifiPassword: apt.wifiPassword, arrivalNotes: apt.arrivalNotes }
      : null,
    awaitingProof: b.paymentMethod === "BANK_TRANSFER" && b.status === "PENDING" && b.paymentStatus === "UNPAID" && !proofSubmitted,
    proofSubmitted,
    awaitingApproval: b.status === "PENDING" && b.amountPaid > 0,
    refundQuote: open
      ? quoteRefund({ policy: b.cancellationPolicy, checkIn, checkInTime: apt.checkInTime, amountPaid: b.amountPaid, cautionFee: b.cautionFee, settings, now })
      : null,
    canReview: b.status === "COMPLETED" && checkOut <= todayISO(now) && !b.review,
    hasReview: Boolean(b.review),
    payments: b.payments.map(
      (p): PaymentView => ({
        id: p.id,
        reference: p.reference,
        provider: p.provider,
        kind: p.kind,
        amount: p.amount,
        status: p.status,
        channel: p.channel,
        proofUrl: p.proofUrl,
        paidAt: p.paidAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      }),
    ),
  };
}

export function toMailBooking(b: BookingRow): MailBooking {
  const visible = canSeeInstructions(b);
  return {
    code: b.code,
    accessToken: b.accessToken,
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    guestPhone: b.guestPhone,
    apartmentTitle: b.apartment.title,
    address: b.apartment.address,
    checkIn: toISODate(b.checkIn),
    checkOut: toISODate(b.checkOut),
    checkInTime: b.apartment.checkInTime,
    checkOutTime: b.apartment.checkOutTime,
    nights: b.nights,
    total: b.total,
    amountPaid: b.amountPaid,
    cautionFee: b.cautionFee,
    balanceDue: Math.max(0, b.total - b.amountPaid),
    instructions: visible
      ? { gateCode: b.apartment.gateCode, wifiName: b.apartment.wifiName, wifiPassword: b.apartment.wifiPassword, arrivalNotes: b.apartment.arrivalNotes }
      : null,
    confirmed: b.status === "CONFIRMED" || b.status === "CHECKED_IN",
  };
}

export async function loadBooking(id: string): Promise<BookingRow> {
  const row = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!row) throw new ApiError(404, "We couldn't find that booking.");
  return row;
}

/** A guest's way in without an account: the booking code plus the secret token from their email or SMS. */
export async function loadBookingByToken(code: string, token: string): Promise<BookingRow | null> {
  if (!code || !token) return null;
  const row = await prisma.booking.findFirst({ where: { code: code.toUpperCase(), accessToken: token }, include: bookingInclude });
  return row;
}

/** Bookings that belong to a signed-in user: made while signed in, or under their verified email or phone. */
export async function listBookingsForUser(userId: string): Promise<BookingRow[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true, phone: true, phoneVerified: true } });
  if (!user) return [];
  const or: Prisma.BookingWhereInput[] = [{ userId }];
  if (user.email && user.emailVerified) or.push({ guestEmail: user.email });
  if (user.phone && user.phoneVerified) or.push({ guestPhone: user.phone });
  return prisma.booking.findMany({ where: { OR: or }, include: bookingInclude, orderBy: { checkIn: "desc" } });
}

// ───────────────────────── coupons and quotes ─────────────────────────

export type CouponInfo = CouponRule & { description: string | null };

export async function resolveCoupon(codeRaw: string, apartmentId: string, nights: number, now = new Date()): Promise<CouponInfo> {
  const code = codeRaw.trim().toUpperCase();
  const bad = (message: string) => new ApiError(400, message);

  if (!process.env.DATABASE_URL) {
    const c = SAMPLE_COUPONS.find((x) => x.code === code);
    if (!c) throw bad("That coupon code isn't valid.");
    if (nights < c.minNights) throw bad(`This code needs a stay of ${c.minNights} nights or more.`);
    return { code: c.code, type: c.type, value: c.value, description: c.description };
  }

  const c = await prisma.coupon.findUnique({ where: { code } });
  if (!c || !c.isActive) throw bad("That coupon code isn't valid.");
  if (c.startsAt && c.startsAt > now) throw bad("That coupon isn't active yet.");
  if (c.expiresAt && c.expiresAt < now) throw bad("That coupon has expired.");
  if (c.maxUses !== null && c.usedCount >= c.maxUses) throw bad("That coupon has been fully used.");
  if (c.apartmentId && c.apartmentId !== apartmentId) throw bad("That coupon doesn't apply to this apartment.");
  if (nights < c.minNights) throw bad(`This code needs a stay of ${c.minNights} nights or more.`);
  return { code: c.code, type: c.type, value: c.value, description: c.description };
}

function assertBookable(a: ApartmentView, checkIn: string, checkOut: string, guests: number | undefined) {
  if (checkIn < todayISO()) throw new ApiError(400, "Check-in can't be in the past.");
  if (checkOut <= checkIn) throw new ApiError(400, "Check-out must be after check-in.");
  if (guests && guests > a.maxGuests) throw new ApiError(400, `This apartment sleeps up to ${a.maxGuests} guests.`);
}

export async function quoteStay(args: {
  apartment: ApartmentView;
  settings: SettingsView;
  checkIn: string;
  checkOut: string;
  guests?: number;
  couponCode?: string | null;
  option?: "FULL" | "DEPOSIT";
}): Promise<{ price: PriceBreakdown; coupon: { code: string; description: string | null } | null; couponError: string | null }> {
  const { apartment, settings, checkIn, checkOut } = args;
  assertBookable(apartment, checkIn, checkOut, args.guests);

  let coupon: CouponInfo | null = null;
  let couponError: string | null = null;
  if (args.couponCode) {
    try {
      coupon = await resolveCoupon(args.couponCode, apartment.id, diffNights(checkIn, checkOut));
    } catch (e) {
      if (e instanceof ApiError) couponError = e.message;
      else throw e;
    }
  }
  const price = calculatePrice(pricingConfigOf(apartment), feeSettingsOf(settings), checkIn, checkOut, coupon, args.option ?? "FULL");
  if (!price.ok) throw new ApiError(400, price.error);
  return { price, coupon: coupon ? { code: coupon.code, description: coupon.description } : null, couponError };
}

// ───────────────────────── creating a booking ─────────────────────────

async function assertNotBlacklisted(email: string, phone: string, userId: string | null) {
  const banned = await prisma.user.findFirst({
    where: { isBlacklisted: true, OR: [{ email }, { phone }, ...(userId ? [{ id: userId }] : [])] },
    select: { id: true },
  });
  if (banned) throw new ApiError(403, "We can't take a booking with these details. Please contact us if you think this is a mistake.");
}

const newReference = (code: string) => `${code}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export async function createBooking(input: BookingRequest, userId: string | null): Promise<{ booking: BookingRow; paymentId: string }> {
  const [row, settings] = await Promise.all([
    prisma.apartment.findFirst({ where: { id: input.apartmentId, isActive: true }, include: apartmentInclude }),
    getSettings(),
  ]);
  if (!row) throw new ApiError(404, "That apartment isn't available to book right now.");
  const apartment = toApartmentView(row);

  assertBookable(apartment, input.checkIn, input.checkOut, input.guests);
  await assertNotBlacklisted(input.guestEmail, input.guestPhone, userId);

  const nights = diffNights(input.checkIn, input.checkOut);
  let coupon: CouponInfo | null = null;
  if (input.couponCode) coupon = await resolveCoupon(input.couponCode, apartment.id, nights);

  const price = calculatePrice(pricingConfigOf(apartment), feeSettingsOf(settings), input.checkIn, input.checkOut, coupon, input.paymentOption);
  if (!price.ok) throw new ApiError(400, price.error);

  const now = new Date();
  const holdMs = input.paymentMethod === "BANK_TRANSFER" ? BANK_HOLD_MS : settings.holdMinutes * 60_000;
  const payNow = price.payNow;

  const created = await prisma.$transaction(
    async (tx) => {
      // One apartment at a time: the second guest waits here, then sees the first guest's hold and is turned away.
      await lockApartment(tx, apartment.id);
      const clash = await hasConflict(tx, apartment.id, input.checkIn, input.checkOut);
      if (clash.conflict) throw new ApiError(409, "Sorry, those dates were just taken. Please choose other dates.");

      let code = bookingCode();
      while (await tx.booking.findUnique({ where: { code }, select: { id: true } })) code = bookingCode();

      const booking = await tx.booking.create({
        data: {
          code,
          apartmentId: apartment.id,
          userId,
          status: "PENDING",
          checkIn: parseISODate(input.checkIn),
          checkOut: parseISODate(input.checkOut),
          nights: price.nights,
          guests: input.guests,
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
          guestWhatsapp: input.guestWhatsapp,
          idType: input.idType,
          idNumber: input.idNumber,
          specialRequests: input.specialRequests,
          nightlyBreakdown: price.nightly as unknown as Prisma.InputJsonValue,
          accommodation: price.accommodation,
          discountLabel: price.discountLabel,
          discountAmount: price.discountAmount,
          couponCode: price.couponCode,
          couponDiscount: price.couponDiscount,
          cleaningFee: price.cleaningFee,
          serviceFee: price.serviceFee,
          taxAmount: price.taxAmount,
          cautionFee: price.cautionFee,
          total: price.total,
          paymentOption: input.paymentOption,
          paymentMethod: input.paymentMethod,
          cancellationPolicy: apartment.cancellationPolicy,
          holdExpiresAt: new Date(now.getTime() + holdMs),
        },
      });
      const payment = await tx.payment.create({
        data: { bookingId: booking.id, reference: newReference(code), provider: input.paymentMethod, kind: "CHARGE", amount: payNow, status: "PENDING" },
      });
      return { bookingId: booking.id, paymentId: payment.id };
    },
    { timeout: 15_000, maxWait: 10_000 },
  );

  return { booking: await loadBooking(created.bookingId), paymentId: created.paymentId };
}

// ───────────────────────── taking payment ─────────────────────────

export type PaymentNext =
  | { type: "redirect"; url: string }
  | { type: "bank"; reference: string; amount: number; bank: { name: string; accountName: string; accountNumber: string }; expiresAt: string | null };

/** Starts a card, bank-transfer or USSD payment through Paystack, or returns the transfer instructions. */
export async function beginPayment(bookingId: string, paymentId: string): Promise<PaymentNext> {
  const [booking, payment, settings] = await Promise.all([loadBooking(bookingId), prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }), getSettings()]);

  if (payment.provider === "BANK_TRANSFER") {
    return {
      type: "bank",
      reference: booking.code,
      amount: payment.amount,
      bank: { name: settings.bankName, accountName: settings.bankAccountName, accountNumber: settings.bankAccountNumber },
      expiresAt: booking.holdExpiresAt?.toISOString() ?? null,
    };
  }

  const init = await initializeTransaction({
    email: booking.guestEmail,
    amountNaira: payment.amount,
    reference: payment.reference,
    callbackUrl: `${siteUrl()}/checkout/success?code=${booking.code}&token=${booking.accessToken}`,
    metadata: { bookingCode: booking.code, apartment: booking.apartment.title, guest: booking.guestName },
  });
  return { type: "redirect", url: init.authorization_url };
}

/**
 * Starts (or restarts) payment for an existing booking, for example when a guest closed the Paystack window,
 * wants to switch to bank transfer, or wants to pay the balance before arrival.
 */
export async function startPaymentAttempt(args: { code: string; token: string; method: "PAYSTACK" | "BANK_TRANSFER"; scope?: "now" | "balance" }): Promise<PaymentNext> {
  const found = await loadBookingByToken(args.code, args.token);
  if (!found) throw new ApiError(404, "We couldn't find that booking.");
  const scope = args.scope ?? "now";

  if (scope === "now" && found.status !== "PENDING") throw new ApiError(400, "This booking is no longer waiting for payment.");
  if (scope === "balance" && (found.status === "CANCELLED" || found.status === "REJECTED")) throw new ApiError(400, "This booking was cancelled.");

  const due = scope === "balance" ? found.total - found.amountPaid : dueNowFor(found) - found.amountPaid;
  if (due <= 0) throw new ApiError(400, "There is nothing left to pay on this booking.");

  const settings = await getSettings();
  const holdMs = args.method === "BANK_TRANSFER" ? BANK_HOLD_MS : settings.holdMinutes * 60_000;

  const paymentId = await prisma.$transaction(
    async (tx) => {
      if (found.status === "PENDING") {
        // Re-take the hold. If someone else got the dates while this booking sat unpaid, say so now.
        await lockApartment(tx, found.apartmentId);
        const clash = await hasConflict(tx, found.apartmentId, toISODate(found.checkIn), toISODate(found.checkOut), { excludeBookingId: found.id });
        if (clash.conflict) throw new ApiError(409, "Sorry, those dates were taken while the payment was open. Please choose other dates.");
        await tx.booking.update({ where: { id: found.id }, data: { holdExpiresAt: new Date(Date.now() + holdMs), paymentMethod: args.method } });
      }
      // Stale card attempts are closed so the payments list stays honest.
      await tx.payment.updateMany({ where: { bookingId: found.id, kind: "CHARGE", status: "PENDING", provider: "PAYSTACK" }, data: { status: "FAILED" } });
      if (args.method === "BANK_TRANSFER") {
        const existing = await tx.payment.findFirst({ where: { bookingId: found.id, kind: "CHARGE", status: "PENDING", provider: "BANK_TRANSFER", amount: due } });
        if (existing) return existing.id;
      }
      const p = await tx.payment.create({
        data: { bookingId: found.id, reference: newReference(found.code), provider: args.method, kind: "CHARGE", amount: due, status: "PENDING" },
      });
      return p.id;
    },
    { timeout: 15_000 },
  );

  return beginPayment(found.id, paymentId);
}

/** Attach a bank-transfer receipt. The host confirms the money has landed, then the booking is confirmed. */
export async function attachProof(args: { code: string; token: string; proofUrl: string }): Promise<void> {
  const found = await loadBookingByToken(args.code, args.token);
  if (!found) throw new ApiError(404, "We couldn't find that booking.");
  if (found.status !== "PENDING" && found.status !== "CONFIRMED") throw new ApiError(400, "This booking is closed.");

  const pending = found.payments.filter((p) => p.kind === "CHARGE" && p.status === "PENDING" && p.provider === "BANK_TRANSFER").at(-1);
  if (!pending) throw new ApiError(400, "Choose bank transfer first, then upload your receipt.");

  await prisma.$transaction([
    prisma.payment.update({ where: { id: pending.id }, data: { proofUrl: args.proofUrl, channel: "bank_transfer" } }),
    ...(found.status === "PENDING" ? [prisma.booking.update({ where: { id: found.id }, data: { holdExpiresAt: new Date(Date.now() + REVIEW_HOLD_MS) } })] : []),
  ]);

  const s = await getSettings();
  await sendEmail({
    to: s.email,
    subject: `Transfer receipt uploaded for ${found.code}`,
    ...simpleEmail("A guest uploaded a transfer receipt", [`${found.guestName} sent a receipt for booking ${found.code} (${found.apartment.title}).`, "Check the money has arrived, then confirm the booking in the admin dashboard."], {
      label: "Open bookings",
      href: `${siteUrl()}/admin/bookings`,
    }),
  });
}

export type SettleResult = { state: "success" | "pending" | "failed" | "unknown"; bookingCode?: string };

/** Asks Paystack what happened to a reference and applies the result. Safe to call any number of times. */
export async function settlePaystackReference(reference: string): Promise<SettleResult> {
  const payment = await prisma.payment.findUnique({ where: { reference }, include: { booking: { select: { code: true } } } });
  if (!payment || payment.provider !== "PAYSTACK" || payment.kind !== "CHARGE") return { state: "unknown" };
  const bookingCodeValue = payment.booking.code;
  if (payment.status === "SUCCESS") return { state: "success", bookingCode: bookingCodeValue };

  const v = await verifyTransaction(reference);
  if (v.status === "success") {
    if (v.currency !== "NGN" || v.amount < payment.amount * 100) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", raw: v as unknown as Prisma.InputJsonValue } });
      return { state: "failed", bookingCode: bookingCodeValue };
    }
    await finalizePayment(payment.id, { channel: v.channel, paidAt: v.paid_at ? new Date(v.paid_at) : new Date(), raw: v });
    return { state: "success", bookingCode: bookingCodeValue };
  }
  if (v.status === "failed" || v.status === "reversed") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", raw: v as unknown as Prisma.InputJsonValue } });
    return { state: "failed", bookingCode: bookingCodeValue };
  }
  return { state: "pending", bookingCode: bookingCodeValue };
}

type FinalizeMeta = { channel?: string | null; paidAt?: Date; raw?: unknown; confirmedBy?: string };

/**
 * Money has arrived for a payment row. Marks it successful, updates the booking's totals and status,
 * and tells the guest. If another guest took the dates in the meantime, the payment is refunded instead.
 */
export async function finalizePayment(paymentId: string, meta: FinalizeMeta = {}): Promise<{ outcome: "confirmed" | "awaiting-approval" | "already" | "refunded" | "balance" }> {
  const paidAt = meta.paidAt ?? new Date();

  const result = await prisma.$transaction(
    async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { booking: { include: { apartment: { select: { isInstantBook: true } } } } } });
      if (!payment) throw new ApiError(404, "Payment not found.");
      if (payment.status === "SUCCESS") return { outcome: "already" as const, bookingId: payment.bookingId, refund: 0 };

      const b = payment.booking;
      const raw = (meta.raw ?? undefined) as Prisma.InputJsonValue | undefined;
      const markPaid = () => tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS", paidAt, channel: meta.channel ?? payment.channel, raw } });

      // Money arrived for a booking that is already closed: keep the record and send the money back.
      if (b.status === "CANCELLED" || b.status === "REJECTED") {
        await markPaid();
        await tx.booking.update({ where: { id: b.id }, data: { amountPaid: { increment: payment.amount } } });
        return { outcome: "refunded" as const, bookingId: b.id, refund: payment.amount };
      }

      let outcome: "confirmed" | "awaiting-approval" | "balance" = "balance";
      let nextStatus = b.status;
      let holdExpiresAt = b.holdExpiresAt;

      if (b.status === "PENDING") {
        await lockApartment(tx, b.apartmentId);
        const clash = await hasConflict(tx, b.apartmentId, toISODate(b.checkIn), toISODate(b.checkOut), { excludeBookingId: b.id });
        if (clash.conflict) {
          await markPaid();
          await tx.booking.update({
            where: { id: b.id },
            data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "The dates were taken before payment completed.", amountPaid: { increment: payment.amount }, holdExpiresAt: null },
          });
          return { outcome: "refunded" as const, bookingId: b.id, refund: payment.amount };
        }
        if (b.apartment.isInstantBook || meta.confirmedBy) {
          nextStatus = "CONFIRMED";
          holdExpiresAt = null;
          outcome = "confirmed";
        } else {
          holdExpiresAt = new Date(Date.now() + REVIEW_HOLD_MS); // paid, waiting for the host to approve
          outcome = "awaiting-approval";
        }
      }

      await markPaid();
      const amountPaid = b.amountPaid + payment.amount;
      const paymentStatus = amountPaid >= b.total ? "PAID" : "PARTIAL";
      await tx.booking.update({
        where: { id: b.id },
        data: {
          amountPaid,
          paymentStatus,
          status: nextStatus,
          holdExpiresAt,
          cautionStatus: b.cautionFee > 0 && amountPaid >= b.cautionFee && b.cautionStatus === "NONE" ? "HELD" : b.cautionStatus,
        },
      });

      // A coupon counts as used the first time the booking receives money.
      if (b.status === "PENDING" && b.couponCode) {
        await tx.coupon.updateMany({ where: { code: b.couponCode }, data: { usedCount: { increment: 1 } } });
      }
      return { outcome, bookingId: b.id, refund: 0 };
    },
    { timeout: 20_000 },
  );

  if (result.outcome === "already") return { outcome: "already" };

  if (result.outcome === "refunded") {
    await issueRefunds(result.bookingId, result.refund, "REFUND", "Dates no longer available");
    const row = await loadBooking(result.bookingId);
    const mail = simpleEmail("Your payment is being refunded", [
      `Hi ${row.guestName.split(" ")[0]}, the dates you chose for ${row.apartment.title} were taken before your payment completed.`,
      "We're sending your money back in full. Card refunds usually reach you within 5 to 10 working days.",
    ]);
    await sendEmail({ to: row.guestEmail, subject: "Your Podium payment is being refunded", ...mail });
    return { outcome: "refunded" };
  }

  const row = await loadBooking(result.bookingId);
  if (result.outcome !== "balance") await notifyBooking(toMailBooking(row));
  return { outcome: result.outcome };
}

// ───────────────────────── refunds ─────────────────────────

type RefundKind = "REFUND" | "CAUTION_REFUND";

/**
 * Sends `amount` back to the guest across the payments they made. Card payments are refunded through Paystack.
 * Anything that can't be sent automatically (bank transfers, cash, a Paystack error) becomes a PENDING refund row
 * that appears in the admin dashboard as money to send by hand.
 */
export async function issueRefunds(bookingId: string, amount: number, kind: RefundKind, note: string): Promise<{ automatic: number; manual: number }> {
  if (amount <= 0) return { automatic: 0, manual: 0 };

  const payments = await prisma.payment.findMany({ where: { bookingId }, orderBy: { createdAt: "asc" } });
  const charges = payments.filter((p) => p.kind === "CHARGE" && p.status === "SUCCESS");
  const refunds = payments.filter((p) => p.kind !== "CHARGE" && p.status !== "FAILED");

  const refundedOf = (reference: string) =>
    refunds.filter((r) => (r.raw as { of?: string } | null)?.of === reference).reduce((sum, r) => sum + r.amount, 0);

  // Card payments first: those are the ones we can refund without a person.
  const ordered = [...charges].sort((a, b) => Number(b.provider === "PAYSTACK") - Number(a.provider === "PAYSTACK"));

  let remaining = amount;
  let automatic = 0;
  let manual = 0;

  for (const charge of ordered) {
    if (remaining <= 0) break;
    const available = charge.amount - refundedOf(charge.reference);
    const portion = Math.min(available, remaining);
    if (portion <= 0) continue;

    let auto = false;
    let error: string | null = null;
    if (charge.provider === "PAYSTACK" && paystackConfigured()) {
      try {
        await refundTransaction({ reference: charge.reference, amountNaira: portion, note });
        auto = true;
      } catch (e) {
        error = e instanceof Error ? e.message : "Refund request failed";
      }
    }

    await prisma.payment.create({
      data: {
        bookingId,
        reference: `RF-${randomUUID().slice(0, 12)}`,
        provider: charge.provider,
        kind,
        amount: portion,
        status: auto ? "SUCCESS" : "PENDING",
        channel: auto ? "paystack" : "manual",
        paidAt: auto ? new Date() : null,
        raw: { of: charge.reference, note, ...(error ? { error } : {}) } as Prisma.InputJsonValue,
      },
    });
    remaining -= portion;
    if (auto) automatic += portion;
    else manual += portion;
  }
  return { automatic, manual };
}

/** The host sent a manual refund (bank transfer, cash or a failed card refund). */
export async function markRefundSent(paymentId: string): Promise<void> {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p || p.kind === "CHARGE") throw new ApiError(404, "Refund not found.");
  if (p.status === "SUCCESS") return;
  await prisma.payment.update({ where: { id: paymentId }, data: { status: "SUCCESS", paidAt: new Date() } });
}

// ───────────────────────── cancelling ─────────────────────────

export type CancelResult = { refundTotal: number; stayRefund: number; cautionRefund: number; note: string };

/**
 * Cancels a booking and sends the refund the policy allows.
 * `by: "guest"` follows the apartment's cancellation policy. `by: "admin"` refunds everything unless told otherwise.
 */
export async function cancelBooking(args: { bookingId: string; by: "guest" | "admin"; reason?: string; refund?: "policy" | "full" | "none" }): Promise<CancelResult> {
  const [b, settings] = await Promise.all([loadBooking(args.bookingId), getSettings()]);
  if (b.status !== "PENDING" && b.status !== "CONFIRMED") throw new ApiError(400, "This booking can't be cancelled any more.");

  const mode = args.refund ?? (args.by === "guest" ? "policy" : "full");
  const cautionPaid = Math.min(b.amountPaid, b.cautionFee);
  const stayPaid = Math.max(0, b.amountPaid - cautionPaid);

  let stayRefund = 0;
  let note = "";
  if (mode === "policy") {
    const q = quoteRefund({ policy: b.cancellationPolicy, checkIn: toISODate(b.checkIn), checkInTime: b.apartment.checkInTime, amountPaid: b.amountPaid, cautionFee: b.cautionFee, settings });
    if (!q.canCancel) throw new ApiError(400, q.note);
    stayRefund = q.stayRefund;
    note = q.note;
  } else if (mode === "full") {
    stayRefund = stayPaid;
    note = "Full refund.";
  } else {
    note = "Stay is non-refundable; caution returned.";
  }
  const cautionRefund = cautionPaid; // the caution always comes back
  const refundTotal = stayRefund + cautionRefund;

  await prisma.booking.update({
    where: { id: b.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: args.reason?.slice(0, 300) || (args.by === "guest" ? "Cancelled by guest" : "Cancelled by host"),
      refundAmount: refundTotal,
      paymentStatus: b.amountPaid > 0 && refundTotal >= b.amountPaid ? "REFUNDED" : b.paymentStatus,
      cautionStatus: cautionRefund > 0 ? "REFUNDED" : "NONE",
      cautionRefundedAt: cautionRefund > 0 ? new Date() : null,
      holdExpiresAt: null,
    },
  });

  await issueRefunds(b.id, stayRefund, "REFUND", `Cancelled: ${note}`);
  await issueRefunds(b.id, cautionRefund, "CAUTION_REFUND", "Caution fee returned");

  const first = b.guestName.split(" ")[0];
  const mail = simpleEmail(
    "Your booking is cancelled",
    [
      `Hi ${first}, booking ${b.code} for ${b.apartment.title} has been cancelled.`,
      refundTotal > 0 ? `We're refunding ₦${refundTotal.toLocaleString("en-NG")} (${note}). Card refunds usually take 5 to 10 working days.` : "No payment had been made, so nothing is refunded.",
    ],
    { label: "View booking", href: `${siteUrl()}/checkout/success?code=${b.code}&token=${b.accessToken}` },
  );
  await sendEmail({ to: b.guestEmail, subject: `Booking ${b.code} cancelled`, ...mail });

  return { refundTotal, stayRefund, cautionRefund, note };
}

// ───────────────────────── admin actions ─────────────────────────

/** Confirms a pending booking: verifies a bank transfer, approves a paid request, or accepts an unpaid one. */
export async function adminConfirmBooking(bookingId: string): Promise<void> {
  const b = await loadBooking(bookingId);
  if (b.status !== "PENDING") throw new ApiError(400, "Only pending bookings can be confirmed.");

  const pendingTransfer = b.payments.filter((p) => p.kind === "CHARGE" && p.status === "PENDING" && p.provider === "BANK_TRANSFER").at(-1);
  if (pendingTransfer) {
    await finalizePayment(pendingTransfer.id, { channel: "bank_transfer", confirmedBy: "admin" });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await lockApartment(tx, b.apartmentId);
    const clash = await hasConflict(tx, b.apartmentId, toISODate(b.checkIn), toISODate(b.checkOut), { excludeBookingId: b.id });
    if (clash.conflict) throw new ApiError(409, "Those dates are no longer free, so this booking can't be confirmed.");
    await tx.booking.update({ where: { id: b.id }, data: { status: "CONFIRMED", holdExpiresAt: null } });
  });
  await notifyBooking(toMailBooking(await loadBooking(bookingId)));
}

/** Declines a booking and returns any money paid. */
export async function adminRejectBooking(bookingId: string, reason?: string): Promise<void> {
  const b = await loadBooking(bookingId);
  if (b.status !== "PENDING") throw new ApiError(400, "Only pending bookings can be rejected.");
  const paid = b.amountPaid;
  await prisma.booking.update({
    where: { id: b.id },
    data: { status: "REJECTED", cancelReason: reason?.slice(0, 300) || "Declined by host", cancelledAt: new Date(), holdExpiresAt: null, refundAmount: paid, paymentStatus: paid > 0 ? "REFUNDED" : b.paymentStatus, cautionStatus: b.cautionStatus === "HELD" ? "REFUNDED" : b.cautionStatus },
  });
  await prisma.payment.updateMany({ where: { bookingId: b.id, kind: "CHARGE", status: "PENDING" }, data: { status: "FAILED" } });
  const cautionPart = Math.min(paid, b.cautionFee);
  await issueRefunds(b.id, paid - cautionPart, "REFUND", "Booking declined");
  await issueRefunds(b.id, cautionPart, "CAUTION_REFUND", "Booking declined");

  const mail = simpleEmail("We couldn't confirm your booking", [
    `Hi ${b.guestName.split(" ")[0]}, we're sorry: we couldn't confirm booking ${b.code} for ${b.apartment.title}.${reason ? ` ${reason}` : ""}`,
    paid > 0 ? "Everything you paid is being refunded." : "You haven't been charged.",
  ]);
  await sendEmail({ to: b.guestEmail, subject: `Booking ${b.code} not confirmed`, ...mail });
}

export async function markCheckedIn(bookingId: string): Promise<void> {
  const b = await loadBooking(bookingId);
  if (b.status !== "CONFIRMED") throw new ApiError(400, "Only confirmed bookings can be checked in.");
  if (b.paymentStatus === "UNPAID") throw new ApiError(400, "Collect payment before checking the guest in.");
  await prisma.booking.update({ where: { id: b.id }, data: { status: "CHECKED_IN", checkedInAt: new Date() } });
}

export async function markCheckedOut(bookingId: string): Promise<void> {
  const b = await loadBooking(bookingId);
  if (b.status !== "CHECKED_IN") throw new ApiError(400, "Only guests who are checked in can be checked out.");
  await prisma.booking.update({ where: { id: b.id }, data: { status: "CHECKED_OUT", checkedOutAt: new Date() } });
}

/** Cash, POS or an in-person transfer, for example the balance on arrival. */
export async function recordManualPayment(args: { bookingId: string; amount: number; method: "CASH" | "POS" | "TRANSFER"; note?: string }): Promise<void> {
  const b = await loadBooking(args.bookingId);
  if (b.status === "CANCELLED" || b.status === "REJECTED") throw new ApiError(400, "This booking is cancelled.");
  const owed = b.total - b.amountPaid;
  if (args.amount <= 0 || args.amount > owed) throw new ApiError(400, `Enter an amount up to ₦${owed.toLocaleString("en-NG")}.`);

  const payment = await prisma.payment.create({
    data: { bookingId: b.id, reference: `MN-${randomUUID().slice(0, 12)}`, provider: args.method, kind: "CHARGE", amount: args.amount, status: "PENDING", channel: args.method.toLowerCase(), raw: { note: args.note ?? null } as Prisma.InputJsonValue },
  });
  await finalizePayment(payment.id, { channel: args.method.toLowerCase(), confirmedBy: "admin" });
}

/** Returns the caution fee after checkout, less any deduction for damage. */
export async function refundCaution(args: { bookingId: string; deduction?: number; reason?: string }): Promise<{ refunded: number; retained: number }> {
  const b = await loadBooking(args.bookingId);
  if (b.cautionStatus !== "HELD") throw new ApiError(400, "There is no caution fee being held for this booking.");
  if (b.status !== "CHECKED_OUT" && b.status !== "COMPLETED") throw new ApiError(400, "Check the guest out before refunding the caution fee.");

  const held = Math.min(b.cautionFee, b.amountPaid);
  const deduction = Math.min(Math.max(0, args.deduction ?? 0), held);
  if (deduction > 0 && !args.reason?.trim()) throw new ApiError(400, "Add a reason for the deduction.");
  const refunded = held - deduction;

  await prisma.booking.update({
    where: { id: b.id },
    data: {
      cautionStatus: refunded > 0 ? "REFUNDED" : "RETAINED",
      cautionRefundedAt: new Date(),
      adminNotes: deduction > 0 ? [b.adminNotes, `Caution: ₦${deduction.toLocaleString("en-NG")} kept. ${args.reason}`].filter(Boolean).join("\n") : b.adminNotes,
    },
  });
  await issueRefunds(b.id, refunded, "CAUTION_REFUND", deduction > 0 ? `Caution returned less ₦${deduction}` : "Caution fee returned");

  if (refunded > 0) {
    const mail = simpleEmail("Your caution fee is on its way", [
      `Hi ${b.guestName.split(" ")[0]}, thank you for staying at ${b.apartment.title}.`,
      `We're returning ₦${refunded.toLocaleString("en-NG")} of your caution fee${deduction > 0 ? ` (₦${deduction.toLocaleString("en-NG")} was kept: ${args.reason})` : ""}.`,
    ]);
    await sendEmail({ to: b.guestEmail, subject: `Caution fee returned (${b.code})`, ...mail });
  }
  return { refunded, retained: deduction };
}

// ───────────────────────── housekeeping (run by cron and on dashboard loads) ─────────────────────────

/** Moves finished stays to COMPLETED, which is what unlocks reviews. */
export async function completeFinishedBookings(): Promise<number> {
  const today = parseISODate(todayISO());
  const dayBefore = parseISODate(addDays(todayISO(), -1));
  const [a, b] = await prisma.$transaction([
    prisma.booking.updateMany({ where: { status: "CHECKED_OUT", checkOut: { lte: today } }, data: { status: "COMPLETED" } }),
    // Staff forgot to tick check-in or check-out: a paid stay that ended yesterday is complete.
    prisma.booking.updateMany({ where: { status: { in: ["CONFIRMED", "CHECKED_IN"] }, paymentStatus: { in: ["PAID", "PARTIAL"] }, checkOut: { lte: dayBefore } }, data: { status: "COMPLETED" } }),
  ]);
  return a.count + b.count;
}

/** Releases dates held by guests who never paid, and declines paid requests the host never answered. */
export async function expireStaleHolds(): Promise<{ released: number; declined: number }> {
  const now = new Date();
  const stale = await prisma.booking.findMany({ where: { status: "PENDING", holdExpiresAt: { lt: now } }, select: { id: true, amountPaid: true } });
  let released = 0;
  let declined = 0;
  for (const s of stale) {
    if (s.amountPaid > 0) {
      await adminRejectBooking(s.id, "The host didn't respond in time.").catch((e) => console.error("[expire] decline failed", s.id, e));
      declined++;
    } else {
      await prisma.booking.update({ where: { id: s.id }, data: { status: "CANCELLED", cancelledAt: now, cancelReason: "Payment wasn't completed in time.", holdExpiresAt: null } });
      await prisma.payment.updateMany({ where: { bookingId: s.id, status: "PENDING", proofUrl: null }, data: { status: "FAILED" } });
      released++;
    }
  }
  return { released, declined };
}
