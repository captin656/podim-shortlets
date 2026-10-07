import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** True when a database is configured. Without one, development falls back to lib/sample-data.ts. */
export const hasDb = Boolean(process.env.DATABASE_URL);

/** Preview mode: no database and not production. The site renders from sample data. */
export const isPreview = !hasDb && process.env.NODE_ENV !== "production";

function createClient(): PrismaClient {
  if (!hasDb) {
    // Fail loudly and clearly if anything reaches for the database before it is configured.
    return new Proxy({} as PrismaClient, {
      get(_t, prop) {
        if (prop === "then") return undefined;
        throw new Error("DATABASE_URL is not set. Add it to .env, run `npm run db:push`, then `npm run db:seed`.");
      },
    });
  }
  return new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
