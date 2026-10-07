import { ApartmentCard } from "./ApartmentCard";
import { BrowseControls } from "./BrowseControls";
import { FilterPanel } from "./FilterPanel";
import { MapView } from "./MapView";
import { getAmenities, getPriceBounds, listApartments } from "@/lib/data";
import { carryQuery, parseSearchParams, type RawSearchParams } from "@/lib/search-params";
import { formatDate } from "@/lib/dates";
import Link from "next/link";
import { SearchX } from "lucide-react";

export async function Browse({ searchParams }: { searchParams: RawSearchParams }) {
  const filters = parseSearchParams(searchParams);
  const [apartments, amenities, bounds] = await Promise.all([listApartments(filters), getAmenities(), getPriceBounds()]);
  const query = carryQuery(filters);

  return (
    <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-[calc(var(--nav-h)+24px)] max-h-[calc(100svh-var(--nav-h)-48px)] overflow-y-auto overscroll-contain pb-6 pr-3 hide-scrollbar">
          <FilterPanel amenities={amenities} bounds={bounds} />
        </div>
      </aside>

      <div className="min-w-0 space-y-6">
        <BrowseControls count={apartments.length} amenities={amenities} bounds={bounds} view={filters.view} sort={filters.sort ?? "featured"} />

        {filters.checkIn && filters.checkOut && (
          <p className="text-[15px] text-ink-mute">
            Showing apartments free from {formatDate(filters.checkIn)} to {formatDate(filters.checkOut)}.{" "}
            <Link href="/#stays" className="font-medium text-ink underline underline-offset-4">
              Clear dates
            </Link>
          </p>
        )}

        {apartments.length === 0 ? (
          <div className="flex flex-col items-center rounded-4xl bg-mist px-6 py-20 text-center">
            <SearchX size={36} strokeWidth={1.4} className="text-ink-faint" />
            <h3 className="mt-5 text-title">Nothing matches those filters</h3>
            <p className="mt-2 max-w-sm text-ink-mute">Try a wider price range, fewer amenities, or different dates.</p>
            <Link href="/#stays" className="btn btn-ink mt-6">
              Reset search
            </Link>
          </div>
        ) : filters.view === "map" ? (
          <MapView apartments={apartments} query={query} />
        ) : (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
            {apartments.map((a, i) => (
              <ApartmentCard key={a.id} apartment={a} query={query} priority={i < 3} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
