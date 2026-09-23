import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";
import { getCachedAnalytics, setCachedAnalytics } from "@/lib/redis";

const CACHE_TTL = 300;

const analyticsRouter = router({
  businessOverview: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        from: z.date().optional(),
        to: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const cacheKey = `analytics:overview:${input.businessId}:${input.from?.toISOString() || "all"}:${input.to?.toISOString() || "all"}`;
      const cached = await getCachedAnalytics(cacheKey);
      if (cached) return cached;

      const where: any = { businessId: input.businessId };
      if (input.from || input.to) {
        where.createdAt = {};
        if (input.from) where.createdAt.gte = input.from;
        if (input.to) where.createdAt.lte = input.to;
      }

      const [totalCustomers, totalPoints, transactions] = await Promise.all([
        prisma.membership.count({ where: { businessId: input.businessId } }),
        prisma.membership.aggregate({
          where: { businessId: input.businessId },
          _sum: { points: true },
        }),
        prisma.transaction.findMany({
          where,
          select: {
            id: true,
            type: true,
            amount: true,
            createdAt: true,
            customerId: true,
            businessId: true,
          },
        }),
      ]);

      const result = {
        totalCustomers,
        totalPoints: totalPoints._sum.points || 0,
        transactions,
      };

      await setCachedAnalytics(cacheKey, result, CACHE_TTL);
      return result;
    }),
});

export default analyticsRouter;
