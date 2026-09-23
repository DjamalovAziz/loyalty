import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { PrismaClient } from "@prisma/client";

export type Context = {
  prisma: PrismaClient;
  user: { id: string; role: string } | null;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new Error("Unauthorized");
  }
  return next({ ctx });
});

export const superAdminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user!.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }
  return next({ ctx: { ...ctx, user: ctx.user! } });
});
