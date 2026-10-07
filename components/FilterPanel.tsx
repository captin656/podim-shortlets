"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AmenityIcon } from "./AmenityIcon";
import { formatNGN } from "@/lib/format";
import { PROPERTY_LABEL } from "@/lib/format";
import type { AmenityView } from "@/lib/types";
import { Zap } from "lucide-react";

type Props = { amenities: AmenityView[]; bounds: { min: number; max: number } };

const STEP = 1000;

/** Builds a URL-updating function so every filter change is shareable and server-rendered. */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}#stays`, { scroll: false });
    },
    [router, pathname, sp],
  );
}

export function activeFilterCount(sp: URLSearchParams): number {
  return ["min", "max", "am", "type", "instant"].filter((k) => sp.get(k)).length;
}

export function FilterPanel({ amenities, bounds }: Props) {
  const sp = useSearchParams();
  const update = useUrlParams();

  const urlMin = Number(sp.get("min")) || bounds.min;
  const urlMax = Number(sp.get("max")) || bounds.max;
  const [range, setRange] = useState<[number, number]>([urlMin, urlMax]);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Keep the slider in step when the URL changes from elsewhere (for example "Clear all").
  useEffect(() => setRange([urlMin, urlMax]), [urlMin, urlMax]);

  const types = (sp.get("type") ?? "").split(",").filter(Boolean);
  const selectedAmenities = (sp.get("am") ?? "").split(",").filter(Boolean);
  const instant = sp.get("instant") === "1";

  function commitRange(next: [number, number]) {
    setRange(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      update({ min: next[0] > bounds.min ? String(next[0]) : null, max: next[1] < bounds.max ? String(next[1]) : null });
    }, 350);
  }

  function toggle(key: "type" | "am", current: string[], value: string) {
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update({ [key]: next.length ? next.join(",") : null });
  }

  const span = Math.max(1, bounds.max - bounds.min);
  const left = ((range[0] - bounds.min) / span) * 100;
  const right = 100 - ((range[1] - bounds.min) / span) * 100;
  const dirty = activeFilterCount(new URLSearchParams(sp.toString())) > 0;

  return (
    <div className="space-y-9">
      <section aria-labelledby="f-price">
        <h3 id="f-price" className="mb-1 text-[15px] font-semibold">
          Price per night
        </h3>
        <p className="mb-5 text-[15px] tabular-nums text-ink-mute">
          {formatNGN(range[0])} – {formatNGN(range[1])}
        </p>
        <div className="relative h-6">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-mist-deep" />
          <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-ink" style={{ left: `${left}%`, right: `${right}%` }} />
          <input
            type="range"
            className="range-thumb"
            min={bounds.min}
            max={bounds.max}
            step={STEP}
            value={range[0]}
            aria-label="Minimum price"
            onChange={(e) => commitRange([Math.min(Number(e.target.value), range[1] - STEP), range[1]])}
          />
          <input
            type="range"
            className="range-thumb"
            min={bounds.min}
            max={bounds.max}
            step={STEP}
            value={range[1]}
            aria-label="Maximum price"
            onChange={(e) => commitRange([range[0], Math.max(Number(e.target.value), range[0] + STEP)])}
          />
        </div>
      </section>

      <section aria-labelledby="f-type">
        <h3 id="f-type" className="mb-3 text-[15px] font-semibold">
          Property type
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PROPERTY_LABEL).map(([key, label]) => {
            const on = types.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle("type", types, key)}
                aria-pressed={on}
                className={`min-h-[40px] rounded-full px-4 text-[14px] font-medium transition ${on ? "bg-ink text-white" : "bg-mist text-ink hover:bg-mist-deep"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="f-instant">
        <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4">
          <span id="f-instant" className="flex items-center gap-2 text-[15px] font-semibold">
            <Zap size={16} className="fill-accent text-accent" /> Instant book only
          </span>
          <span className="relative inline-flex h-7 w-12 shrink-0">
            <input type="checkbox" checked={instant} onChange={() => update({ instant: instant ? null : "1" })} className="peer sr-only" aria-labelledby="f-instant" />
            <span className="absolute inset-0 rounded-full bg-mist-deep transition peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
            <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-lift transition peer-checked:translate-x-5" />
          </span>
        </label>
      </section>

      <section aria-labelledby="f-am">
        <h3 id="f-am" className="mb-3 text-[15px] font-semibold">
          Amenities
        </h3>
        <div className="grid grid-cols-1 gap-1">
          {amenities.map((a) => {
            const on = selectedAmenities.includes(a.slug);
            return (
              <label key={a.slug} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-2xl px-3 transition hover:bg-mist">
                <input type="checkbox" checked={on} onChange={() => toggle("am", selectedAmenities, a.slug)} className="peer sr-only" />
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 ring-inset transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent ${on ? "bg-ink ring-ink" : "ring-ink/25"}`}>
                  {on && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path d="M2.5 6.2l2.2 2.2 4.8-4.9" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-ink-soft">
                  <AmenityIcon name={a.icon} size={18} />
                </span>
                <span className="text-[15px]">{a.name}</span>
              </label>
            );
          })}
        </div>
      </section>

      {dirty && (
        <button type="button" onClick={() => update({ min: null, max: null, am: null, type: null, instant: null })} className="text-[15px] font-medium text-ink underline underline-offset-4">
          Clear all filters
        </button>
      )}
    </div>
  );
}
