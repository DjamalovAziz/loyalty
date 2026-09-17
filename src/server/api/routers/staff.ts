import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, staffProcedure } from "~/server/api/trpc";
import { normalizePhone } from "~/lib/phone";
import { setWithTtl, getAndParse, del, keys, type PendingRedeem } from "~/server/redis";
import { sendTelegramMessage } from "~/lib/telegram-bot";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function recalculateTier(
  clientId: string,
  businessId: string,
  db: Prisma.TransactionClient,
) {
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

      // Wrapped in a transaction so a balance change and its Transaction log entry
      // either both land or neither does — no partial writes if something downstream
      // (tier recalc, the log insert) fails after the balance already moved.
      const { tx, client } = await ctx.db.$transaction(async (db) => {
        const client = await db.client.findFirstOrThrow({
          where: { id: input.clientId, businessId },
        });
        await db.client.update({
          where: { id: client.id },
          data: { points: { increment: input.points } },
        });
        await recalculateTier(client.id, businessId, db);
        const tx = await db.transaction.create({
          data: {
            businessId,
            clientId: client.id,
            staffId: ctx.session.user.id,
            amount: input.points,
            type: "EARN",
            description: input.description,
          },
        });
        return { tx, client };
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
      // This is just a friendly early check for the UI — NOT the source of truth.
      // The actual balance guard is the atomic conditional update in confirmRedeem
      // below; the balance can still change between initiate and confirm (e.g. two
      // redemptions in flight, or points spent elsewhere), so it must be re-checked
      // atomically at confirmation time regardless of what we saw here.
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

      // Atomic conditional decrement: UPDATE ... WHERE points >= X is evaluated and
      // applied by Postgres as one locked operation on the row, so two concurrent
      // confirmRedeem calls for the same client can never both succeed against a
      // balance that only covers one of them — the second one's WHERE clause simply
      // won't match once the first has landed. This closes a real race condition
      // that a "read balance, check in JS, then update" sequence does not.
      const { tx, client } = await ctx.db.$transaction(async (db) => {
        const result = await db.client.updateMany({
          where: { id: input.clientId, businessId, points: { gte: pending.points } },
          data: { points: { decrement: pending.points } },
        });
        if (result.count === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Insufficient points balance (it may have changed since the code was sent).",
          });
        }
        await recalculateTier(input.clientId, businessId, db);
        const tx = await db.transaction.create({
          data: {
            businessId,
            clientId: input.clientId,
            staffId: ctx.session.user.id,
            amount: pending.points,
            type: "REDEEM",
          },
        });
        const client = await db.client.findUniqueOrThrow({ where: { id: input.clientId } });
        return { tx, client };
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
