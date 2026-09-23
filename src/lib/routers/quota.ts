import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";

const quotaRouter = router({
  check: publicProcedure
    .input(z.object({ secret: z.string() }))
    .query(async ({ input }) => {
      if (input.secret !== process.env.CRON_SECRET) {
        return { error: "Unauthorized" };
      }

      const [
        membershipCount,
        transactionCount,
        ticketCount,
        auditCount,
      ] = await Promise.all([
        prisma.membership.count(),
        prisma.transaction.count(),
        prisma.supportTicket.count(),
        prisma.auditLog.count(),
      ]);

      return {
        membershipCount,
        transactionCount,
        ticketCount,
        auditCount,
        timestamp: new Date().toISOString(),
      };
    }),
});

export default quotaRouter;
