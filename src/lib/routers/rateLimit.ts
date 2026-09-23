import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";
import { otpLimiter, redeemLimiter, apiLimiter } from "@/lib/rateLimit";

const rateLimitRouter = router({
  checkOtp: publicProcedure
    .input(z.object({ phone: z.string() }))
    .mutation(async ({ input }) => {
      const result = await otpLimiter.limit(input.phone);
      return { success: result.success, remaining: result.remaining };
    }),

  checkRedeem: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      const result = await redeemLimiter.limit(input.key);
      return { success: result.success, remaining: result.remaining };
    }),

  checkApi: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      const result = await apiLimiter.limit(input.key);
      return { success: result.success, remaining: result.remaining };
    }),
});

export default rateLimitRouter;
