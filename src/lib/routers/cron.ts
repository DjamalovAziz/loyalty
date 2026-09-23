import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";

const MAX_RECONCILIATION_BATCH = 100;

const cronRouter = router({
  health: publicProcedure
    .input(z.object({ secret: z.string() }))
    .mutation(async ({ input }) => {
      if (input.secret !== process.env.CRON_SECRET) {
        return { status: "unauthorized" };
      }

      const db = await prisma.$queryRaw`SELECT 1`;
      const membershipCount = await prisma.membership.count();

      return {
        status: "ok",
        db: Array.isArray(db) ? "ok" : "ok",
        membershipCount,
        timestamp: new Date().toISOString(),
      };
    }),

  reconciliation: publicProcedure
    .input(z.object({ secret: z.string(), businessId: z.string().optional() }))
    .mutation(async ({ input }) => {
      if (input.secret !== process.env.CRON_SECRET) {
        return { status: "unauthorized" };
      }

      const where = input.businessId ? { businessId: input.businessId } : {};
      const memberships = await prisma.membership.findMany({
        where,
        include: {
          transactions: {
            where: { type: { not: "EXPIRE" } },
          },
        },
        take: MAX_RECONCILIATION_BATCH,
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
        status: "ok",
        checked: memberships.length,
        discrepancies,
        isHealthy: discrepancies.length === 0,
        timestamp: new Date().toISOString(),
      };
    }),

  quota: publicProcedure
    .input(z.object({ secret: z.string() }))
    .mutation(async ({ input }) => {
      if (input.secret !== process.env.CRON_SECRET) {
        return { status: "unauthorized" };
      }

      const [membershipCount, transactionCount, ticketCount, auditCount] = await Promise.all([
        prisma.membership.count(),
        prisma.transaction.count(),
        prisma.supportTicket.count(),
        prisma.auditLog.count(),
      ]);

      return {
        status: "ok",
        counts: {
          memberships: membershipCount,
          transactions: transactionCount,
          tickets: ticketCount,
          audits: auditCount,
        },
        timestamp: new Date().toISOString(),
      };
    }),

  retention: publicProcedure
    .input(z.object({ secret: z.string(), days: z.number().int().positive().default(90) }))
    .mutation(async ({ input }) => {
      if (input.secret !== process.env.CRON_SECRET) {
        return { status: "unauthorized" };
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - input.days);

      const financialActions = ["points.earn", "points.redeem", "points.adjustment", "points.expire", "support.ticket.create"];

      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoff },
          action: { not: { in: financialActions } },
        },
      });

      return { status: "ok", deleted: result.count };
    }),
});

export default cronRouter;
