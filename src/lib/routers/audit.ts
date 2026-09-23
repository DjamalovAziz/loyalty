import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";

const auditRouter = router({
  businessLog: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        actorType: z.enum(["CUSTOMER", "OWNER", "STAFF", "SYSTEM", "ADMIN"]).optional(),
        actorId: z.string().optional(),
        action: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const where: any = { businessId: input.businessId };
      if (input.actorType) where.actorType = input.actorType;
      if (input.actorId) where.actorId = input.actorId;
      if (input.action) where.action = input.action;

      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          orderBy: { createdAt: "desc" },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return { items, total, limit: input.limit, offset: input.offset };
    }),
});

export default auditRouter;
