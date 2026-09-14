import { z } from "zod";
import { createTRPCRouter, ownerProcedure } from "~/server/api/trpc";

export const loyaltyRouter = createTRPCRouter({
  // --- Tiers ---
  listTiers: ownerProcedure.query(({ ctx }) =>
    ctx.db.loyaltyTier.findMany({
      where: { businessId: ctx.session.user.businessId! },
      orderBy: { minPoints: "asc" },
    }),
  ),

  upsertTier: ownerProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        minPoints: z.number().int().min(0),
        discount: z.number().int().min(0).max(100),
        color: z.string().default("#999999"),
      }),
    )
    .mutation(({ ctx, input }) => {
      const businessId = ctx.session.user.businessId!;
      if (input.id) {
        return ctx.db.loyaltyTier.update({
          where: { id: input.id },
          data: { ...input },
        });
      }
      return ctx.db.loyaltyTier.create({
        data: { ...input, businessId },
      });
    }),

  deleteTier: ownerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => ctx.db.loyaltyTier.delete({ where: { id: input.id } })),

  // --- Rules ---
  listRules: ownerProcedure.query(({ ctx }) =>
    ctx.db.loyaltyRule.findMany({
      where: { businessId: ctx.session.user.businessId! },
    }),
  ),

  upsertRule: ownerProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        triggerType: z.enum(["VISIT", "PURCHASE"]),
        pointsAwarded: z.number().int().min(1),
      }),
    )
    .mutation(({ ctx, input }) => {
      const businessId = ctx.session.user.businessId!;
      if (input.id) {
        return ctx.db.loyaltyRule.update({ where: { id: input.id }, data: { ...input } });
      }
      return ctx.db.loyaltyRule.create({ data: { ...input, businessId } });
    }),

  deleteRule: ownerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => ctx.db.loyaltyRule.delete({ where: { id: input.id } })),

  // --- Dashboard analytics ---
  overview: ownerProcedure.query(async ({ ctx }) => {
    const businessId = ctx.session.user.businessId!;
    const [clientCount, staffCount, txCount, pointsIssued, pointsRedeemed] = await Promise.all([
      ctx.db.client.count({ where: { businessId } }),
      ctx.db.user.count({ where: { businessId, role: "STAFF" } }),
      ctx.db.transaction.count({ where: { businessId } }),
      ctx.db.transaction.aggregate({
        where: { businessId, type: "EARN" },
        _sum: { amount: true },
      }),
      ctx.db.transaction.aggregate({
        where: { businessId, type: "REDEEM" },
        _sum: { amount: true },
      }),
    ]);
    return {
      clientCount,
      staffCount,
      txCount,
      pointsIssued: pointsIssued._sum.amount ?? 0,
      pointsRedeemed: pointsRedeemed._sum.amount ?? 0,
    };
  }),

  // --- Staff management ---
  listStaff: ownerProcedure.query(({ ctx }) =>
    ctx.db.user.findMany({
      where: { businessId: ctx.session.user.businessId!, role: "STAFF" },
      select: { id: true, name: true, phoneNumber: true, verified: true, createdAt: true },
    }),
  ),

  inviteStaff: ownerProcedure
    .input(
      z.object({
        name: z.string().min(2),
        phone_number: z.string(),
        pin: z.string().length(4).regex(/^\d+$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const bcrypt = await import("bcryptjs");
      const { normalizePhone } = await import("~/lib/phone");
      return ctx.db.user.create({
        data: {
          name: input.name,
          phoneNumber: normalizePhone(input.phone_number),
          pin: await bcrypt.hash(input.pin, 10),
          role: "STAFF",
          verified: true, // staff are created directly by the owner, no Telegram verification needed
          businessId: ctx.session.user.businessId!,
        },
      });
    }),
});
