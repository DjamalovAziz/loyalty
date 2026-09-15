import { createTRPCRouter } from "~/server/api/trpc";
import { authRouter } from "~/server/api/routers/auth";
import { loyaltyRouter } from "~/server/api/routers/loyalty";
import { staffRouter } from "~/server/api/routers/staff";
import { portalRouter } from "~/server/api/routers/client";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  loyalty: loyaltyRouter,
  staff: staffRouter,
  portal: portalRouter,
});

export type AppRouter = typeof appRouter;
