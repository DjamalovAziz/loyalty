import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";
import { generateIdempotencyKey } from "@/lib/idempotency";
import { writeAuditLog } from "@/lib/audit";
import { sendTelegramMessage } from "@/lib/telegram/notify";

const expiryRouter = router({
  run: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        dryRun: z.boolean().default(false),
        secret: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.secret !== process.env.CRON_SECRET) {
        return { success: false, error: "Unauthorized" };
      }

      const business = await prisma.business.findUnique({
        where: { id: input.businessId },
      });

      if (!business) {
        return { success: false, error: "Business not found" };
      }

      const threshold = new Date();
      threshold.setDate(threshold.getDate() - (business.welcomePoints || 30));

      const expiredMemberships = await prisma.membership.findMany({
        where: {
          businessId: input.businessId,
          isActive: true,
          points: { gt: 0 },
          lastEarnAt: { lt: threshold },
        },
      });

      const results = [];

      for (const membership of expiredMemberships) {
        if (input.dryRun) {
          results.push({ membershipId: membership.id, points: membership.points, dryRun: true });
          continue;
        }

        const balanceBefore = membership.points;
        const idempotencyKey = generateIdempotencyKey(`expire:${membership.id}`);

        await prisma.$transaction(async (tx) => {
          const updated = await tx.membership.update({
            where: { id: membership.id },
            data: { points: 0, isActive: false },
          });

          await tx.transaction.create({
            data: {
              type: "EXPIRE",
              amount: -balanceBefore,
              balanceBefore,
              balanceAfter: 0,
              idempotencyKey,
              reason: "Inactivity expiry",
              actorType: "SYSTEM",
              actorId: "cron",
              membershipId: membership.id,
              customerId: membership.customerId,
              businessId: input.businessId,
            },
          });

          await writeAuditLog({
            businessId: input.businessId,
            action: "points.expire",
            actorType: "SYSTEM",
            actorId: "cron",
            target: membership.id,
            meta: { points: balanceBefore },
          });

          results.push({ membershipId: membership.id, points: balanceBefore });
        });
      }

      return { success: true, results };
    }),

  warn: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        daysBeforeExpiry: z.number().int().positive().default(7),
        secret: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.secret !== process.env.CRON_SECRET) {
        return { success: false, error: "Unauthorized" };
      }

      const business = await prisma.business.findUnique({
        where: { id: input.businessId },
      });

      if (!business) {
        return { success: false, error: "Business not found" };
      }

      const warningThreshold = new Date();
      warningThreshold.setDate(warningThreshold.getDate() - (business.welcomePoints || 30) + input.daysBeforeExpiry);

      const expiringMemberships = await prisma.membership.findMany({
        where: {
          businessId: input.businessId,
          isActive: true,
          points: { gt: 0 },
          lastEarnAt: { lte: warningThreshold },
        },
        include: { customer: true },
      });

      const notified = [];

      for (const membership of expiringMemberships) {
        if (membership.customer.telegramId && process.env.TELEGRAM_BOT_TOKEN) {
          await sendTelegramMessage(
            process.env.TELEGRAM_BOT_TOKEN,
            membership.customer.telegramId,
            `Warning: Your points at ${business.name} will expire in ${input.daysBeforeExpiry} days due to inactivity.`
          );
          notified.push(membership.id);
        }
      }

      return { success: true, notifiedCount: notified.length };
    }),
});

export default expiryRouter;
