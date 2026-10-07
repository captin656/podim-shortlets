import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { ApiError } from "./api";
import { hasDb, prisma } from "./prisma";

export type Role = "GUEST" | "ADMIN" | "MANAGER" | "CLEANER" | "ACCOUNTANT";
export type SessionUser = { id: string; role: Role; name: string | null; email: string | null };

export const STAFF_ROLES: Role[] = ["ADMIN", "MANAGER", "CLEANER", "ACCOUNTANT"];
export const isStaffRole = (r: string | undefined | null): r is Role => STAFF_ROLES.includes(r as Role);

/** The signed-in user, re-checked against the database so a blacklisted or deleted account loses access at once. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const u = session?.user;
  if (!u?.id) return null;
  if (!hasDb) return { id: u.id, role: u.role, name: u.name ?? null, email: u.email ?? null };
  const row = await prisma.user.findUnique({ where: { id: u.id }, select: { id: true, role: true, name: true, email: true, isBlacklisted: true } });
  if (!row || row.isBlacklisted) return null;
  return { id: row.id, role: row.role, name: row.name, email: row.email };
}

/** For API routes: throws a 401 / 403 that `route()` turns into JSON. */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new ApiError(401, "Please sign in to continue.");
  return user;
}

export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) throw new ApiError(403, "You don't have access to this.");
  return user;
}

/** For server components and layouts: redirects instead of throwing. */
export async function pageUser(next: string): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function pageRole(allowed: Role[], next: string): Promise<SessionUser> {
  const user = await pageUser(next);
  if (!allowed.includes(user.role)) redirect(user.role === "GUEST" ? "/dashboard" : roleHome(user.role));
  return user;
}

/** Where each kind of staff member lands. */
export function roleHome(role: Role): string {
  if (role === "CLEANER") return "/admin/cleaning";
  if (role === "ACCOUNTANT") return "/admin/payments";
  if (role === "GUEST") return "/dashboard";
  return "/admin";
}

/** Which admin sections each role may open. Admin sidebar and route guards both read this. */
export const ADMIN_ACCESS: Record<string, Role[]> = {
  overview: ["ADMIN", "MANAGER"],
  apartments: ["ADMIN", "MANAGER"],
  bookings: ["ADMIN", "MANAGER"],
  cleaning: ["ADMIN", "MANAGER", "CLEANER"],
  payments: ["ADMIN", "MANAGER", "ACCOUNTANT"],
  customers: ["ADMIN", "MANAGER"],
  coupons: ["ADMIN", "MANAGER"],
  reviews: ["ADMIN", "MANAGER"],
  staff: ["ADMIN"],
  settings: ["ADMIN"],
};
