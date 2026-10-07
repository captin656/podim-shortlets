"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, CalendarDays, Users } from "lucide-react";
import { RangeCalendar } from "./RangeCalendar";
import { GuestStepper } from "./GuestStepper";
import { Sheet } from "./Sheet";
import { formatDate, diffNights } from "@/lib/dates";
import { pluralize } from "@/lib/format";

export function SearchBar({ initial }: { initial?: { q?: string; checkIn?: string; checkOut?: string; guests?: number } }) {
  const router = useRouter();
  const [q, setQ] = useState(initial?.q ?? "");
  const [checkIn, setCheckIn] = useState<string | null>(initial?.checkIn ?? null);
  const [checkOut, setCheckOut] = useState<string | null>(initial?.checkOut ?? null);
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!guestsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (guestsRef.current && !guestsRef.current.contains(e.target as Node)) setGuestsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [guestsOpen]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (checkIn && checkOut) {
      p.set("in", checkIn);
      p.set("out", checkOut);
    }
    if (guests > 1) p.set("guests", String(guests));
    router.push(`/${p.toString() ? `?${p}` : ""}#stays`, { scroll: false });
    document.getElementById("stays")?.scrollIntoView({ behavior: "smooth" });
  }

  const dateText = (d: string | null, fallback: string) => (d ? formatDate(d, { day: "numeric", month: "short" }) : fallback);
  const nights = checkIn && checkOut ? diffNights(checkIn, checkOut) : 0;

  const segment = "flex min-h-[64px] w-full flex-col justify-center gap-0.5 px-6 text-left transition-colors hover:bg-mist/70 focus-visible:z-10";

  return (
    <>
      <form
        onSubmit={submit}
        role="search"
        aria-label="Search apartments"
        className="glass relative w-full rounded-4xl bg-white/80 p-2 shadow-float ring-1 ring-hairline lg:flex lg:items-center lg:rounded-full lg:p-2"
      >
        <label className={`${segment} cursor-text lg:flex-[1.2] lg:rounded-full`}>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
            <MapPin size={13} /> Where
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Transekulu, Enugu"
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink-mute focus:outline-none"
            aria-label="Location"
            autoComplete="off"
          />
        </label>

        <span className="mx-6 block h-px bg-hairline lg:mx-0 lg:h-8 lg:w-px" aria-hidden />

        <button type="button" onClick={() => setCalendarOpen(true)} className={`${segment} lg:flex-1 lg:rounded-full`}>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
            <CalendarDays size={13} /> Check in
          </span>
          <span className={`text-[15px] ${checkIn ? "text-ink" : "text-ink-mute"}`}>{dateText(checkIn, "Add date")}</span>
        </button>

        <span className="mx-6 block h-px bg-hairline lg:mx-0 lg:h-8 lg:w-px" aria-hidden />

        <button type="button" onClick={() => setCalendarOpen(true)} className={`${segment} lg:flex-1 lg:rounded-full`}>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
            <CalendarDays size={13} /> Check out
          </span>
          <span className={`text-[15px] ${checkOut ? "text-ink" : "text-ink-mute"}`}>{dateText(checkOut, "Add date")}</span>
        </button>

        <span className="mx-6 block h-px bg-hairline lg:mx-0 lg:h-8 lg:w-px" aria-hidden />

        <div ref={guestsRef} className="relative lg:flex-1">
          <button type="button" onClick={() => setGuestsOpen((v) => !v)} className={`${segment} lg:rounded-full`} aria-expanded={guestsOpen}>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <Users size={13} /> Guests
            </span>
            <span className="text-[15px] text-ink">{pluralize(guests, "guest")}</span>
          </button>
          {guestsOpen && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 animate-fade rounded-3xl bg-white p-5 shadow-float ring-1 ring-hairline lg:left-auto lg:w-72">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-semibold">Guests</p>
                  <p className="text-[13px] text-ink-mute">Adults and children</p>
                </div>
                <GuestStepper value={guests} onChange={setGuests} max={10} />
              </div>
            </div>
          )}
        </div>

        <div className="p-2 lg:p-0 lg:pl-2">
          <button type="submit" className="btn btn-accent btn-lg w-full lg:h-14 lg:w-auto lg:px-7">
            <Search size={18} strokeWidth={2.2} />
            Search
          </button>
        </div>
      </form>

      <Sheet
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        title="Choose your dates"
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="text-[15px] text-ink-mute">{nights ? `${pluralize(nights, "night")} · ${formatDate(checkIn!)} to ${formatDate(checkOut!)}` : "Pick check-in, then check-out"}</p>
            <button type="button" onClick={() => setCalendarOpen(false)} className="btn btn-ink">
              {nights ? "Save dates" : "Close"}
            </button>
          </div>
        }
      >
        <RangeCalendar
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(a, b) => {
            setCheckIn(a);
            setCheckOut(b);
            if (a && b) setTimeout(() => setCalendarOpen(false), 250);
          }}
        />
      </Sheet>
    </>
  );
}
