import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, customerProcedure } from "~/server/api/trpc";
import { normalizePhone, E164_REGEX } from "~/lib/phone";
import { setWithTtl, keys } from "~/server/redis";
import { sendTelegramMessage } from "~/lib/telegram-bot";
import { db } from "~/server/db";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const customerRouter = createTRPCRouter({
  requestLoginOtp: publicProcedure
    .input(z.object({ phone_number: z.string().regex(E164_REGEX) }))
    .mutation(async ({ input }) => {
      const phone = normalizePhone(input.phone_number);
      const code = generateOtp();
      await setWithTtl(keys.customerLoginOtp(phone), { code }, 300);

      const existing = await db.customer.findUnique({ where: { phoneNumber: phone } });
      if (existing?.telegramChatId) {
        await sendTelegramMessage(existing.telegramChatId, `🔐 Your login code: ${code}`);
        return { delivered: true };
      }

      // No linked Telegram chat yet — direct them to the bot to link + receive the code.
      return {
        delivered: false,
        botLink: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}`,
      };
    }),

  me: customerProcedure.query(({ ctx }) =>
    db.customer.findUniqueOrThrow({ where: { id: ctx.session.user.id } }),
  ),

  /** All of the customer's memberships (active and inactive), one per business joined. */
  myMemberships: customerProcedure.query(({ ctx }) =>
    db.membership.findMany({
      where: { customerId: ctx.session.user.id },
      include: { business: true, tier: true },
      orderBy: { createdAt: "desc" },
    }),
  ),

  /** This customer's membership in one specific business, if any (by slug). */
  membershipFor: customerProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const business = await db.business.findUnique({ where: { slug: input.slug } });
      if (!business) throw new TRPCError({ code: "NOT_FOUND", message: "Business not found." });
      const membership = await db.membership.findUnique({
        where: { customerId_businessId: { customerId: ctx.session.user.id, businessId: business.id } },
        include: { tier: true },
      });
      return { business, membership };
    }),

  myTransactions: customerProcedure
    .input(z.object({ membershipId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      db.transaction.findMany({
        where: {
          membershipId: input.membershipId,
          membership: { customerId: ctx.session.user.id },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ),

  join: customerProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const business = await db.business.findUnique({ where: { slug: input.slug } });
      if (!business) throw new TRPCError({ code: "NOT_FOUND", message: "Business not found." });

      const existing = await db.membership.findUnique({
        where: { customerId_businessId: { customerId: ctx.session.user.id, businessId: business.id } },
      });

      // Re-joining after a previous leave: reactivate, but don't re-grant the welcome
      // bonus and don't touch the points balance — it was preserved on leave.
      if (existing) {
        if (existing.status === "ACTIVE") return existing;
        return db.membership.update({ where: { id: existing.id }, data: { status: "ACTIVE" } });
      }

      const membership = await db.$transaction(async (tx) => {
        const created = await tx.membership.create({
          data: {
            customerId: ctx.session.user.id,
            businessId: business.id,
            points: business.welcomePoints,
          },
        });
        if (business.welcomePoints > 0) {
          await tx.transaction.create({
            data: {
              businessId: business.id,
              membershipId: created.id,
              amount: business.welcomePoints,
              type: "EARN",
              description: "Welcome bonus",
            },
          });
        }
        return created;
      });

      return { ...membership, telegramGroupUrl: business.telegramGroupUrl };
    }),

  leave: customerProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const business = await db.business.findUnique({ where: { slug: input.slug } });
      if (!business) throw new TRPCError({ code: "NOT_FOUND", message: "Business not found." });
      // Points are preserved, not zeroed — a customer who leaves by accident (or comes
      // back in a few months) shouldn't lose their loyalty history. Rejoining via
      // `join` just flips status back to ACTIVE.
      return db.membership.update({
        where: { customerId_businessId: { customerId: ctx.session.user.id, businessId: business.id } },
        data: { status: "INACTIVE" },
      });
    }),
});
