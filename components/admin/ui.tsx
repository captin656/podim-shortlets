// Small presentational pieces shared by every admin page. No hooks, so they work in server and client components.

import Link from "next/link";
import { formatNGN, STATUS_LABEL } from "@/lib/format";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-[2.125rem]">{title}</h1>
        {description && <p className="mt-1 max-w-[60ch] text-[15px] text-ink-mute">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, action, children, className = "", flush = false }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={`rounded-3xl bg-white ring-1 ring-hairline ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-5 sm:px-6">
          {title && <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      <div className={flush ? "" : "p-5 sm:p-6"}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: string | number; hint?: string; href?: string }) {
  const body = (
    <div className="h-full rounded-3xl bg-white p-5 ring-1 ring-hairline transition hover:ring-ink/30">
      <p className="text-[13px] text-ink-mute">{label}</p>
      <p className="mt-2 text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums sm:text-[2rem]">{value}</p>
      {hint && <p className="mt-2 text-[13px] text-ink-mute">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full rounded-3xl">
      {body}
    </Link>
  ) : (
    body
  );
}

const PILL: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-sky-100 text-sky-900",
  CHECKED_IN: "bg-emerald-100 text-emerald-900",
  CHECKED_OUT: "bg-slate-200 text-slate-800",
  COMPLETED: "bg-slate-200 text-slate-800",
  CANCELLED: "bg-rose-100 text-rose-900",
  REJECTED: "bg-rose-100 text-rose-900",
  PAID: "bg-emerald-100 text-emerald-900",
  PARTIAL: "bg-amber-100 text-amber-900",
  UNPAID: "bg-slate-200 text-slate-800",
  REFUNDED: "bg-violet-100 text-violet-900",
  HELD: "bg-amber-100 text-amber-900",
  RETAINED: "bg-rose-100 text-rose-900",
  NONE: "bg-slate-100 text-slate-600",
  SUCCESS: "bg-emerald-100 text-emerald-900",
  FAILED: "bg-rose-100 text-rose-900",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const text = label ?? STATUS_LABEL[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${PILL[status] ?? "bg-slate-100 text-slate-700"}`}>{text}</span>;
}

export function Money({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{formatNGN(value)}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-mist px-6 py-14 text-center">
      <p className="text-[19px] font-semibold tracking-tight">{title}</p>
      {body && <p className="mt-1 max-w-[44ch] text-[15px] text-ink-mute">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Table wrapper: scrolls sideways on phones instead of squashing columns. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:mx-0">
      <div className="min-w-full px-5 sm:px-0">{children}</div>
    </div>
  );
}

export const table = {
  base: "w-full min-w-[640px] border-collapse text-left text-[14px]",
  th: "whitespace-nowrap border-b border-hairline px-3 py-2.5 text-[12px] font-semibold text-ink-mute first:pl-0 last:pr-0",
  td: "border-b border-hairline px-3 py-3 align-middle first:pl-0 last:pr-0",
  row: "transition-colors hover:bg-mist/60",
};

/** Page shown when the admin area is opened without a database connected. */
export function NeedsDatabase() {
  return (
    <EmptyState
      title="Connect a database to use this page"
      body="Add DATABASE_URL to your environment, run `npm run db:push` and `npm run db:seed`, then reload."
    />
  );
}
