"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { SafeImage } from "./SafeImage";
import { SearchBar } from "./SearchBar";
import { Stars } from "./Stars";

type Props = {
  image: string;
  stats: { apartments: number; rating: number; reviews: number };
  initial?: { q?: string; checkIn?: string; checkOut?: string; guests?: number };
};

export function Hero({ image, stats, initial }: Props) {
  const frame = useRef<HTMLDivElement>(null);

  // The one moving thing on the page: the photo settles into place as you scroll past the headline.
  useEffect(() => {
    const el = frame.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)));
      el.style.setProperty("--p", p.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section aria-labelledby="hero-title" className="relative overflow-x-clip bg-white">
      <div className="container-x flex flex-col items-center pt-14 text-center sm:pt-20 lg:pt-24">
        <h1 id="hero-title" className="animate-rise text-display-xl text-ink">
          Stay like you
          <br className="hidden sm:block" /> live here.
        </h1>
        <p className="mt-6 max-w-[34ch] animate-rise text-lead text-ink-mute [animation-delay:120ms] sm:max-w-[46ch]">
          Furnished apartments in Transekulu, Enugu. Power that stays on, Wi-Fi that keeps up, and a door you can book in a minute.
        </p>
        <div className="mt-8 flex animate-rise flex-col items-center gap-3 [animation-delay:220ms] sm:flex-row sm:gap-4">
          <Link href="#stays" className="btn btn-ink btn-lg">
            Find your stay
          </Link>
          <Link href="/#why" className="inline-flex min-h-[44px] items-center px-4 text-[17px] text-accent-deep hover:underline">
            See what’s included
          </Link>
        </div>
      </div>

      <div className="container-x relative mt-12 sm:mt-16">
        <div ref={frame} className="hero-frame relative aspect-[4/5] w-full overflow-hidden bg-mist sm:aspect-[16/10] lg:aspect-[21/10]">
          <SafeImage src={image} alt="A sunlit living room in a Podium apartment" fill priority sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" aria-hidden />

          {stats.reviews > 0 && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-2 text-[13px] font-medium shadow-lift backdrop-blur-md sm:left-6 sm:top-6">
              <Stars value={stats.rating} size={13} />
              <span>
                {stats.rating.toFixed(1)} from {stats.reviews} guests
              </span>
            </div>
          )}
        </div>

        {/* On large screens the search bar floats over the photo's lower edge. */}
        <div className="relative z-20 mx-auto mt-4 w-full max-w-[1040px] lg:-mt-12">
          <SearchBar initial={initial} />
        </div>
      </div>
    </section>
  );
}
