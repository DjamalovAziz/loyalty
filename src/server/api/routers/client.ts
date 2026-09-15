import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, clientProcedure } from "~/server/api/trpc";
import { normalizePhone, E164_REGEX } from "~/lib/phone";
import { setWithTtl, keys } from "~/server/redis";
import { sendTelegramMessage } from "~/lib/telegram-bot";
import { db } from "~/server/db";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const clientRouter = createTRPCRouter({
  requestLoginOtp: publicProcedure
    .input(
      z.object({
        phone_number: z.string().regex(E164_REGEX),
        businessSlug: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const phone = normalizePhone(input.phone_number);
      const business = await db.business.findUnique({ where: { slug: input.businessSlug } });
      if (!business) throw new TRPCError({ code: "NOT_FOUND", message: "Business not found." });

      const code = generateOtp();
      await setWithTtl(keys.clientLoginOtp(business.slug, phone), { code }, 300);

      const existingClient = await db.client.findUnique({
        where: { businessId_phoneNumber: { businessId: business.id, phoneNumber: phone } },
      });

      if (existingClient?.telegramChatId) {
        await sendTelegramMessage(
          existingClient.telegramChatId,
          `🔐 Your login code: ${code}`,
        );
        return { delivered: true };
      }

      // No linked Telegram chat yet — direct them to the bot to link + receive the code.
      return {
        delivered: false,
        botLink: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}`,
      };
    }),

  me: clientProcedure.query(({ ctx }) =>
    ctx.db.client.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      include: { tier: true },
    }),
  ),

  myTransactions: clientProcedure.query(({ ctx }) =>
    ctx.db.transaction.findMany({
      where: { clientId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ),

  myTiers: clientProcedure.query(({ ctx }) =>
    ctx.db.loyaltyTier.findMany({
      where: { businessId: ctx.session.user.businessId! },
      orderBy: { minPoints: "asc" },
    }),
  ),
});