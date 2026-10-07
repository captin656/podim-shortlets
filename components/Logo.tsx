// Three steps of a podium: second, first, third. The tallest step carries the accent.
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1.5" y="10" width="6.5" height="12.5" rx="1.6" fill="currentColor" />
      <rect x="8.75" y="2" width="6.5" height="20.5" rx="1.6" fill="#f97316" />
      <rect x="16" y="14" width="6.5" height="8.5" rx="1.6" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <LogoMark />
      <span>Podium</span>
    </span>
  );
}
