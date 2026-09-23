import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";

type Segment = "new" | "active" | "high-value" | "lapsed" | "at-risk" | "vip";

function membershipToSegment(membership: { points: number; lastEarnAt: Date | null; joinedAt: Date }): Segment {
  const daysSinceLastEarn = membership.lastEarnAt
    ? (Date.now() - membership.lastEarnAt.getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  if (membership.points >= 1000) return "vip";
  if (membership.points >= 500) return "high-value";
  if (daysSinceLastEarn > 90) return "lapsed";
  if (daysSinceLastEarn > 30) return "at-risk";
  if (membership.points > 0) return "active";
  return "new";
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data = await res.json();
  if (!data.ok) {
    if (data.description?.includes("bot was blocked")) {
      await prisma.customer.updateMany({
        where: { telegramId: chatId },
        data: { telegramOptOut: true },
      });
    }
    throw new Error(data.description || "Telegram error");
  }
  return data.result;
}

const broadcastRouter = router({
  list: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return prisma.supportTicket.findMany({
        where: { businessId: input.businessId },
        take: input.limit,
        skip: input.offset,
        orderBy: { createdAt: "desc" },
      });
    }),

  send: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        segment: z.enum(["new", "active", "high-value", "lapsed", "at-risk", "vip"]),
        message: z.string().min(1).max(4000),
        secret: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.secret !== process.env.CRON_SECRET) {
        return { success: false, error: "Unauthorized" };
      }

      const memberships = await prisma.membership.findMany({
        where: { businessId: input.businessId, isActive: true },
        include: { customer: true },
      });

      const targets = memberships.filter((m) => {
        if (m.customer.telegramOptOut) return false;
        return membershipToSegment(m) === input.segment;
      });

      const queue = await prisma.broadcastQueue.create({
        data: {
          businessId: input.businessId,
          segment: input.segment,
          message: input.message,
        },
      });

      return { success: true, queueId: queue.id, queued: targets.length };
    }),

  processQueue: publicProcedure
    .input(z.object({ secret: z.string(), batchSize: z.number().int().positive().max(50).default(20) }))
    .mutation(async ({ input }) => {
      if (input.secret !== process.env.CRON_SECRET) {
        return { success: false, error: "Unauthorized" };
      }

      const pending = await prisma.broadcastQueue.findMany({
        where: { status: "pending", attempts: { lt: 3 } },
        take: input.batchSize,
        orderBy: { createdAt: "asc" },
      });

      const results = [];
      for (const queueItem of pending) {
        try {
          const memberships = await prisma.membership.findMany({
            where: { businessId: queueItem.businessId, isActive: true },
            include: { customer: true },
          });

          const targets = memberships.filter((m) => {
            if (m.customer.telegramOptOut) return false;
            return membershipToSegment(m) === queueItem.segment;
          });

          let sent = 0;
          for (const membership of targets) {
            const delivery = await prisma.broadcastDelivery.create({
              data: {
                queueId: queueItem.id,
                customerId: membership.customerId,
                telegramId: membership.customer.telegramId,
                status: "pending",
              },
            });

            if (membership.customer.telegramId && process.env.TELEGRAM_BOT_TOKEN) {
              try {
                await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN, membership.customer.telegramId, queueItem.message);
                await prisma.broadcastDelivery.update({
                  where: { id: delivery.id },
                  data: { status: "sent", sentAt: new Date() },
                });
                sent++;
              } catch (err) {
                await prisma.broadcastDelivery.update({
                  where: { id: delivery.id },
                  data: { status: "failed", error: String(err) },
                });
              }
            }

            await new Promise((resolve) => setTimeout(resolve, 1100));
          }

          await prisma.broadcastQueue.update({
            where: { id: queueItem.id },
            data: { status: "completed", attempts: { increment: 1 } },
          });

          results.push({ queueId: queueItem.id, sent });
        } catch (err) {
          await prisma.broadcastQueue.update({
            where: { id: queueItem.id },
            data: { status: "failed", attempts: { increment: 1 }, error: String(err) },
          });
          results.push({ queueId: queueItem.id, error: String(err) });
        }
      }

      return { success: true, processed: results.length, results };
    }),
});

export default broadcastRouter;
