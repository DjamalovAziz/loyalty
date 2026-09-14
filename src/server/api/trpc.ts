import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export const createTRPCContext = async () => {
  const session = await auth();
  return { db, session };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/** Requires any authenticated NextAuth session. */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } } });
});

export const protectedProcedure = t.procedure.use(isAuthed);

/** Requires the BUSINESS_OWNER role. */
export const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "BUSINESS_OWNER") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

/** Requires the STAFF role. */
export const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "STAFF") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

/** Requires the CLIENT role. */
export const clientProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "CLIENT") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
