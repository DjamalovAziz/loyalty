import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, staffProcedure } from "~/server/api/trpc";
import { normalizePhone } from "~/lib/phone";
import { setWithTtl, getAndParse, del, keys, type PendingRedeem } from "~/server/redis";
import { sendTelegramMessage } from "~/lib/telegram-bot";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function recalculateTier(clientId: string, businessId: string, db: any) {
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  const tier = await db.loyaltyTier.findFirst({
    where: { businessId, minPoints: { lte: client.points } },
    orderBy: { minPoints: "desc" },
  });
  await db.client.update({ where: { id: clientId }, data: { tierId: tier?.id ?? null } });
}

export const staffRouter = createTRPCRouter({
  searchClient: staffProcedure
    .input(z.object({ query: z.string().min(2) }))
    .query(({ ctx, input }) => {
      const businessId = ctx.session.user.businessId!;
      const normalized = normalizePhone(input.query);
      return ctx.db.client.findMany({
        where: {
          businessId,
          OR: [
            { phoneNumber: { contains: normalized } },
            { name: { contains: input.query, mode: "insensitive" } },
          ],
        },
        include: { tier: true },
        take: 10,
      });
    }),

  clientProfile: staffProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db.client.findFirstOrThrow({
        where: { id: input.clientId, businessId: ctx.session.user.businessId! },
        include: { tier: true },
      }),
    ),

  earnPoints: staffProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        points: z.number().int().positive(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId!;
      const client = await ctx.db.client.findFirstOrThrow({
        where: { id: input.clientId, businessId },
      });
      await ctx.db.client.update({
        where: { id: client.id },
        data: { points: { increment: input.points } },
      });
      await recalculateTier(client.id, businessId, ctx.db);
      const tx = await ctx.db.transaction.create({
        data: {
          businessId,
          clientId: client.id,
          staffId: ctx.session.user.id,
          amount: input.points,
          type: "EARN",
          description: input.description,
        },
      });
      if (client.telegramChatId) {
        await sendTelegramMessage(
          client.telegramChatId,
          `✅ You earned ${input.points} points! ${input.description ?? ""}`.trim(),
        );
      }
      return tx;
    }),

  initiateRedeem: staffProcedure
    .input(z.object({ clientId: z.string().uuid(), points: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId!;
      const client = await ctx.db.client.findFirstOrThrow({
        where: { id: input.clientId, businessId },
      });
      if (client.points < input.points) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient points balance." });
      }
      const code = generateOtp();
      const pending: PendingRedeem = { clientId: client.id, points: input.points, code };
      await setWithTtl(keys.clientOtp(client.id), pending, 300);

      if (client.telegramChatId) {
        await sendTelegramMessage(
          client.telegramChatId,
          `🔐 Redemption code: ${code}\nGive this code to staff to redeem ${input.points} points. Expires in 5 minutes.`,
        );
      }
      return { sent: true };
    }),

  confirmRedeem: staffProcedure
    .input(z.object({ clientId: z.string().uuid(), otp: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId!;
      const pending = await getAndParse<PendingRedeem>(keys.clientOtp(input.clientId));
      if (!pending || pending.code !== input.otp) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired code." });
      }
      const client = await ctx.db.client.findFirstOrThrow({
        where: { id: input.clientId, businessId },
      });
      if (client.points < pending.points) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient points balance." });
      }

      await ctx.db.client.update({
        where: { id: client.id },
        data: { points: { decrement: pending.points } },
      });
      await recalculateTier(client.id, businessId, ctx.db);
      const tx = await ctx.db.transaction.create({
        data: {
          businessId,
          clientId: client.id,
          staffId: ctx.session.user.id,
          amount: pending.points,
          type: "REDEEM",
        },
      });
      await del(keys.clientOtp(input.clientId));

      if (client.telegramChatId) {
        await sendTelegramMessage(
          client.telegramChatId,
          `🎉 Redeemed ${pending.points} points successfully.`,
        );
      }
      return tx;
    }),
});
