import { z } from "zod";
import { publicProcedure, router } from "@/lib/trpc";
import { prisma } from "@/lib/prisma";

export const businessRouter = router({
  explore: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = { isActive: true };

      if (input.category) {
        where.category = input.category;
      }

      if (input.query) {
        where.OR = [
          { name: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
        ];
      }

      const businesses = await prisma.business.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          category: true,
          address: true,
          latitude: true,
          longitude: true,
          logo: true,
          welcomePoints: true,
          minimumCashback: true,
          createdAt: true,
        },
      });

      let nextCursor: string | undefined;
      if (businesses.length > input.limit) {
        const nextItem = businesses.pop();
        nextCursor = nextItem!.id;
      }

      return { items: businesses, nextCursor };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const business = await prisma.business.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          category: true,
          address: true,
          latitude: true,
          longitude: true,
          logo: true,
          welcomePoints: true,
          minimumCashback: true,
          telegramGroup: true,
          createdAt: true,
        },
      });

      return business;
    }),
});
