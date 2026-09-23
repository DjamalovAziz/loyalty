import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";
import { writeAuditLog } from "@/lib/audit";

const businessRouter = router({
  explore: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const where: any = { isActive: true };
      if (input.query) {
        where.OR = [
          { name: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
          { category: { contains: input.query, mode: "insensitive" } },
        ];
      }
      if (input.category) {
        where.category = { equals: input.category, mode: "insensitive" };
      }

      const [items, total] = await Promise.all([
        prisma.business.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            category: true,
            logoUrl: true,
            welcomePoints: true,
            minimumCashback: true,
          },
        }),
        prisma.business.count({ where }),
      ]);

      return { items, total, limit: input.limit, offset: input.offset };
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return prisma.business.findUnique({
        where: { slug: input.slug },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          category: true,
          address: true,
          latitude: true,
          longitude: true,
          logoUrl: true,
          welcomePoints: true,
          minimumCashback: true,
          telegramGroupId: true,
          isActive: true,
        },
      });
    }),
});

export default businessRouter;
