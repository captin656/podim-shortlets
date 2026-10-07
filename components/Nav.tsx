"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Menu, X, User } from "lucide-react";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/#stays", label: "Stays" },
  { href: "/#offers", label: "Offers" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock page scroll while the full-screen menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  const role = (session?.user as { role?: string } | undefined)?.role;
  const isStaff = role && role !== "GUEST";
  const accountHref = status === "authenticated" ? (isStaff ? "/admin" : "/dashboard") : "/login";
  const accountLabel = status === "authenticated" ? (isStaff ? "Admin" : "My trips") : "Sign in";

  return (
    <>
      <header
        className={`glass fixed inset-x-0 top-0 z-50 transition-shadow duration-300 ${scrolled || open ? "shadow-[0_1px_0_rgba(15,23,42,0.08)]" : ""}`}
        style={{ height: "var(--nav-h)" }}
      >
        <nav className="container-x flex h-full items-center justify-between" aria-label="Main">
          <Link href="/" className="-ml-1 flex min-h-[44px] items-center px-1 text-ink" aria-label="Podium Apartments, home">
            <Logo className="text-[17px]" />
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="rounded-full px-3.5 py-2 text-[13px] text-ink-soft transition-colors hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5">
            <Link
              href={accountHref}
              className="hidden min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] text-ink-soft transition-colors hover:text-ink sm:inline-flex"
            >
              <User size={16} strokeWidth={1.8} />
              {accountLabel}
            </Link>
            <Link href="/#stays" className="btn btn-ink btn-sm hidden sm:inline-flex">
              Book a stay
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X size={22} strokeWidth={1.6} /> : <Menu size={22} strokeWidth={1.6} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Full-screen menu for phones */}
      <div
        className={`fixed inset-0 z-40 bg-white pt-[var(--nav-h)] transition-opacity duration-300 md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!open}
      >
        <div className="container-x flex h-full flex-col pb-10 pt-6">
          <ul className="space-y-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block py-2.5 text-[2rem] font-semibold tracking-tight text-ink" tabIndex={open ? 0 : -1}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto space-y-3">
            <Link href={accountHref} className="btn btn-quiet btn-lg w-full" tabIndex={open ? 0 : -1}>
              {accountLabel}
            </Link>
            <Link href="/#stays" className="btn btn-accent btn-lg w-full" tabIndex={open ? 0 : -1}>
              Book a stay
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
