import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";
import { generateIdempotencyKey } from "@/lib/idempotency";
import { writeAuditLog } from "@/lib/audit";

const adjustmentRouter = router({
  create: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        originalTransactionId: z.string(),
        amount: z.number().int().positive(),
        reason: z.string().min(1).max(500),
        actorId: z.string(),
        actorType: z.enum(["OWNER", "ADMIN", "STAFF"]).default("OWNER"),
      })
    )
    .mutation(async ({ input }) => {
      const original = await prisma.transaction.findUnique({
        where: { id: input.originalTransactionId },
      });

      if (!original || original.businessId !== input.businessId) {
        return { success: false, error: "Original transaction not found" };
      }

      const membership = await prisma.membership.findUnique({
        where: { id: original.membershipId },
      });

      if (!membership) {
        return { success: false, error: "Membership not found" };
      }

      const balanceBefore = membership.points;
      const balanceAfter = balanceBefore + input.amount;

      if (balanceAfter < 0) {
        return { success: false, error: "Insufficient balance" };
      }

      const idempotencyKey = generateIdempotencyKey(`adjustment:${input.originalTransactionId}`);

      const transaction = await prisma.$transaction(async (tx) => {
        const updated = await tx.membership.update({
          where: { id: membership.id },
          data: { points: { increment: input.amount } },
        });

        const adjustmentTx = await tx.transaction.create({
          data: {
            type: "ADJUSTMENT",
            amount: input.amount,
            balanceBefore,
            balanceAfter: updated.points,
            idempotencyKey,
            reason: input.reason,
            referenceId: original.id,
            actorType: input.actorType,
            actorId: input.actorId,
            membershipId: membership.id,
            customerId: original.customerId,
            businessId: input.businessId,
          },
        });

        await tx.adjustment.create({
          data: {
            reason: input.reason,
            actorId: input.actorId,
            actorType: input.actorType,
            originalId: original.id,
            referenceId: adjustmentTx.id,
          },
        });

        await writeAuditLog({
          businessId: input.businessId,
          action: "points.adjustment",
          actorType: input.actorType,
          actorId: input.actorId,
          target: adjustmentTx.id,
          meta: { originalTransactionId: original.id, amount: input.amount, reason: input.reason },
        });

        return adjustmentTx;
      });

      return { success: true, transactionId: transaction.id };
    }),
});

export default adjustmentRouter;
