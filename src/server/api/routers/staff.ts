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
  membershipId: string,
  businessId: string,
  db: Prisma.TransactionClient,
) {
  const membership = await db.membership.findUniqueOrThrow({ where: { id: membershipId } });
  const tier = await db.loyaltyTier.findFirst({
    where: { businessId, minPoints: { lte: membership.points } },
    orderBy: { minPoints: "desc" },
  });
  await db.membership.update({ where: { id: membershipId }, data: { tierId: tier?.id ?? null } });
}

export const staffRouter = createTRPCRouter({
  /** Search this business's memberships by the underlying customer's phone/name. */
  searchClient: staffProcedure
    .input(z.object({ query: z.string().min(2) }))
    .query(({ ctx, input }) => {
      const businessId = ctx.session.user.businessId!;
      const normalized = normalizePhone(input.query);
      return ctx.db.membership.findMany({
        where: {
          businessId,
          status: "ACTIVE",
          customer: {
            OR: [
              { phoneNumber: { contains: normalized } },
              { name: { contains: input.query, mode: "insensitive" } },
            ],
          },
        },
        include: { tier: true, customer: true },
        take: 10,
      });
    }),

  /**
   * Resolves a scanned/pasted customer QR (which encodes the customer's global id,
   * not anything business-specific) to a membership at this business — creating one
   * on the spot, with the welcome bonus, if this is the customer's first visit here.
   * This is what actually makes QR scanning work: a customer's QR is the same at
   * every business, so the staff side has to be able to "first-touch" it.
   */
  checkInByCustomerId: staffProcedure
    .input(z.object({ customerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId!;
      const customer = await ctx.db.customer.findUnique({ where: { id: input.customerId } });
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "No such customer." });

      const existing = await ctx.db.membership.findUnique({
        where: { customerId_businessId: { customerId: customer.id, businessId } },
        include: { tier: true, customer: true },
      });
      if (existing) {
        if (existing.status === "INACTIVE") {
          return ctx.db.membership.update({
            where: { id: existing.id },
            data: { status: "ACTIVE" },
            include: { tier: true, customer: true },
          });
        }
        return existing;
      }

      const business = await ctx.db.business.findUniqueOrThrow({ where: { id: businessId } });
      return ctx.db.$transaction(async (db) => {
        const membership = await db.membership.create({
          data: { customerId: customer.id, businessId, points: business.welcomePoints },
          include: { tier: true, customer: true },
        });
        if (business.welcomePoints > 0) {
          await db.transaction.create({
            data: {
              businessId,
              membershipId: membership.id,
              amount: business.welcomePoints,
              type: "EARN",
              description: "Welcome bonus",
            },
          });
        }
        return membership;
      });
    }),

  clientProfile: staffProcedure
    .input(z.object({ membershipId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db.membership.findFirstOrThrow({
        where: { id: input.membershipId, businessId: ctx.session.user.businessId! },
        include: { tier: true, customer: true },
      }),
    ),

  earnPoints: staffProcedure
    .input(
      z.object({
        membershipId: z.string().uuid(),
        points: z.number().int().positive(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId!;

      const { tx, membership } = await ctx.db.$transaction(async (db) => {
        const membership = await db.membership.findFirstOrThrow({
          where: { id: input.membershipId, businessId },
          include: { customer: true },
        });
        await db.membership.update({
          where: { id: membership.id },
          data: { points: { increment: input.points } },
        });
        await recalculateTier(membership.id, businessId, db);
        const tx = await db.transaction.create({
          data: {
            businessId,
            membershipId: membership.id,
            staffId: ctx.session.user.id,
            amount: input.points,
            type: "EARN",
            description: input.description,
          },
        });
        return { tx, membership };
      });

      if (membership.customer.telegramChatId) {
        await sendTelegramMessage(
          membership.customer.telegramChatId,
          `✅ You earned ${input.points} points! ${input.description ?? ""}`.trim(),
        );
      }
      return tx;
    }),

  initiateRedeem: staffProcedure
    .input(z.object({ membershipId: z.string().uuid(), points: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId!;
      const membership = await ctx.db.membership.findFirstOrThrow({
        where: { id: input.membershipId, businessId },
        include: { customer: true },
      });
      if (membership.points < input.points) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient points balance." });
      }
      const code = generateOtp();
      const pending: PendingRedeem = { membershipId: membership.id, points: input.points, code };
      await setWithTtl(keys.redemptionOtp(membership.id), pending, 300);

      if (membership.customer.telegramChatId) {
        await sendTelegramMessage(
          membership.customer.telegramChatId,
          `🔐 Redemption code: ${code}\nGive this code to staff to redeem ${input.points} points. Expires in 5 minutes.`,
        );
      }
      return { sent: true };
    }),

  confirmRedeem: staffProcedure
    .input(z.object({ membershipId: z.string().uuid(), otp: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId!;
      const pending = await getAndParse<PendingRedeem>(keys.redemptionOtp(input.membershipId));
      if (!pending || pending.code !== input.otp) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired code." });
      }

      const { tx, membership } = await ctx.db.$transaction(async (db) => {
        const result = await db.membership.updateMany({
          where: { id: input.membershipId, businessId, points: { gte: pending.points } },
          data: { points: { decrement: pending.points } },
        });
        if (result.count === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Insufficient points balance (it may have changed since the code was sent).",
          });
        }
        await recalculateTier(input.membershipId, businessId, db);
        const tx = await db.transaction.create({
          data: {
            businessId,
            membershipId: input.membershipId,
            staffId: ctx.session.user.id,
            amount: pending.points,
            type: "REDEEM",
          },
        });
        const membership = await db.membership.findUniqueOrThrow({
          where: { id: input.membershipId },
          include: { customer: true },
        });
        return { tx, membership };
      });

      await del(keys.redemptionOtp(input.membershipId));

      if (membership.customer.telegramChatId) {
        await sendTelegramMessage(
          membership.customer.telegramChatId,
          `🎉 Redeemed ${pending.points} points successfully.`,
        );
      }
      return tx;
    }),
});
