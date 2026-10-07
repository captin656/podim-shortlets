"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, parseISODate, toISODate, todayISO } from "@/lib/dates";

type Props = {
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
  /** Nights that cannot be slept in (booked or blocked). */
  unavailable?: string[];
  minNights?: number;
  maxNights?: number;
  /** Show two months side by side when there is room. */
  months?: 1 | 2;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7; // week starts on Monday
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toISODate(new Date(Date.UTC(year, month, d))));
  return cells;
}

export function RangeCalendar({ checkIn, checkOut, onChange, unavailable = [], minNights = 1, maxNights = 60, months = 2 }: Props) {
  const today = todayISO();
  const taken = useMemo(() => new Set(unavailable), [unavailable]);
  const start = checkIn ? parseISODate(checkIn) : parseISODate(today);
  const [cursor, setCursor] = useState({ y: start.getUTCFullYear(), m: start.getUTCMonth() });
  const [hover, setHover] = useState<string | null>(null);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 720px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const shown = months === 2 && wide ? 2 : 1;
  const visible = Array.from({ length: shown }, (_, i) => {
    const d = new Date(Date.UTC(cursor.y, cursor.m + i, 1));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  });

  const currentMonth = parseISODate(today);
  const canGoBack = cursor.y > currentMonth.getUTCFullYear() || (cursor.y === currentMonth.getUTCFullYear() && cursor.m > currentMonth.getUTCMonth());

  // The first unavailable night after check-in is the furthest a guest could check out (they leave that morning).
  const limit = useMemo(() => {
    if (!checkIn || checkOut) return null;
    let d = addDays(checkIn, 1);
    for (let i = 0; i < maxNights; i++) {
      if (taken.has(d)) return d;
      d = addDays(d, 1);
    }
    return addDays(checkIn, maxNights);
  }, [checkIn, checkOut, taken, maxNights]);

  function pick(day: string) {
    if (!checkIn || (checkIn && checkOut)) {
      onChange(day, null);
      return;
    }
    if (day <= checkIn) {
      onChange(day, null);
      return;
    }
    onChange(checkIn, day);
  }

  function disabled(day: string): boolean {
    if (day < today) return true;
    if (!checkIn || checkOut) return taken.has(day); // choosing a check-in: that night must be free
    // Choosing a check-out: it must be reachable and respect minimum nights.
    if (day <= checkIn) return taken.has(day);
    if (limit && day > limit) return true;
    const nights = Math.round((parseISODate(day).getTime() - parseISODate(checkIn).getTime()) / 86_400_000);
    return nights < minNights;
  }

  const rangeEnd = checkOut ?? (checkIn && hover && hover > checkIn ? hover : null);

  return (
    <div className="select-none">
      <div className="pointer-events-none relative z-20 mb-3 flex items-center justify-between [&>button]:pointer-events-auto">
        <button
          type="button"
          onClick={() => setCursor((c) => ({ y: new Date(Date.UTC(c.y, c.m - 1, 1)).getUTCFullYear(), m: new Date(Date.UTC(c.y, c.m - 1, 1)).getUTCMonth() }))}
          disabled={!canGoBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-mist disabled:opacity-25"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => setCursor((c) => ({ y: new Date(Date.UTC(c.y, c.m + 1, 1)).getUTCFullYear(), m: new Date(Date.UTC(c.y, c.m + 1, 1)).getUTCMonth() }))}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-mist"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className={`-mt-[52px] grid gap-8 ${shown === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {visible.map(({ y, m }) => (
          <div key={`${y}-${m}`}>
            <p className="mb-3 text-center text-[15px] font-semibold">
              {new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m, 1)))}
            </p>
            <div className="grid grid-cols-7 text-center text-[12px] text-ink-faint">
              {WEEKDAYS.map((w, i) => (
                <span key={i} className="pb-2">
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7" role="grid">
              {monthGrid(y, m).map((day, i) => {
                if (!day) return <span key={`e${i}`} />;
                const off = disabled(day);
                const isStart = day === checkIn;
                const isEnd = day === checkOut;
                const inRange = checkIn && rangeEnd && day > checkIn && day < rangeEnd;
                const isTaken = taken.has(day) && day >= today;
                const edgeL = isStart && rangeEnd;
                const edgeR = isEnd || (rangeEnd && day === rangeEnd);
                return (
                  <div key={day} className={`relative flex h-11 items-center justify-center ${inRange ? "bg-mist" : ""} ${edgeL ? "rounded-l-full bg-mist" : ""} ${edgeR && checkIn ? "rounded-r-full bg-mist" : ""}`}>
                    <button
                      type="button"
                      disabled={off && !(isStart || isEnd)}
                      onClick={() => pick(day)}
                      onMouseEnter={() => setHover(day)}
                      onMouseLeave={() => setHover(null)}
                      aria-label={`${day}${isTaken ? ", unavailable" : ""}`}
                      aria-pressed={isStart || isEnd}
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-[15px] tabular-nums transition-colors ${
                        isStart || isEnd
                          ? "bg-ink font-semibold text-white"
                          : off
                            ? `cursor-not-allowed text-ink-faint/60 ${isTaken ? "line-through decoration-ink-faint/50" : ""}`
                            : "hover:ring-2 hover:ring-ink"
                      } ${day === today && !(isStart || isEnd) ? "font-semibold text-accent-deep" : ""}`}
                    >
                      {Number(day.slice(8))}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-[13px] text-ink-mute">
        <span>{checkIn && !checkOut ? "Now choose your check-out date" : checkIn && checkOut ? "" : "Choose your check-in date"}</span>
        {(checkIn || checkOut) && (
          <button type="button" onClick={() => onChange(null, null)} className="font-medium text-ink underline underline-offset-4">
            Clear dates
          </button>
        )}
      </div>
    </div>
  );
}
