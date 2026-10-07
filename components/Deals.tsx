import Link from "next/link";
import { SafeImage } from "./SafeImage";
import { formatNGN } from "@/lib/format";
import type { ApartmentView } from "@/lib/types";

export function Deals({ apartments }: { apartments: ApartmentView[] }) {
  if (!apartments.length) return null;
  return (
    <section id="offers" aria-labelledby="offers-title" className="section">
      <div className="container-x">
        <div className="mb-10 max-w-3xl sm:mb-14">
          <h2 id="offers-title" className="text-display-lg">
            Stay longer.
            <br />
            Pay less.
          </h2>
          <p className="mt-4 max-w-[44ch] text-lead text-ink-mute">Book seven nights or more and the nightly rate drops automatically. No code needed.</p>
        </div>

        <ul className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {apartments.map((a, i) => {
            const weekly = Math.round((a.pricePerNight * 7 * (100 - a.weeklyDiscount)) / 100 / 7);
            return (
              <li key={a.id} className={i === 0 ? "md:col-span-2" : ""}>
                <Link href={`/apartments/${a.slug}`} className={`group relative flex overflow-hidden rounded-4xl bg-ink text-white ${i === 0 ? "min-h-[360px] sm:min-h-[420px]" : "min-h-[320px]"}`}>
                  <SafeImage src={a.images[0]?.url ?? ""} alt={a.images[0]?.alt ?? a.title} fill sizes={i === 0 ? "(min-width: 1280px) 1200px, 100vw" : "(min-width: 768px) 50vw, 100vw"} className="object-cover opacity-70 transition-transform duration-[1400ms] ease-apple group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" aria-hidden />
                  <div className="relative mt-auto flex w-full flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-9">
                    <div className="max-w-md">
                      <p className="text-[15px] font-medium text-accent">{a.weeklyDiscount}% off for 7+ nights</p>
                      <h3 className={`mt-1 font-semibold tracking-tight ${i === 0 ? "text-display-md" : "text-title"}`}>{a.title}</h3>
                      {a.monthlyDiscount > 0 && <p className="mt-2 text-[15px] text-white/75">{a.monthlyDiscount}% off for a full month.</p>}
                    </div>
                    <p className="shrink-0 sm:text-right">
                      <span className="block text-[15px] text-white/60 line-through">{formatNGN(a.pricePerNight)}</span>
                      <span className="text-[1.75rem] font-semibold tracking-tight">{formatNGN(weekly)}</span>
                      <span className="text-white/75"> night</span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
