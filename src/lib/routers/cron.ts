import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";
import { sendTelegramMessage } from "@/lib/telegram/notify";

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

  authFailures: publicProcedure
    .input(z.object({ secret: z.string(), minutes: z.number().int().positive().default(15), threshold: z.number().int().positive().default(10) }))
    .mutation(async ({ input }) => {
      if (input.secret !== process.env.CRON_SECRET) {
        return { status: "unauthorized" };
      }

      const since = new Date(Date.now() - input.minutes * 60 * 1000);

      const failures = await prisma.auditLog.groupBy({
        by: ["actorId", "action"],
        where: {
          action: "auth.failed",
          createdAt: { gte: since },
        },
        _count: { action: true },
      });

      const total = failures.reduce((sum, f) => sum + f._count.action, 0);
      const isAlert = total >= input.threshold;

      if (isAlert) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.ALERT_TELEGRAM_CHAT_ID;
        const details = failures
          .map((f) => `${f.actorId}: ${f._count.action}`)
          .join("\n");
        const text = `LoyaltySphere Alert: ${total} auth failures in last ${input.minutes} minutes\n${details}`;
        sendTelegramMessage(token || "", chatId || "", text).catch(() => {});
      }

      return {
        status: "ok",
        windowMinutes: input.minutes,
        threshold: input.threshold,
        total,
        isAlert,
        failures: failures.map((f) => ({ actorId: f.actorId, action: f.action, count: f._count.action })),
      };
    }),
});

export default cronRouter;
