import Link from "next/link";
import { SafeImage } from "./SafeImage";
import { RatingBadge } from "./Stars";
import { WishlistButton } from "./WishlistButton";
import { formatNGN } from "@/lib/format";
import { PROPERTY_LABEL } from "@/lib/format";
import type { ApartmentView } from "@/lib/types";
import { Zap } from "lucide-react";

type Props = {
  apartment: ApartmentView;
  /** Carry the guest's chosen dates into the detail page. */
  query?: string;
  priority?: boolean;
  sizes?: string;
};

export function ApartmentCard({ apartment: a, query = "", priority = false, sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" }: Props) {
  const href = `/apartments/${a.slug}${query ? `?${query}` : ""}`;
  return (
    <article className="group relative">
      <Link href={href} className="block rounded-4xl focus-visible:outline-offset-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-4xl bg-mist">
          <SafeImage
            src={a.images[0]?.url ?? ""}
            alt={a.images[0]?.alt ?? a.title}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-[900ms] ease-apple group-hover:scale-[1.03]"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {a.isFeatured && <span className="rounded-full bg-white/90 px-3 py-1 text-[12px] font-semibold shadow-lift backdrop-blur-md">Featured</span>}
            {a.weeklyDiscount > 0 && <span className="rounded-full bg-accent px-3 py-1 text-[12px] font-semibold text-white shadow-lift">{a.weeklyDiscount}% off weekly</span>}
          </div>
        </div>
        <div className="px-1 pb-1 pt-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[19px] font-semibold leading-tight tracking-tight">{a.title}</h3>
            <RatingBadge avg={a.ratingAvg} count={a.ratingCount} />
          </div>
          <p className="mt-1 text-[15px] text-ink-mute">
            {PROPERTY_LABEL[a.propertyType]} · {a.area}, {a.city}
          </p>
          <p className="mt-0.5 text-[15px] text-ink-mute">
            Sleeps {a.maxGuests} · {a.bedrooms} {a.bedrooms === 1 ? "bedroom" : "bedrooms"} · {a.bathrooms} {a.bathrooms === 1 ? "bath" : "baths"}
          </p>
          <p className="mt-3 flex items-center gap-2 text-[17px]">
            <span className="font-semibold">{formatNGN(a.pricePerNight)}</span>
            <span className="text-ink-mute">night</span>
            {a.isInstantBook && (
              <span className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-ink-soft">
                <Zap size={13} className="fill-accent text-accent" /> Instant book
              </span>
            )}
          </p>
        </div>
      </Link>
      <WishlistButton apartmentId={a.id} className="absolute right-3 top-3" />
    </article>
  );
}

/** The large poster tile used in the featured rail. */
export function PosterCard({ apartment: a, priority = false }: { apartment: ApartmentView; priority?: boolean }) {
  return (
    <article className="group relative h-full">
      <Link href={`/apartments/${a.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-4xl bg-mist sm:aspect-[5/6]">
        <SafeImage src={a.images[0]?.url ?? ""} alt={a.images[0]?.alt ?? a.title} fill priority={priority} sizes="(min-width: 1024px) 420px, 82vw" className="object-cover transition-transform duration-[1200ms] ease-apple group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/15 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <p className="text-[13px] font-medium text-white/80">
            {PROPERTY_LABEL[a.propertyType]} · Sleeps {a.maxGuests}
          </p>
          <h3 className="mt-1 text-[1.65rem] font-semibold leading-tight tracking-tight">{a.title}</h3>
          <p className="mt-1 line-clamp-2 text-[15px] text-white/80">{a.tagline}</p>
          <p className="mt-4 text-[17px]">
            <span className="font-semibold">{formatNGN(a.pricePerNight)}</span> <span className="text-white/75">night</span>
          </p>
        </div>
      </Link>
      <WishlistButton apartmentId={a.id} className="absolute right-4 top-4" />
    </article>
  );
}
