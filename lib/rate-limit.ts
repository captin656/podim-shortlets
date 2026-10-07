// Best-effort, in-memory limiter. On Vercel each warm instance keeps its own counters,
// which is enough to blunt OTP and form spam. Swap for Upstash Redis if you need hard guarantees.

import { ApiError } from "./api";

const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    throw new ApiError(429, "Too many attempts. Please wait a few minutes and try again.");
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
}
