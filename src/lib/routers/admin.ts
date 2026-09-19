import { z } from "zod";
import { protectedProcedure, router } from "@/lib/trpc";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const adminRouter = router({
  listTickets: protectedProcedure
    .input(
      z.object({
        businessId: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = {};

      if (input.businessId) where.businessId = input.businessId;
      if (input.status) where.status = input.status;

      const tickets = await prisma.supportTicket.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { id: true, phone: true, name: true, telegramUsername: true },
          },
          business: {
            select: { id: true, name: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (tickets.length > input.limit) {
        const nextItem = tickets.pop();
        nextCursor = nextItem!.id;
      }

      return { items: tickets, nextCursor };
    }),

  updateTicketStatus: protectedProcedure
    .input(
      z.object({
        ticketId: z.string(),
        status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
      })
    )
    .mutation(async ({ input }) => {
      const ticket = await prisma.supportTicket.update({
        where: { id: input.ticketId },
        data: {
          status: input.status,
          resolvedAt: input.status === "RESOLVED" ? new Date() : undefined,
        },
      });

      await logAudit({
        action: "ticket_updated",
        actorType: "admin",
        resourceType: "support_ticket",
        resourceId: ticket.id,
        metadata: { status: input.status },
      });

      return { success: true, ticket };
    }),
});
