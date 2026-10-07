// NextAuth configuration.
// Three ways in: email + password, Google, and a phone number confirmed with an SMS one-time code.
// Sessions are JWTs (no session table), carrying the user id and role so middleware can gate /admin.

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "node:crypto";
import { hasDb, prisma } from "./prisma";
import { normalizePhone } from "./format";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export function hashOtp(phone: string, code: string): string {
  return createHash("sha256").update(`${process.env.NEXTAUTH_SECRET ?? "dev"}:${phone}:${code}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and password",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(creds) {
        if (!hasDb || !creds?.email || !creds.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email.toLowerCase().trim() } });
        if (!user?.passwordHash || user.isBlacklisted) return null;
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role };
      },
    }),
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone number",
      credentials: { phone: { type: "text" }, code: { type: "text" } },
      async authorize(creds) {
        if (!hasDb || !creds?.phone || !creds.code) return null;
        const phone = normalizePhone(creds.phone);
        if (!phone) return null;

        const otp = await prisma.otp.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
        if (!otp || otp.expiresAt < new Date() || otp.attempts >= OTP_MAX_ATTEMPTS) return null;

        const valid = safeEqual(otp.codeHash, hashOtp(phone, creds.code.trim()));
        if (!valid) {
          await prisma.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
          return null;
        }
        await prisma.otp.deleteMany({ where: { phone } });

        const user = await prisma.user.upsert({
          where: { phone },
          update: { phoneVerified: new Date() },
          create: { phone, phoneVerified: new Date() },
        });
        if (user.isBlacklisted) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role };
      },
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true, // Google has verified the address
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!hasDb || !user.email) return false;
      const email = user.email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing?.isBlacklisted) return false;
      if (existing) {
        await prisma.user.update({ where: { id: existing.id }, data: { emailVerified: existing.emailVerified ?? new Date(), image: existing.image ?? user.image ?? null, name: existing.name ?? user.name ?? null } });
      } else {
        await prisma.user.create({ data: { email, name: user.name ?? null, image: user.image ?? null, emailVerified: new Date() } });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // First sign-in: copy identity and role into the token. For Google we look the user up by email.
      if (user) {
        if (account?.provider === "google" && user.email) {
          const row = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
          token.uid = row?.id;
          token.role = row?.role ?? "GUEST";
        } else {
          token.uid = user.id;
          token.role = user.role ?? "GUEST";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid ?? "";
        session.user.role = token.role ?? "GUEST";
      }
      return session;
    },
  },
};
