import { createTRPCRouter } from "~/server/api/trpc";
import { authRouter } from "~/server/api/routers/auth";
import { loyaltyRouter } from "~/server/api/routers/loyalty";
import { staffRouter } from "~/server/api/routers/staff";
import { customerRouter } from "~/server/api/routers/customer";
import { businessRouter } from "~/server/api/routers/business";
import { supportRouter } from "~/server/api/routers/support";
import { adminRouter } from "~/server/api/routers/admin";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  loyalty: loyaltyRouter,
  staff: staffRouter,
  // Named "customer", not "client" — `client` collides with the built-in `.client`
  // property on the tRPC React Query proxy (@trpc/react-query reserves it for the
  // underlying vanilla trpc client) and breaks typechecking if reused as a router key.
  customer: customerRouter,
  business: businessRouter,
  support: supportRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
