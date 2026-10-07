// Small helpers so every route handler answers in the same shape:
//   success → the JSON you return, error → { error: "Plain sentence the UI can show." }

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function route<C = any>(fn: (req: Request, ctx: C) => Promise<Response | object | null | void>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      const out = await fn(req, ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message, ...e.extra }, { status: e.status });
      if (e instanceof ZodError) {
        const first = e.issues[0];
        const field = first?.path.join(".") || "request";
        return NextResponse.json({ error: `${first?.message ?? "Invalid input"} (${field})`, issues: e.issues }, { status: 400 });
      }
      console.error("[api]", req.method, new URL(req.url).pathname, e);
      const message = e instanceof Error && /DATABASE_URL/.test(e.message) ? e.message : "Something went wrong on our side. Please try again.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "The request body must be valid JSON.");
  }
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
