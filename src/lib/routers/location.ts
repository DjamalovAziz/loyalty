import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";

const locationRouter = router({
  list: publicProcedure
    .input(z.object({ businessId: z.string() }))
    .query(async ({ input }) => {
      return prisma.business.findMany({
        where: { ownerId: input.businessId },
        select: { id: true, name: true, address: true, latitude: true, longitude: true },
      });
    }),
});

export default locationRouter;
