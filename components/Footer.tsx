import Link from "next/link";
import { Logo } from "./Logo";
import { getSettings } from "@/lib/data";

const COLS = [
  {
    title: "Stay",
    links: [
      { href: "/#stays", label: "All apartments" },
      { href: "/#offers", label: "Weekly and monthly offers" },
      { href: "/#why", label: "Why Podium" },
      { href: "/dashboard", label: "My trips" },
    ],
  },
  {
    title: "Guest help",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/house-rules", label: "House rules" },
      { href: "/cancellation-policy", label: "Cancellation policy" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    title: "Podium",
    links: [
      { href: "/about", label: "About" },
      { href: "/privacy-policy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of use" },
    ],
  },
];

export async function Footer() {
  const s = await getSettings();
  return (
    <footer className="bg-mist text-[12px] leading-relaxed text-ink-mute">
      <div className="container-x py-12 sm:py-16">
        <div className="mb-10 flex flex-col gap-8 lg:flex-row lg:justify-between">
          <div className="max-w-xs">
            <Logo className="text-[19px] text-ink" />
            <p className="mt-4 text-[13px]">{s.tagline}. Furnished apartments by the night, with power, water and Wi-Fi that stay on.</p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3 lg:max-w-2xl">
            {COLS.map((c) => (
              <div key={c.title}>
                <h2 className="mb-3 text-[12px] font-semibold text-ink">{c.title}</h2>
                <ul className="space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="inline-block py-0.5 hover:text-ink hover:underline">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1 border-t border-hairline pt-6">
          <p>
            {s.address} ·{" "}
            <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:text-ink hover:underline">
              {s.phone}
            </a>{" "}
            ·{" "}
            <a href={`mailto:${s.email}`} className="hover:text-ink hover:underline">
              {s.email}
            </a>
          </p>
          <p>All prices are in Nigerian naira. Your caution fee is refundable.</p>
          <p>
            Copyright © {new Date().getFullYear()} {s.businessName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
