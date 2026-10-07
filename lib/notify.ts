// Email (SMTP) and SMS (Termii). Neither is required to run the site: when a service is not
// configured the message is logged instead, so a missing key never breaks a booking.

import nodemailer from "nodemailer";
import { formatNGN } from "./format";
import { formatRange } from "./dates";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

let transport: nodemailer.Transporter | null = null;
function mailer() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PASSWORD) return null;
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  return transport;
}

export async function sendEmail(args: { to: string; subject: string; html: string; text?: string; replyTo?: string; attachments?: { filename: string; content: Buffer }[] }): Promise<boolean> {
  const t = mailer();
  if (!t) {
    console.info(`[email skipped: SMTP not configured] to=${args.to} subject="${args.subject}"`);
    return false;
  }
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM ?? "Podium Apartments <stay@podiumapartments.ng>", ...args });
    return true;
  } catch (e) {
    console.error("[email failed]", e);
    return false;
  }
}

export async function sendSms(to: string, message: string): Promise<boolean> {
  const key = process.env.TERMII_API_KEY;
  if (!key) {
    console.info(`[sms skipped: Termii not configured] to=${to} message="${message}"`);
    return false;
  }
  try {
    const res = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: to.replace(/^\+/, ""),
        from: process.env.TERMII_SENDER_ID ?? "Podium",
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: key,
      }),
    });
    if (!res.ok) console.error("[sms failed]", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("[sms failed]", e);
    return false;
  }
}

// ───────────────────────── templates ─────────────────────────

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="font-size:20px;font-weight:700;letter-spacing:-0.02em;margin:0 0 20px">Podium<span style="color:#f97316">.</span></p>
<div style="background:#fff;border-radius:24px;padding:32px">
<h1 style="font-size:26px;letter-spacing:-0.03em;margin:0 0 16px">${esc(title)}</h1>${body}</div>
<p style="font-size:12px;color:#64748b;margin:20px 8px">Podium Apartments, Transekulu, Enugu. Replies to this email reach our team.</p>
</div></body></html>`;
}

export type MailBooking = {
  code: string;
  accessToken: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  apartmentTitle: string;
  address: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  nights: number;
  total: number;
  amountPaid: number;
  cautionFee: number;
  balanceDue: number;
  instructions: { gateCode: string | null; wifiName: string | null; wifiPassword: string | null; arrivalNotes: string | null } | null;
  confirmed: boolean;
};

const row = (k: string, v: string) => `<tr><td style="padding:6px 0;color:#64748b">${esc(k)}</td><td style="padding:6px 0;text-align:right;font-weight:600">${esc(v)}</td></tr>`;

export function bookingEmail(b: MailBooking): { subject: string; html: string; text: string } {
  const link = `${siteUrl()}/checkout/success?code=${b.code}&token=${b.accessToken}`;
  const subject = b.confirmed ? `Booking confirmed: ${b.apartmentTitle} (${b.code})` : `We received your booking request (${b.code})`;
  const ins = b.instructions;
  const insHtml = ins
    ? `<h2 style="font-size:18px;margin:28px 0 8px">Check-in instructions</h2>
<table style="width:100%;border-collapse:collapse;font-size:15px">${[ins.gateCode && row("Gate code", ins.gateCode), ins.wifiName && row("Wi-Fi", ins.wifiName), ins.wifiPassword && row("Wi-Fi password", ins.wifiPassword)].filter(Boolean).join("")}</table>
${ins.arrivalNotes ? `<p style="font-size:15px;line-height:1.5;color:#334155">${esc(ins.arrivalNotes)}</p>` : ""}`
    : "";
  const html = shell(
    b.confirmed ? "You’re booked." : "Request received.",
    `<p style="font-size:16px;line-height:1.5;color:#334155;margin:0 0 20px">Hi ${esc(b.guestName.split(" ")[0])}, ${
      b.confirmed ? `your stay at <b>${esc(b.apartmentTitle)}</b> is confirmed.` : `we’ve received your request for <b>${esc(b.apartmentTitle)}</b>. We’ll confirm shortly.`
    }</p>
<table style="width:100%;border-collapse:collapse;font-size:15px">
${row("Booking code", b.code)}${row("Dates", formatRange(b.checkIn, b.checkOut))}${row("Nights", String(b.nights))}
${row("Check-in", `from ${b.checkInTime}`)}${row("Check-out", `by ${b.checkOutTime}`)}${row("Address", b.address)}
${row("Total", formatNGN(b.total))}${row("Paid so far", formatNGN(b.amountPaid))}${b.balanceDue > 0 ? row("Balance on arrival", formatNGN(b.balanceDue)) : ""}
</table>
<p style="font-size:13px;color:#64748b">Your ${formatNGN(b.cautionFee)} caution fee is refundable after checkout.</p>
${insHtml}
<p style="margin:28px 0 0"><a href="${link}" style="background:#0f172a;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:600;display:inline-block">View booking and invoice</a></p>`,
  );
  const text = `${subject}\n\n${b.apartmentTitle}\n${formatRange(b.checkIn, b.checkOut)} (${b.nights} nights)\nTotal ${formatNGN(b.total)}, paid ${formatNGN(b.amountPaid)}\n${ins?.gateCode ? `Gate code: ${ins.gateCode}\n` : ""}${link}`;
  return { subject, html, text };
}

export function bookingSms(b: MailBooking): string {
  const base = b.confirmed
    ? `Podium: booking ${b.code} confirmed. ${b.apartmentTitle}, ${formatRange(b.checkIn, b.checkOut)}.`
    : `Podium: we received booking request ${b.code} for ${b.apartmentTitle}. We will confirm shortly.`;
  return b.instructions?.gateCode ? `${base} Gate code ${b.instructions.gateCode}. Details: ${siteUrl()}/checkout/success?code=${b.code}&token=${b.accessToken}` : base;
}

export async function notifyBooking(b: MailBooking): Promise<void> {
  const mail = bookingEmail(b);
  await Promise.allSettled([sendEmail({ to: b.guestEmail, ...mail }), sendSms(b.guestPhone, bookingSms(b))]);
}

export function simpleEmail(title: string, paragraphs: string[], cta?: { label: string; href: string }): { html: string; text: string } {
  const html = shell(title, `${paragraphs.map((p) => `<p style="font-size:16px;line-height:1.5;color:#334155;margin:0 0 14px">${esc(p)}</p>`).join("")}${cta ? `<p style="margin:24px 0 0"><a href="${cta.href}" style="background:#0f172a;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:600;display:inline-block">${esc(cta.label)}</a></p>` : ""}`);
  return { html, text: `${title}\n\n${paragraphs.join("\n\n")}${cta ? `\n\n${cta.href}` : ""}` };
}
