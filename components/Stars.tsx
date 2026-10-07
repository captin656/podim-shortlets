import { Star } from "lucide-react";

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} strokeWidth={0} className={i <= Math.round(value) ? "fill-accent" : "fill-ink/15"} />
      ))}
    </span>
  );
}

export function RatingBadge({ avg, count }: { avg: number; count: number }) {
  if (!count) return <span className="text-[13px] text-ink-mute">New</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-medium">
      <Star size={13} strokeWidth={0} className="fill-accent" />
      {avg.toFixed(1)}
      <span className="font-normal text-ink-mute">({count})</span>
    </span>
  );
}
