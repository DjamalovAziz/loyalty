import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { sendTelegramMessage } from "~/lib/telegram-bot";
import { auth } from "~/server/auth";

export const supportRouter = createTRPCRouter({
  // Public (not gated behind a specific role) — an owner, staff member, or customer
  // might all need support, and none of those three share a common procedure guard.
  create: publicProcedure
    .input(
      z.object({
        phone: z.string().min(3),
        name: z.string().optional(),
        subject: z.string().min(1),
        message: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const session = await auth();
      const customerId = session?.user.role === "CUSTOMER" ? session.user.id : undefined;

      const ticket = await db.supportTicket.create({
        data: {
          customerId,
          phone: input.phone,
          name: input.name,
          subject: input.subject,
          message: input.message,
        },
      });

      const devChatId = process.env.DEV_SUPPORT_TELEGRAM_CHAT_ID;
      if (devChatId) {
        await sendTelegramMessage(
          devChatId,
          `🆘 New support ticket #${ticket.id.slice(0, 8)}\n` +
            `From: ${input.name ?? "—"} (${input.phone})\n` +
            `Subject: ${input.subject}\n\n${input.message}`,
        );
      }

      return { id: ticket.id };
    }),
});
