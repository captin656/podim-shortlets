"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PosterCard } from "./ApartmentCard";
import type { ApartmentView } from "@/lib/types";

export function FeaturedRail({ apartments }: { apartments: ApartmentView[] }) {
  const rail = useRef<HTMLUListElement>(null);

  function scrollBy(dir: 1 | -1) {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 460), behavior: "smooth" });
  }

  return (
    <section aria-labelledby="featured-title" className="section overflow-x-clip bg-mist">
      <div className="container-x mb-10 flex items-end justify-between gap-6 sm:mb-14">
        <div>
          <h2 id="featured-title" className="text-display-lg">
            Our favourites.
          </h2>
          <p className="mt-4 max-w-[40ch] text-lead text-ink-mute">The apartments guests book again and again.</p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => scrollBy(-1)} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink shadow-lift transition hover:bg-white/80 active:scale-95" aria-label="Scroll left">
            <ChevronLeft size={22} />
          </button>
          <button type="button" onClick={() => scrollBy(1)} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink shadow-lift transition hover:bg-white/80 active:scale-95" aria-label="Scroll right">
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      {/* The rail bleeds to the screen edge while its first card lines up with the page grid. */}
      <ul
        ref={rail}
        className="hide-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:scroll-px-8 sm:gap-6 sm:px-8 lg:scroll-px-[max(2.5rem,calc((100vw-1280px)/2+2.5rem))] lg:px-[max(2.5rem,calc((100vw-1280px)/2+2.5rem))]"
        aria-label="Featured apartments"
      >
        {apartments.map((a, i) => (
          <li key={a.id} className="w-[82vw] max-w-[420px] shrink-0 snap-start sm:w-[420px]">
            <PosterCard apartment={a} priority={i < 2} />
          </li>
        ))}
      </ul>
    </section>
  );
}
