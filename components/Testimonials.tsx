"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Stars } from "./Stars";
import type { ReviewView } from "@/lib/types";

export function Testimonials({ reviews }: { reviews: ReviewView[] }) {
  const [i, setI] = useState(0);
  if (!reviews.length) return null;
  const r = reviews[i];
  const go = (d: number) => setI((v) => (v + d + reviews.length) % reviews.length);

  return (
    <section aria-labelledby="reviews-title" className="section">
      <div className="container-x">
        <h2 id="reviews-title" className="sr-only">
          What guests say
        </h2>
        <figure className="mx-auto max-w-4xl text-center">
          <div className="flex justify-center">
            <Stars value={r.rating} size={20} />
          </div>
          <blockquote key={r.id} className="mt-8 animate-fade text-display-md">
            “{r.comment}”
          </blockquote>
          <figcaption className="mt-8 text-[17px]">
            <span className="font-semibold">{r.guestName}</span>
            {r.apartmentTitle && r.apartmentSlug && (
              <>
                <span className="text-ink-mute"> stayed at </span>
                <Link href={`/apartments/${r.apartmentSlug}`} className="text-accent-deep hover:underline">
                  {r.apartmentTitle}
                </Link>
              </>
            )}
          </figcaption>
        </figure>

        {reviews.length > 1 && (
          <div className="mt-10 flex items-center justify-center gap-5">
            <button type="button" onClick={() => go(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-mist transition hover:bg-mist-deep active:scale-95" aria-label="Previous review">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose review">
              {reviews.map((x, n) => (
                <button key={x.id} type="button" role="tab" aria-selected={n === i} aria-label={`Review ${n + 1}`} onClick={() => setI(n)} className="flex h-6 w-4 items-center justify-center">
                  <span className={`block h-2 rounded-full transition-all duration-300 ${n === i ? "w-6 bg-ink" : "w-2 bg-ink/20"}`} />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => go(1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-mist transition hover:bg-mist-deep active:scale-95" aria-label="Next review">
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
