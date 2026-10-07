"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

// A bottom sheet on phones and a centred panel from `sm` upwards.
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 animate-fade bg-ink/40 backdrop-blur-sm" />
      <div className="relative flex max-h-[92svh] w-full animate-sheet flex-col rounded-t-4xl bg-white shadow-float sm:max-w-[760px] sm:rounded-4xl">
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h2 className="text-[19px] font-semibold tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-mist transition hover:bg-mist-deep" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-6 pb-6 pt-2">{children}</div>
        {footer && <div className="border-t border-hairline px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}
