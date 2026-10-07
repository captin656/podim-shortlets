// Thin Paystack client. Amounts in this codebase are whole naira; Paystack wants kobo, so we convert here.

import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "./api";

const BASE = "https://api.paystack.co";

export const paystackConfigured = () => Boolean(process.env.PAYSTACK_SECRET_KEY);

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new ApiError(503, "Card payments are not set up yet. Choose bank transfer or contact us.");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || body.status === false) {
    throw new ApiError(502, body.message ? `Payment provider: ${body.message}` : "The payment provider is unavailable. Please try again.");
  }
  return body.data as T;
}

export type PaystackInit = { authorization_url: string; access_code: string; reference: string };

export function initializeTransaction(args: { email: string; amountNaira: number; reference: string; callbackUrl: string; metadata?: Record<string, unknown> }) {
  return call<PaystackInit>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: args.email,
      amount: Math.round(args.amountNaira * 100),
      currency: "NGN",
      reference: args.reference,
      callback_url: args.callbackUrl,
      channels: ["card", "bank", "ussd", "bank_transfer"],
      metadata: args.metadata ?? {},
    }),
  });
}

export type PaystackVerify = {
  status: "success" | "failed" | "abandoned" | "pending" | "ongoing" | "reversed";
  reference: string;
  amount: number; // kobo
  currency: string;
  channel: string | null;
  paid_at: string | null;
};

export function verifyTransaction(reference: string) {
  return call<PaystackVerify>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export function refundTransaction(args: { reference: string; amountNaira: number; note?: string }) {
  return call<{ status: string }>("/refund", {
    method: "POST",
    body: JSON.stringify({ transaction: args.reference, amount: Math.round(args.amountNaira * 100), customer_note: args.note, merchant_note: args.note }),
  });
}

/** Paystack signs the raw request body with your secret key (HMAC SHA-512). */
export function validSignature(rawBody: string, signature: string | null): boolean {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !signature) return false;
  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
