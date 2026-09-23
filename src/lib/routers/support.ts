import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";
import { writeAuditLog } from "@/lib/audit";
import { sendTelegramMessage } from "@/lib/telegram/notify";

const supportRouter = router({
  create: publicProcedure
    .input(
      z.object({
        customerId: z.string(),
        businessId: z.string(),
        subject: z.string().min(1).max(200),
        message: z.string().min(1).max(4000),
        source: z.enum(["CUSTOMER", "STAFF", "ADMIN", "SYSTEM"]).default("CUSTOMER"),
      })
    )
    .mutation(async ({ input }) => {
      const ticket = await prisma.supportTicket.create({
        data: {
          customerId: input.customerId,
          businessId: input.businessId,
          subject: input.subject,
          message: input.message,
          source: input.source,
        },
      });

      await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          text: input.message,
          source: input.source,
        },
      });

      await writeAuditLog({
        businessId: input.businessId,
        action: "support.ticket.create",
        actorType: input.source,
        actorId: input.customerId,
        target: ticket.id,
        meta: { subject: input.subject },
      });

      const business = await prisma.business.findUnique({
        where: { id: input.businessId },
        select: { telegramGroupId: true, name: true },
      });

      if (business?.telegramGroupId && process.env.TELEGRAM_BOT_TOKEN) {
        sendTelegramMessage(
          process.env.TELEGRAM_BOT_TOKEN,
          business.telegramGroupId,
          `New support ticket: ${input.subject}\nFrom: ${input.source}\nMessage: ${input.message.slice(0, 200)}`
        );
      }

      return { success: true, ticketId: ticket.id };
    }),
});

export default supportRouter;
