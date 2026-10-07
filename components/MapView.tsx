"use client";

import { useState } from "react";
import Link from "next/link";
import { SafeImage } from "./SafeImage";
import { formatNGN } from "@/lib/format";
import type { ApartmentView } from "@/lib/types";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

export function mapSrc(lat: number, lng: number, zoom = 16): string {
  return KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${KEY}&q=${lat},${lng}&zoom=${zoom}`
    : `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
}

export function MapView({ apartments, query }: { apartments: ApartmentView[]; query: string }) {
  const [active, setActive] = useState(0);
  const current = apartments[active] ?? apartments[0];
  if (!current) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <ul className="order-2 max-h-[640px] space-y-2 overflow-y-auto overscroll-contain pr-1 lg:order-1">
        {apartments.map((a, i) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              aria-pressed={i === active}
              className={`flex w-full items-center gap-4 rounded-3xl p-2.5 text-left transition ${i === active ? "bg-mist" : "hover:bg-mist/60"}`}
            >
              <span className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-mist-deep">
                <SafeImage src={a.images[0]?.url ?? ""} alt="" fill sizes="96px" className="object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold">{a.title}</span>
                <span className="block text-[13px] text-ink-mute">
                  {a.bedrooms} bed · sleeps {a.maxGuests}
                </span>
                <span className="mt-0.5 block text-[15px] font-semibold">
                  {formatNGN(a.pricePerNight)} <span className="font-normal text-ink-mute">night</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="order-1 overflow-hidden rounded-4xl bg-mist lg:order-2 lg:sticky lg:top-[calc(var(--nav-h)+16px)]">
        <iframe
          key={`${current.lat},${current.lng}`}
          title={`Map showing ${current.title}`}
          src={mapSrc(current.lat, current.lng)}
          className="h-[320px] w-full border-0 sm:h-[460px] lg:h-[640px]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <div className="flex items-center justify-between gap-3 bg-white p-4">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{current.title}</p>
            <p className="truncate text-[13px] text-ink-mute">{current.address}</p>
          </div>
          <Link href={`/apartments/${current.slug}${query ? `?${query}` : ""}`} className="btn btn-ink btn-sm shrink-0">
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
