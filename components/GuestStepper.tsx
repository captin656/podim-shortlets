"use client";

import { Minus, Plus } from "lucide-react";

export function GuestStepper({ value, onChange, max = 10, min = 1 }: { value: number; onChange: (n: number) => void; max?: number; min?: number }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-inset ring-hairline transition hover:bg-mist disabled:opacity-30"
        aria-label="Fewer guests"
      >
        <Minus size={16} />
      </button>
      <span className="w-6 text-center text-[17px] font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-inset ring-hairline transition hover:bg-mist disabled:opacity-30"
        aria-label="More guests"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
