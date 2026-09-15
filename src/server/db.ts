import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Always cache on globalThis — including in production. Next.js can instantiate this
// module more than once per warm serverless container across different route-handler
// chunks; without an unconditional cache, each instantiation opens its own connection
// pool against Supabase's already-scarce pooler slots (connection_limit=1 each), and
// under load that's how you get "too many connections" on the free tier.
globalForPrisma.prisma = db;
