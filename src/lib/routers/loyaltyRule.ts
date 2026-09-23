import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";

const loyaltyRuleRouter = router({
  list: publicProcedure
    .input(z.object({ businessId: z.string() }))
    .query(async ({ input }) => {
      return prisma.loyaltyRule.findMany({
        where: { businessId: input.businessId },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        type: z.enum(["REFERRAL", "BIRTHDAY", "ANNIVERSARY", "SPENDING_THRESHOLD", "VISIT_COUNT", "INACTIVITY", "TIER_UPGRADE", "PROMO"]),
        payload: z.record(z.any()),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.loyaltyRule.findFirst({
        where: { businessId: input.businessId, type: input.type },
      });

      if (existing) {
        return prisma.loyaltyRule.update({
          where: { id: existing.id },
          data: { payload: input.payload, isActive: input.isActive },
        });
      }

      return prisma.loyaltyRule.create({
        data: {
          businessId: input.businessId,
          type: input.type,
          payload: input.payload,
          isActive: input.isActive,
        },
      });
    }),

  execute: publicProcedure
    .input(
      z.object({
        ruleId: z.string(),
        entityId: z.string(),
        secret: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.secret !== process.env.CRON_SECRET) {
        return { success: false, error: "Unauthorized" };
      }

      const rule = await prisma.loyaltyRule.findUnique({
        where: { id: input.ruleId },
      });

      if (!rule || !rule.isActive) {
        return { success: false, error: "Rule not found or inactive" };
      }

      const existing = await prisma.ruleExecution.findUnique({
        where: { ruleId_entityId: { ruleId: input.ruleId, entityId: input.entityId } },
      });

      if (existing) {
        return { success: true, message: "Already executed" };
      }

      await prisma.ruleExecution.create({
        data: {
          ruleId: input.ruleId,
          entityId: input.entityId,
        },
      });

      return { success: true, message: "Rule executed" };
    }),
});

export default loyaltyRuleRouter;
