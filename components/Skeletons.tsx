export function CardSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton aspect-[4/3] rounded-4xl" />
      <div className="mt-4 space-y-2.5 px-1">
        <div className="skeleton h-5 w-2/3 rounded-full" />
        <div className="skeleton h-4 w-1/2 rounded-full" />
        <div className="skeleton h-4 w-2/5 rounded-full" />
        <div className="skeleton mt-4 h-5 w-1/3 rounded-full" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading apartments">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="container-x py-8" role="status" aria-label="Loading apartment">
      <div className="skeleton mb-6 h-9 w-2/3 max-w-lg rounded-full" />
      <div className="skeleton aspect-[16/9] w-full rounded-4xl lg:aspect-[21/9]" />
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-5 rounded-full" style={{ width: `${95 - i * 9}%` }} />
          ))}
        </div>
        <div className="skeleton h-[420px] rounded-4xl" />
      </div>
    </div>
  );
}
