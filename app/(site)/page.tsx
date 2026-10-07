import { Suspense } from "react";
import Link from "next/link";
import { Hero } from "@/components/Hero";
import { FeaturedRail } from "@/components/FeaturedRail";
import { Browse } from "@/components/Browse";
import { Deals } from "@/components/Deals";
import { WhyPodium } from "@/components/WhyPodium";
import { Testimonials } from "@/components/Testimonials";
import { GridSkeleton } from "@/components/Skeletons";
import { getBestDeals, getFeatured, getSettings, getSiteStats, getTestimonials } from "@/lib/data";
import { parseSearchParams, type RawSearchParams } from "@/lib/search-params";
import { HERO_IMAGE } from "@/lib/sample-data";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: RawSearchParams }) {
  const filters = parseSearchParams(searchParams);
  const [featured, deals, testimonials, stats, settings] = await Promise.all([getFeatured(6), getBestDeals(3), getTestimonials(6), getSiteStats(), getSettings()]);

  return (
    <>
      <Hero image={HERO_IMAGE} stats={stats} initial={{ q: filters.q, checkIn: filters.checkIn, checkOut: filters.checkOut, guests: filters.guests }} />

      <div className="h-16 sm:h-24 lg:h-28" aria-hidden />

      <FeaturedRail apartments={featured} />

      <section id="stays" aria-labelledby="stays-title" className="section scroll-mt-[var(--nav-h)]">
        <div className="container-x">
          <h2 id="stays-title" className="mb-10 text-display-lg sm:mb-14">
            Find your place.
          </h2>
          <Suspense key={JSON.stringify(searchParams)} fallback={<GridSkeleton />}>
            <Browse searchParams={searchParams} />
          </Suspense>
        </div>
      </section>

      <Deals apartments={deals} />
      <WhyPodium />
      <Testimonials reviews={testimonials} />

      <section className="bg-ink py-20 text-center text-white sm:py-28">
        <div className="container-x">
          <h2 className="text-display-lg">Not sure which one?</h2>
          <p className="mx-auto mt-4 max-w-[40ch] text-lead text-white/70">Message us with your dates and group size. We’ll point you to the right apartment.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-lg">
              Chat on WhatsApp
            </a>
            <Link href="/contact" className="btn btn-lg bg-white/10 text-white hover:bg-white/20">
              Send a message
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
