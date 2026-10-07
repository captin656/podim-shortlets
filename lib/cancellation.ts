import { checkInMoment } from "./dates";

export type PolicyKey = "FLEXIBLE" | "MODERATE" | "STRICT";

export type PolicySettings = {
  flexibleFreeHours: number;
  moderateDays: number;
  moderateRefundPercent: number;
};

export const DEFAULT_POLICY_SETTINGS: PolicySettings = {
  flexibleFreeHours: 48,
  moderateDays: 5,
  moderateRefundPercent: 50,
};

export function describePolicy(policy: PolicyKey, s: PolicySettings = DEFAULT_POLICY_SETTINGS): { title: string; summary: string; detail: string } {
  switch (policy) {
    case "FLEXIBLE":
      return {
        title: "Flexible",
        summary: `Free cancellation until ${s.flexibleFreeHours} hours before check-in.`,
        detail: `Cancel at least ${s.flexibleFreeHours} hours before check-in and you get every naira of the stay back. After that, the stay is non-refundable. Your caution fee is always returned in full.`,
      };
    case "MODERATE":
      return {
        title: "Moderate",
        summary: `${s.moderateRefundPercent}% refund until ${s.moderateDays} days before check-in.`,
        detail: `Cancel at least ${s.moderateDays} days before check-in and ${s.moderateRefundPercent}% of the stay is refunded. After that, the stay is non-refundable. Your caution fee is always returned in full.`,
      };
    case "STRICT":
      return {
        title: "Strict",
        summary: "No refund on the stay once booked.",
        detail: "The stay is non-refundable after booking. Your caution fee is always returned in full.",
      };
  }
}

export type RefundQuote = {
  canCancel: boolean;
  hoursBeforeCheckIn: number;
  refundPercent: number;
  stayRefund: number;
  cautionRefund: number;
  totalRefund: number;
  note: string;
};

export function quoteRefund(args: {
  policy: PolicyKey;
  checkIn: string;
  checkInTime: string;
  amountPaid: number;
  cautionFee: number;
  settings?: PolicySettings;
  now?: Date;
}): RefundQuote {
  const { policy, checkIn, checkInTime, amountPaid, cautionFee } = args;
  const s = args.settings ?? DEFAULT_POLICY_SETTINGS;
  const now = args.now ?? new Date();

  const hours = (checkInMoment(checkIn, checkInTime).getTime() - now.getTime()) / 3_600_000;

  // Once the stay has started, only the host can cancel.
  if (hours <= 0) {
    return { canCancel: false, hoursBeforeCheckIn: hours, refundPercent: 0, stayRefund: 0, cautionRefund: 0, totalRefund: 0, note: "The stay has already started. Contact us to make changes." };
  }

  let percent = 0;
  if (policy === "FLEXIBLE" && hours >= s.flexibleFreeHours) percent = 100;
  if (policy === "MODERATE" && hours >= s.moderateDays * 24) percent = s.moderateRefundPercent;

  // Caution is paid first in our accounting, so what is left was paid towards the stay.
  const cautionPaid = Math.min(amountPaid, cautionFee);
  const stayPaid = Math.max(0, amountPaid - cautionPaid);
  const stayRefund = Math.round((stayPaid * percent) / 100);

  return {
    canCancel: true,
    hoursBeforeCheckIn: hours,
    refundPercent: percent,
    stayRefund,
    cautionRefund: cautionPaid,
    totalRefund: stayRefund + cautionPaid,
    note: percent === 100 ? "Full refund of the stay." : percent > 0 ? `${percent}% of the stay is refunded.` : "The stay is non-refundable at this point.",
  };
}
