import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";

export const adminRouter = createTRPCRouter({
  overview: adminProcedure.query(async ({ ctx }) => {
    const [businessCount, ownerCount, staffCount, clientCount, txCount] = await Promise.all([
      ctx.db.business.count(),
      ctx.db.user.count({ where: { role: "BUSINESS_OWNER" } }),
      ctx.db.user.count({ where: { role: "STAFF" } }),
      ctx.db.client.count(),
      ctx.db.transaction.count(),
    ]);
    return { businessCount, ownerCount, staffCount, clientCount, txCount };
  }),

  listBusinesses: adminProcedure.query(({ ctx }) =>
    ctx.db.business.findMany({
      include: {
        owner: { select: { name: true, phoneNumber: true, verified: true } },
        _count: { select: { clients: true, staff: true, transactions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ),

  listUsers: adminProcedure
    .input(z.object({ role: z.enum(["BUSINESS_OWNER", "STAFF"]).optional() }).optional())
    .query(({ ctx, input }) =>
      ctx.db.user.findMany({
        where: input?.role ? { role: input.role } : { role: { in: ["BUSINESS_OWNER", "STAFF"] } },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          role: true,
          verified: true,
          createdAt: true,
          business: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ),

  setBusinessOwnerVerified: adminProcedure
    .input(z.object({ userId: z.string().uuid(), verified: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.user.update({ where: { id: input.userId }, data: { verified: input.verified } }),
    ),
});
