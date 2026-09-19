import { router } from "@/lib/trpc";
import { customerRouter } from "@/lib/routers/customer";
import { businessRouter } from "@/lib/routers/business";
import { staffRouter } from "@/lib/routers/staff";
import { adminRouter } from "@/lib/routers/admin";

export const appRouter = router({
  customer: customerRouter,
  business: businessRouter,
  staff: staffRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
