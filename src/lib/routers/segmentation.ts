import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";

const segmentationRouter = router({
  list: publicProcedure
    .input(z.object({ businessId: z.string() }))
    .query(async ({ input }) => {
      const memberships = await prisma.membership.findMany({
        where: { businessId: input.businessId, isActive: true },
        include: { customer: true },
      });

      const segments = memberships.map((m) => {
        let segment = "new";
        if (m.points > 1000) segment = "high-value";
        else if (m.points > 100) segment = "active";
        else if (!m.lastEarnAt || new Date(m.lastEarnAt) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) segment = "lapsed";
        return { ...m, segment };
      });

      return segments;
    }),
});

export default segmentationRouter;
