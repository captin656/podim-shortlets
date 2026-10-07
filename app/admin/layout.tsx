import type { Metadata } from "next";
import { AdminShell, type AdminNavItem } from "@/components/admin/AdminShell";
import { ADMIN_ACCESS, STAFF_ROLES, pageRole } from "@/lib/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Podium admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ITEMS: (AdminNavItem & { access: string })[] = [
  { href: "/admin", label: "Overview", icon: "overview", access: "overview" },
  { href: "/admin/bookings", label: "Bookings", icon: "bookings", access: "bookings" },
  { href: "/admin/apartments", label: "Apartments", icon: "apartments", access: "apartments" },
  { href: "/admin/cleaning", label: "Cleaning", icon: "cleaning", access: "cleaning" },
  { href: "/admin/payments", label: "Payments", icon: "payments", access: "payments" },
  { href: "/admin/customers", label: "Guests", icon: "customers", access: "customers" },
  { href: "/admin/reviews", label: "Reviews", icon: "reviews", access: "reviews" },
  { href: "/admin/coupons", label: "Coupons", icon: "coupons", access: "coupons" },
  { href: "/admin/staff", label: "Staff", icon: "staff", access: "staff" },
  { href: "/admin/settings", label: "Settings", icon: "settings", access: "settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await pageRole(STAFF_ROLES, "/admin");
  const items = ITEMS.filter((i) => ADMIN_ACCESS[i.access]?.includes(user.role)).map(({ href, label, icon }) => ({ href, label, icon }));
  return (
    <AdminShell items={items} user={{ name: user.name ?? user.email ?? "Team member", role: user.role }}>
      {children}
    </AdminShell>
  );
}
