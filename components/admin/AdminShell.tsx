"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { BedDouble, CalendarCheck, CreditCard, LayoutDashboard, LogOut, Menu, MessageSquareText, Settings, Sparkles, Ticket, UserCog, Users, X, ExternalLink } from "lucide-react";
import { Logo } from "@/components/Logo";

export type AdminNavItem = { href: string; label: string; icon: keyof typeof ICONS };

const ICONS = {
  overview: LayoutDashboard,
  apartments: BedDouble,
  bookings: CalendarCheck,
  cleaning: Sparkles,
  payments: CreditCard,
  customers: Users,
  reviews: MessageSquareText,
  coupons: Ticket,
  staff: UserCog,
  settings: Settings,
};

export function AdminShell({ items, user, children }: { items: AdminNavItem[]; user: { name: string; role: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const on = active(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-[44px] items-center gap-3 rounded-2xl px-3.5 text-[15px] font-medium transition-colors ${on ? "bg-ink text-white" : "text-ink-soft hover:bg-mist"}`}
          >
            <Icon size={18} strokeWidth={1.8} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto space-y-2 border-t border-hairline pt-4">
      <div className="px-3.5">
        <p className="truncate text-[14px] font-semibold">{user.name}</p>
        <p className="text-[12px] text-ink-mute">{user.role.charAt(0) + user.role.slice(1).toLowerCase()}</p>
      </div>
      <Link href="/" className="flex min-h-[40px] items-center gap-3 rounded-2xl px-3.5 text-[14px] text-ink-soft hover:bg-mist">
        <ExternalLink size={16} /> View website
      </Link>
      <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="flex min-h-[40px] w-full items-center gap-3 rounded-2xl px-3.5 text-left text-[14px] text-ink-soft hover:bg-mist">
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-[100svh] bg-mist">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] flex-col bg-white p-4 ring-1 ring-hairline lg:flex">
        <Link href="/admin" className="mb-6 flex min-h-[44px] items-center px-3.5 text-ink">
          <Logo className="text-[18px]" />
        </Link>
        {nav}
        {footer}
      </aside>

      {/* Mobile bar and drawer */}
      <header className="glass fixed inset-x-0 top-0 z-30 flex h-[52px] items-center justify-between px-4 shadow-[0_1px_0_rgba(15,23,42,0.08)] lg:hidden">
        <Link href="/admin" className="flex items-center text-ink">
          <Logo className="text-[17px]" />
        </Link>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="flex h-11 w-11 items-center justify-center rounded-full">
          {open ? <X size={22} strokeWidth={1.6} /> : <Menu size={22} strokeWidth={1.6} />}
        </button>
      </header>
      <div className={`fixed inset-0 z-20 bg-white px-4 pb-6 pt-[68px] transition-opacity duration-300 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={!open}>
        <div className="flex h-full flex-col overflow-y-auto">
          {nav}
          {footer}
        </div>
      </div>

      <div className="px-4 pb-16 pt-[68px] sm:px-8 lg:ml-[256px] lg:px-10 lg:pt-10">
        <div className="mx-auto w-full max-w-[1180px]">{children}</div>
      </div>
    </div>
  );
}
