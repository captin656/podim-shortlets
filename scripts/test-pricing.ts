// Run with: npm run test:pricing
import assert from "node:assert/strict";
import { calculatePrice, type PricingConfig } from "../lib/pricing";
import { quoteRefund } from "../lib/cancellation";
import { diffNights, eachNight, overlaps } from "../lib/dates";

const cfg: PricingConfig = {
  pricePerNight: 45_000,
  weekendPrice: 55_000,
  weeklyDiscount: 10,
  monthlyDiscount: 20,
  cleaningFee: 10_000,
  cautionFee: 20_000,
  minNights: 1,
  maxNights: 60,
  seasonal: [{ name: "Festive season", startDate: "2026-12-20", endDate: "2027-01-05", pricePerNight: 80_000, weekendPrice: null }],
};
const fees = { serviceFeePercent: 5, taxPercent: 0 };

// 2026-10-07 is a Wednesday. Wed + Thu nights → two weeknights.
let p = calculatePrice(cfg, fees, "2026-10-07", "2026-10-09");
assert.ok(p.ok);
assert.equal(p.accommodation, 90_000);
assert.equal(p.serviceFee, 4_500);
assert.equal(p.total, 90_000 + 4_500 + 10_000 + 20_000);
assert.equal(p.cautionFee, 20_000);

// Thu → Sun: Thu (weeknight), Fri + Sat (weekend), Sun (weeknight). Checkout on Sunday is excluded.
p = calculatePrice(cfg, fees, "2026-10-08", "2026-10-11");
assert.ok(p.ok);
assert.deepEqual(p.nightly.map((n) => n.rate), [45_000, 55_000, 55_000]);
assert.equal(p.accommodation, 155_000);

// Weekly discount kicks in at 7 nights, on accommodation only.
p = calculatePrice(cfg, fees, "2026-10-12", "2026-10-19");
assert.ok(p.ok);
assert.equal(p.nights, 7);
assert.equal(p.discountPercent, 10);
assert.equal(p.discountAmount, Math.round(p.accommodation * 0.1));

// Monthly discount beats weekly at 28 nights.
p = calculatePrice(cfg, fees, "2026-11-02", "2026-11-30");
assert.ok(p.ok);
assert.equal(p.discountPercent, 20);

// Seasonal pricing overrides weekday and weekend rates.
p = calculatePrice(cfg, fees, "2026-12-22", "2026-12-26");
assert.ok(p.ok);
assert.ok(p.nightly.every((n) => n.rate === 80_000 && n.kind === "seasonal"));

// Coupons: percent comes off the discounted accommodation, never the caution.
p = calculatePrice(cfg, fees, "2026-10-07", "2026-10-09", { code: "WELCOME10", type: "PERCENT", value: 10 });
assert.ok(p.ok);
assert.equal(p.couponDiscount, 9_000);
assert.equal(p.cautionFee, 20_000);

// Fixed coupon cannot exceed the accommodation.
p = calculatePrice(cfg, fees, "2026-10-07", "2026-10-08", { code: "BIG", type: "FIXED", value: 999_999 });
assert.ok(p.ok);
assert.equal(p.couponDiscount, 45_000);

// Deposit option: half the stay plus the whole caution now.
p = calculatePrice(cfg, fees, "2026-10-07", "2026-10-09", null, "DEPOSIT");
assert.ok(p.ok);
assert.equal(p.payNow, Math.ceil(p.stayTotal / 2) + 20_000);
assert.equal(p.payNow + p.balanceDue, p.total);

// Validation
assert.equal(calculatePrice(cfg, fees, "2026-10-09", "2026-10-09").ok, false);
assert.equal(calculatePrice({ ...cfg, minNights: 2 }, fees, "2026-10-09", "2026-10-10").ok, false);

// Date helpers
assert.equal(diffNights("2026-10-01", "2026-10-04"), 3);
assert.deepEqual(eachNight("2026-10-30", "2026-11-02"), ["2026-10-30", "2026-10-31", "2026-11-01"]);
assert.equal(overlaps("2026-10-01", "2026-10-05", "2026-10-05", "2026-10-08"), false); // back-to-back stays are fine
assert.equal(overlaps("2026-10-01", "2026-10-05", "2026-10-04", "2026-10-08"), true);

// Cancellation
const now = new Date("2026-10-01T10:00:00+01:00");
let q = quoteRefund({ policy: "FLEXIBLE", checkIn: "2026-10-10", checkInTime: "14:00", amountPaid: 100_000, cautionFee: 20_000, now });
assert.equal(q.stayRefund, 80_000);
assert.equal(q.cautionRefund, 20_000);
q = quoteRefund({ policy: "FLEXIBLE", checkIn: "2026-10-02", checkInTime: "14:00", amountPaid: 100_000, cautionFee: 20_000, now });
assert.equal(q.stayRefund, 0);
assert.equal(q.cautionRefund, 20_000);
q = quoteRefund({ policy: "MODERATE", checkIn: "2026-10-10", checkInTime: "14:00", amountPaid: 100_000, cautionFee: 20_000, now });
assert.equal(q.stayRefund, 40_000);
q = quoteRefund({ policy: "MODERATE", checkIn: "2026-10-04", checkInTime: "14:00", amountPaid: 100_000, cautionFee: 20_000, now });
assert.equal(q.stayRefund, 0);
q = quoteRefund({ policy: "STRICT", checkIn: "2026-12-10", checkInTime: "14:00", amountPaid: 100_000, cautionFee: 20_000, now });
assert.equal(q.stayRefund, 0);
assert.equal(q.totalRefund, 20_000);

console.log("pricing, dates and cancellation: all checks passed");
