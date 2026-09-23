import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";

const referralRouter = router({
  create: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        referrerId: z.string(),
        refereeId: z.string(),
        rewardPoints: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.referrerId === input.refereeId) {
        return { success: false, error: "Self-referral is not allowed" };
      }

      const business = await prisma.business.findUnique({
        where: { id: input.businessId },
      });
      if (!business) return { success: false, error: "Business not found" };

      const referrer = await prisma.membership.findFirst({
        where: { customerId: input.referrerId, businessId: input.businessId },
      });
      const referee = await prisma.membership.findFirst({
        where: { customerId: input.refereeId, businessId: input.businessId },
      });

      if (!referrer || !referee) return { success: false, error: "Membership not found" };

      const existingReferral = await prisma.referral.findFirst({
        where: {
          referrerId: input.referrerId,
          refereeId: input.refereeId,
          businessId: input.businessId,
        },
      });

      if (existingReferral) {
        return { success: false, error: "Referral already exists" };
      }

      const result = await prisma.$transaction(async (tx) => {
        const [updatedReferrer, updatedReferee, referral, rule] = await Promise.all([
          tx.membership.update({
            where: { id: referrer.id },
            data: { points: { increment: input.rewardPoints } },
          }),
          tx.membership.update({
            where: { id: referee.id },
            data: { points: { increment: input.rewardPoints } },
          }),
          tx.referral.create({
            data: {
              referrerId: input.referrerId,
              refereeId: input.refereeId,
              businessId: input.businessId,
              rewardPoints: input.rewardPoints,
            },
          }),
          tx.loyaltyRule.findFirst({
            where: { businessId: input.businessId, type: "REFERRAL" },
          }),
        ]);

        if (rule) {
          await tx.ruleExecution.create({
            data: {
              ruleId: rule.id,
              entityId: referral.id,
            },
          });
        }

        return { updatedReferrer, updatedReferee, referral };
      });

      return { success: true, referralId: result.referral.id };
    }),
});

export default referralRouter;
