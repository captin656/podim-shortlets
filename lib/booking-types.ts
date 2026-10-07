// Booking shapes that pages and client components consume. No Prisma imports here, so this file is safe anywhere.

import type { NightRate } from "./pricing";
import type { PolicyKey } from "./types";
import type { RefundQuote } from "./cancellation";

export type BookingStatusKey = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "COMPLETED" | "CANCELLED" | "REJECTED";
export type PaymentStatusKey = "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED";

export type CheckInInstructions = {
  gateCode: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  arrivalNotes: string | null;
};

export type PaymentView = {
  id: string;
  reference: string;
  provider: string;
  kind: "CHARGE" | "REFUND" | "CAUTION_REFUND";
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  channel: string | null;
  proofUrl: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type BookingView = {
  id: string;
  code: string;
  token: string;
  status: BookingStatusKey;
  paymentStatus: PaymentStatusKey;
  paymentOption: "FULL" | "DEPOSIT";
  paymentMethod: "PAYSTACK" | "BANK_TRANSFER";
  cautionStatus: "NONE" | "HELD" | "REFUNDED" | "RETAINED";
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  createdAt: string;
  guest: { name: string; email: string; phone: string; whatsapp: string | null; idType: string; idNumberMasked: string };
  apartment: {
    id: string;
    slug: string;
    title: string;
    address: string;
    area: string;
    city: string;
    image: string | null;
    checkInTime: string;
    checkOutTime: string;
    hostName: string;
    hostPhone: string | null;
    lat: number;
    lng: number;
  };
  price: {
    nightly: NightRate[];
    accommodation: number;
    discountLabel: string | null;
    discountAmount: number;
    couponCode: string | null;
    couponDiscount: number;
    cleaningFee: number;
    serviceFee: number;
    taxAmount: number;
    cautionFee: number;
    stayTotal: number;
    total: number;
    amountPaid: number;
    /** What the guest still owes (on arrival for deposit bookings). */
    balanceDue: number;
    /** What must be paid to hold the booking. */
    dueNow: number;
  };
  policy: PolicyKey;
  cancelledAt: string | null;
  cancelReason: string | null;
  refundAmount: number | null;
  holdExpiresAt: string | null;
  /** Gate code and Wi-Fi. Only present once payment has been received. */
  instructions: CheckInInstructions | null;
  awaitingProof: boolean;
  proofSubmitted: boolean;
  awaitingApproval: boolean;
  /** Present only when the booking can still be cancelled by the guest. */
  refundQuote: RefundQuote | null;
  canReview: boolean;
  hasReview: boolean;
  payments: PaymentView[];
};
