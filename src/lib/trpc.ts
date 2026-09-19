import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { PrismaClient } from "@prisma/client";
import { Redis } from "@upstash/redis";

export type Context = {
  prisma: PrismaClient;
  redis: Redis;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  return next({ ctx });
});

export { TRPCError };
