// Input schemas shared by route handlers and client forms.
// Messages are written for the person filling the form: they say what to fix, not what failed.

import { z } from "zod";
import { isISODate } from "./dates";
import { normalizePhone } from "./format";

export const isoDate = z.string().refine(isISODate, "Choose a valid date.");

export const phoneField = z
  .string()
  .trim()
  .min(1, "Enter a phone number.")
  .transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number, like 0803 123 4567." });
      return z.NEVER;
    }
    return phone;
  });

export const emailField = z.string().trim().toLowerCase().email("Enter a valid email address.").max(120);

export const ID_TYPES = ["NIN", "PASSPORT", "DRIVERS_LICENSE", "VOTERS_CARD"] as const;

export const guestDetailsSchema = z.object({
  guestName: z.string().trim().min(2, "Enter your full name.").max(80),
  guestEmail: emailField,
  guestPhone: phoneField,
  guestWhatsapp: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const p = normalizePhone(v);
      if (!p) {
        ctx.addIssue({ code: "custom", message: "Enter a valid WhatsApp number." });
        return z.NEVER;
      }
      return p;
    }),
  idType: z.enum(ID_TYPES, { errorMap: () => ({ message: "Choose an ID type." }) }),
  idNumber: z
    .string()
    .trim()
    .min(5, "Enter your ID number.")
    .max(30)
    .regex(/^[A-Za-z0-9\- /]+$/, "ID numbers use letters and digits only."),
  specialRequests: z
    .string()
    .trim()
    .max(500, "Keep special requests under 500 characters.")
    .optional()
    .transform((v) => v || null),
});

export const bookingRequestSchema = guestDetailsSchema.extend({
  apartmentId: z.string().min(1),
  checkIn: isoDate,
  checkOut: isoDate,
  guests: z.number().int().min(1, "At least one guest.").max(20),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .max(32)
    .optional()
    .transform((v) => v || null),
  /** FULL pays everything now. DEPOSIT is "pay on arrival": half the stay plus the caution now. */
  paymentOption: z.enum(["FULL", "DEPOSIT"]),
  paymentMethod: z.enum(["PAYSTACK", "BANK_TRANSFER"]),
});
export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export const quoteRequestSchema = z.object({
  apartmentId: z.string().min(1),
  checkIn: isoDate,
  checkOut: isoDate,
  guests: z.number().int().min(1).max(20).optional(),
  couponCode: z.string().trim().toUpperCase().max(32).optional(),
  paymentOption: z.enum(["FULL", "DEPOSIT"]).optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: emailField,
  phone: phoneField.optional().or(z.literal("").transform(() => undefined)),
  password: z.string().min(8, "Use at least 8 characters.").max(100),
});

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1, "Choose a star rating.").max(5),
  comment: z.string().trim().min(10, "Tell future guests a little more (10 characters or more).").max(1500),
});
