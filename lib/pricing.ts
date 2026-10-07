// The one pricing engine. The booking card, checkout and the server all call this
// same function, so the number a guest sees is the number that gets charged.
//
//   total = (sum of nightly rates − stay discount − coupon) + cleaning + service fee + tax + caution
//
// Caution is always separate, always refundable, and never discounted or taxed.

import { diffNights, eachNight, isWeekendNight } from "./dates";

export type SeasonalRule = {
  name: string;
  startDate: string; // inclusive
  endDate: string; // inclusive
  pricePerNight: number;
  weekendPrice: number | null;
};

export type PricingConfig = {
  pricePerNight: number;
  weekendPrice: number | null;
  weeklyDiscount: number; // percent, from 7 nights
  monthlyDiscount: number; // percent, from 28 nights
  cleaningFee: number;
  cautionFee: number;
  minNights: number;
  maxNights: number;
  seasonal: SeasonalRule[];
};

export type FeeSettings = {
  serviceFeePercent: number;
  taxPercent: number;
};

export type CouponRule = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
};

export type PaymentOptionKey = "FULL" | "DEPOSIT";

export type NightRate = {
  date: string;
  rate: number;
  kind: "regular" | "weekend" | "seasonal";
  label: string;
};

export type RateGroup = { label: string; kind: NightRate["kind"]; rate: number; nights: number; subtotal: number };

export type PriceBreakdown = {
  ok: true;
  nights: number;
  nightly: NightRate[];
  groups: RateGroup[];
  accommodation: number;
  discountLabel: string | null;
  discountPercent: number;
  discountAmount: number;
  couponCode: string | null;
  couponDiscount: number;
  cleaningFee: number;
  serviceFee: number;
  serviceFeePercent: number;
  taxAmount: number;
  taxPercent: number;
  cautionFee: number;
  /** Everything except the refundable caution. */
  stayTotal: number;
  total: number;
  payNow: number;
  balanceDue: number;
  averageNightly: number;
};

export type PriceError = { ok: false; error: string };

export const WEEKLY_MIN_NIGHTS = 7;
export const MONTHLY_MIN_NIGHTS = 28;

export function rateForNight(cfg: PricingConfig, date: string): NightRate {
  const weekend = isWeekendNight(date);

  // When several seasons overlap, the one that starts latest is the most specific.
  const season = cfg.seasonal
    .filter((s) => date >= s.startDate && date <= s.endDate)
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0];

  if (season) {
    const rate = weekend && season.weekendPrice ? season.weekendPrice : season.pricePerNight;
    return { date, rate, kind: "seasonal", label: season.name };
  }
  if (weekend && cfg.weekendPrice) {
    return { date, rate: cfg.weekendPrice, kind: "weekend", label: "Weekend (Fri–Sat)" };
  }
  return { date, rate: cfg.pricePerNight, kind: "regular", label: "Weeknight" };
}

export function calculatePrice(
  cfg: PricingConfig,
  fees: FeeSettings,
  checkIn: string,
  checkOut: string,
  coupon: CouponRule | null = null,
  option: PaymentOptionKey = "FULL",
): PriceBreakdown | PriceError {
  const nights = diffNights(checkIn, checkOut);
  if (!Number.isFinite(nights) || nights < 1) return { ok: false, error: "Check-out must be after check-in." };
  if (nights < cfg.minNights) return { ok: false, error: `Minimum stay is ${cfg.minNights} night${cfg.minNights === 1 ? "" : "s"}.` };
  if (nights > cfg.maxNights) return { ok: false, error: `Maximum stay is ${cfg.maxNights} nights.` };

  const nightly = eachNight(checkIn, checkOut).map((d) => rateForNight(cfg, d));
  const accommodation = nightly.reduce((sum, n) => sum + n.rate, 0);

  const groupMap = new Map<string, RateGroup>();
  for (const n of nightly) {
    const key = `${n.kind}:${n.label}:${n.rate}`;
    const g = groupMap.get(key) ?? { label: n.label, kind: n.kind, rate: n.rate, nights: 0, subtotal: 0 };
    g.nights += 1;
    g.subtotal += n.rate;
    groupMap.set(key, g);
  }

  let discountPercent = 0;
  let discountLabel: string | null = null;
  if (nights >= MONTHLY_MIN_NIGHTS && cfg.monthlyDiscount > 0) {
    discountPercent = cfg.monthlyDiscount;
    discountLabel = `Monthly stay discount (${discountPercent}%)`;
  } else if (nights >= WEEKLY_MIN_NIGHTS && cfg.weeklyDiscount > 0) {
    discountPercent = cfg.weeklyDiscount;
    discountLabel = `Weekly stay discount (${discountPercent}%)`;
  }
  const discountAmount = Math.round((accommodation * discountPercent) / 100);
  const afterDiscount = accommodation - discountAmount;

  let couponDiscount = 0;
  if (coupon) {
    couponDiscount =
      coupon.type === "PERCENT" ? Math.round((afterDiscount * Math.min(coupon.value, 100)) / 100) : Math.min(coupon.value, afterDiscount);
  }
  const discounted = afterDiscount - couponDiscount;

  const serviceFee = Math.round((discounted * fees.serviceFeePercent) / 100);
  const taxAmount = Math.round(((discounted + cfg.cleaningFee + serviceFee) * fees.taxPercent) / 100);
  const stayTotal = discounted + cfg.cleaningFee + serviceFee + taxAmount;
  const total = stayTotal + cfg.cautionFee;

  // Deposit option: half of the stay plus the whole caution now, the rest on arrival.
  const payNow = option === "DEPOSIT" ? Math.ceil(stayTotal / 2) + cfg.cautionFee : total;

  return {
    ok: true,
    nights,
    nightly,
    groups: [...groupMap.values()],
    accommodation,
    discountLabel,
    discountPercent,
    discountAmount,
    couponCode: coupon?.code ?? null,
    couponDiscount,
    cleaningFee: cfg.cleaningFee,
    serviceFee,
    serviceFeePercent: fees.serviceFeePercent,
    taxAmount,
    taxPercent: fees.taxPercent,
    cautionFee: cfg.cautionFee,
    stayTotal,
    total,
    payNow,
    balanceDue: total - payNow,
    averageNightly: Math.round(accommodation / nights),
  };
}

/** The lowest nightly rate guests could be charged, used for "from ₦X" labels. */
export function lowestRate(cfg: Pick<PricingConfig, "pricePerNight" | "weekendPrice">): number {
  return Math.min(cfg.pricePerNight, cfg.weekendPrice ?? cfg.pricePerNight);
}
