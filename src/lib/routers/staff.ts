/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { publicProcedure, router } from "@/lib/trpc";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";

export const staffRouter = router({
  initiateRedeem: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        customerId: z.string(),
        amount: z.number().int().positive(),
        description: z.string().optional(),
        actorId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const limited = await rateLimit({
        key: `redeem:${input.businessId}:${input.customerId}`,
        limit: 5,
        window: "1 m",
      });
      if (limited) return limited;

      const membership = await prisma.membership.findUnique({
        where: {
          customerId_businessId: {
            customerId: input.customerId,
            businessId: input.businessId,
          },
        },
      });

      if (!membership || !membership.isActive) {
        throw new Error("Membership not found");
      }

      if (membership.points < input.amount) {
        throw new Error("Insufficient balance");
      }

      const result = await prisma.$transaction(async (tx: any) => {
        const updated = await tx.membership.update({
          where: { id: membership.id },
          data: { points: { decrement: input.amount } },
        });

        const txn = await tx.transaction.create({
          data: {
            type: "REDEEM",
            amount: input.amount,
            description: input.description || "Redeem",
            membershipId: membership.id,
            businessId: input.businessId,
            customerId: input.customerId,
            actorId: input.actorId,
            actorType: "STAFF",
          },
        });

        return { membership: updated, transaction: txn };
      });

      await logAudit({
        action: "redeem_initiated",
        actorId: input.actorId,
        actorType: "STAFF",
        businessId: input.businessId,
        customerId: input.customerId,
        resourceType: "transaction",
        resourceId: result.transaction.id,
        metadata: { amount: input.amount },
      });

      return { success: true, transaction: result.transaction, newBalance: result.membership.points };
    }),

  confirmRedeem: publicProcedure
    .input(
      z.object({
        transactionId: z.string(),
        actorId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const transaction = await prisma.transaction.findUnique({
        where: { id: input.transactionId },
      });

      if (!transaction || transaction.type !== "REDEEM") {
        throw new Error("Transaction not found");
      }

      await logAudit({
        action: "redeem_confirmed",
        actorId: input.actorId,
        actorType: "STAFF",
        businessId: transaction.businessId,
        customerId: transaction.customerId,
        resourceType: "transaction",
        resourceId: transaction.id,
      });

      return { success: true };
    }),

  earnPoints: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        customerId: z.string(),
        amount: z.number().int().positive(),
        description: z.string().optional(),
        actorId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const membership = await prisma.membership.findUnique({
        where: {
          customerId_businessId: {
            customerId: input.customerId,
            businessId: input.businessId,
          },
        },
      });

      if (!membership || !membership.isActive) {
        throw new Error("Membership not found");
      }

      const result = await prisma.$transaction(async (tx: any) => {
        const updated = await tx.membership.update({
          where: { id: membership.id },
          data: { points: { increment: input.amount } },
        });

        const txn = await tx.transaction.create({
          data: {
            type: "EARN",
            amount: input.amount,
            description: input.description || "Earn points",
            membershipId: membership.id,
            businessId: input.businessId,
            customerId: input.customerId,
            actorId: input.actorId,
            actorType: "STAFF",
          },
        });

        return { membership: updated, transaction: txn };
      });

      await logAudit({
        action: "earn_points",
        actorId: input.actorId,
        actorType: "STAFF",
        businessId: input.businessId,
        customerId: input.customerId,
        resourceType: "transaction",
        resourceId: result.transaction.id,
        metadata: { amount: input.amount },
      });

      return { success: true, transaction: result.transaction, newBalance: result.membership.points };
    }),

  checkInByCustomerId: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        customerId: z.string(),
        actorId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const membership = await prisma.membership.findUnique({
        where: {
          customerId_businessId: {
            customerId: input.customerId,
            businessId: input.businessId,
          },
        },
      });

      if (!membership || !membership.isActive) {
        throw new Error("Membership not found");
      }

      const business = await prisma.business.findUnique({
        where: { id: input.businessId },
        select: { welcomePoints: true },
      });

      if (!business) {
        throw new Error("Business not found");
      }

      if (business.welcomePoints > 0) {
        const result = await prisma.$transaction(async (tx: any) => {
          const updated = await tx.membership.update({
            where: { id: membership.id },
            data: { points: { increment: business.welcomePoints } },
          });

          const txn = await tx.transaction.create({
            data: {
              type: "EARN",
              amount: business.welcomePoints,
              description: "Check-in bonus",
              membershipId: membership.id,
              businessId: input.businessId,
              customerId: input.customerId,
              actorId: input.actorId,
              actorType: "STAFF",
            },
          });

          return { membership: updated, transaction: txn };
        });

        await logAudit({
          action: "checkin",
          actorId: input.actorId,
          actorType: "STAFF",
          businessId: input.businessId,
          customerId: input.customerId,
          resourceType: "transaction",
          resourceId: result.transaction.id,
        });

        return { success: true, transaction: result.transaction, newBalance: result.membership.points };
      }

      await logAudit({
        action: "checkin",
        actorId: input.actorId,
        actorType: "STAFF",
        businessId: input.businessId,
        customerId: input.customerId,
      });

      return { success: true };
    }),

  adjustTransaction: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        originalTransactionId: z.string(),
        amount: z.number().int().positive(),
        reason: z.string().min(1),
        actorId: z.string(),
        actorType: z.enum(["OWNER", "STAFF", "ADMIN"]),
      })
    )
    .mutation(async ({ input }) => {
      const original = await prisma.transaction.findUnique({
        where: { id: input.originalTransactionId },
      });

      if (!original || original.businessId !== input.businessId) {
        throw new Error("Original transaction not found");
      }

      const membership = await prisma.membership.findUnique({
        where: { id: original.membershipId },
      });

      if (!membership) {
        throw new Error("Membership not found");
      }

      const result = await prisma.$transaction(async (tx: any) => {
        const updated = await tx.membership.update({
          where: { id: membership.id },
          data: { points: { increment: input.amount } },
        });

        const adjustment = await tx.transaction.create({
          data: {
            type: "ADJUSTMENT",
            amount: input.amount,
            description: input.reason,
            membershipId: membership.id,
            businessId: input.businessId,
            customerId: original.customerId,
            actorId: input.actorId,
            actorType: input.actorType,
            originalTransactionId: original.id,
            metadata: {
              originalType: original.type,
              originalAmount: original.amount,
            },
          },
        });

        return { membership: updated, adjustment };
      });

      await logAudit({
        action: "transaction_adjusted",
        actorId: input.actorId,
        actorType: input.actorType,
        businessId: input.businessId,
        customerId: original.customerId,
        resourceType: "transaction",
        resourceId: result.adjustment.id,
        metadata: {
          originalTransactionId: original.id,
          amount: input.amount,
          reason: input.reason,
        },
      });

      return { success: true, adjustment: result.adjustment, newBalance: result.membership.points };
    }),
});
