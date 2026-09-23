import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";

const reconciliationRouter = router({
  check: publicProcedure
    .input(z.object({ businessId: z.string() }))
    .query(async ({ input }) => {
      const memberships = await prisma.membership.findMany({
        where: { businessId: input.businessId },
        include: {
          transactions: {
            where: { type: { not: "EXPIRE" } },
          },
        },
      });

      const discrepancies = [];

      for (const membership of memberships) {
        const sum = membership.transactions.reduce((acc, tx) => acc + tx.amount, 0);
        if (sum !== membership.points) {
          discrepancies.push({
            membershipId: membership.id,
            expected: membership.points,
            actual: sum,
            difference: membership.points - sum,
          });
        }
      }

      return {
        totalMemberships: memberships.length,
        discrepancies,
        isHealthy: discrepancies.length === 0,
      };
    }),
});

export default reconciliationRouter;
