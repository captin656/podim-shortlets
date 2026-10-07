"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, Map, SlidersHorizontal } from "lucide-react";
import { FilterPanel, activeFilterCount, useUrlParams } from "./FilterPanel";
import { Sheet } from "./Sheet";
import type { AmenityView } from "@/lib/types";

type Props = {
  count: number;
  amenities: AmenityView[];
  bounds: { min: number; max: number };
  view: "grid" | "map";
  sort: string;
};

export function BrowseControls({ count, amenities, bounds, view, sort }: Props) {
  const update = useUrlParams();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const active = activeFilterCount(new URLSearchParams(sp.toString()));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[17px] font-semibold tracking-tight" aria-live="polite">
          {count === 0 ? "No stays match" : `${count} ${count === 1 ? "stay" : "stays"}`}
          <span className="font-normal text-ink-mute"> in Transekulu, Enugu</span>
        </p>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setOpen(true)} className="btn btn-quiet btn-sm lg:hidden">
            <SlidersHorizontal size={15} />
            Filters{active ? ` (${active})` : ""}
          </button>

          <label className="sr-only" htmlFor="sort">
            Sort by
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => update({ sort: e.target.value === "featured" ? null : e.target.value })}
            className="min-h-[36px] rounded-full bg-mist px-4 text-[13px] font-medium text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="rating">Top rated</option>
          </select>

          <div className="flex rounded-full bg-mist p-1" role="group" aria-label="View">
            {(
              [
                ["grid", "Grid", LayoutGrid],
                ["map", "Map", Map],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => update({ view: key === "grid" ? null : key })}
                aria-pressed={view === key}
                className={`flex min-h-[32px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition ${view === key ? "bg-white shadow-lift" : "text-ink-mute"}`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        footer={
          <button type="button" onClick={() => setOpen(false)} className="btn btn-ink btn-lg w-full">
            Show {count} {count === 1 ? "stay" : "stays"}
          </button>
        }
      >
        <FilterPanel amenities={amenities} bounds={bounds} />
      </Sheet>
    </>
  );
}
