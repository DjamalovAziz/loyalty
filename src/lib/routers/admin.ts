import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, superAdminProcedure, router } from "@/lib/trpc";

const adminRouter = router({
  listTickets: superAdminProcedure
    .input(
      z.object({
        status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const where: any = {};
      if (input.status) where.status = input.status;

      const [items, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          orderBy: { createdAt: "desc" },
          include: {
            customer: { select: { firstName: true, lastName: true, phone: true } },
            business: { select: { name: true, slug: true } },
          },
        }),
        prisma.supportTicket.count({ where }),
      ]);

      return { items, total, limit: input.limit, offset: input.offset };
    }),

  getTicket: superAdminProcedure
    .input(z.object({ ticketId: z.string() }))
    .query(async ({ input }) => {
      return prisma.supportTicket.findUnique({
        where: { id: input.ticketId },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          customer: { select: { firstName: true, lastName: true, phone: true } },
          business: { select: { name: true, slug: true } },
        },
      });
    }),

  updateTicketStatus: superAdminProcedure
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
          resolvedAt: input.status === "RESOLVED" ? new Date() : null,
        },
      });

      return { success: true, ticket };
    }),
});

export default adminRouter;
