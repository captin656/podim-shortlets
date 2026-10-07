"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";

// One shared request for the whole page, however many hearts it renders.
let wishlistPromise: Promise<Set<string>> | null = null;
function loadWishlist(): Promise<Set<string>> {
  if (!wishlistPromise) {
    wishlistPromise = fetch("/api/wishlist")
      .then((r) => (r.ok ? r.json() : { ids: [] }))
      .then((d) => new Set<string>(d.ids))
      .catch(() => new Set<string>());
  }
  return wishlistPromise;
}

export function WishlistButton({ apartmentId, className = "" }: { apartmentId: string; className?: string }) {
  const { status } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let live = true;
    loadWishlist().then((ids) => live && setSaved(ids.has(apartmentId)));
    return () => {
      live = false;
    };
  }, [status, apartmentId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next); // optimistic
    try {
      const res = await fetch("/api/wishlist", {
        method: next ? "POST" : "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apartmentId }),
      });
      if (!res.ok) throw new Error();
      wishlistPromise = null;
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-ink shadow-lift backdrop-blur-md transition duration-200 ease-apple hover:scale-105 active:scale-90 ${className}`}
    >
      <Heart size={18} strokeWidth={1.8} className={saved ? "fill-accent text-accent" : ""} />
    </button>
  );
}
