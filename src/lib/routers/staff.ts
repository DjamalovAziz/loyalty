import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc";
import { hashPin, verifyPin } from "@/lib/pin";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const staffRouter = router({
  loginWithPin: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        email: z.string().email(),
        pin: z.string().min(4).max(12),
      })
    )
    .mutation(async ({ input }) => {
      const account = await prisma.account.findUnique({
        where: { email: input.email },
      });

      if (!account) {
        return { success: false, error: "Invalid credentials" };
      }

      const staffAccount = await prisma.staffAccount.findFirst({
        where: { accountId: account.id, businessId: input.businessId },
      });

      if (!staffAccount) {
        return { success: false, error: "Invalid credentials" };
      }

      if (!staffAccount.isActive) {
        return { success: false, error: "Account inactive" };
      }

      const now = new Date();
      if (staffAccount.lockedUntil && staffAccount.lockedUntil > now) {
        const remaining = Math.ceil((staffAccount.lockedUntil.getTime() - now.getTime()) / 60000);
        return { success: false, error: `Account locked for ${remaining} min` };
      }

      const isValid = await verifyPin(input.pin, staffAccount.pinHash);
      if (!isValid) {
        const newFailed = staffAccount.failedAttempts + 1;
        const lockedUntil =
          newFailed >= MAX_FAILED_ATTEMPTS
            ? new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000)
            : null;

        await prisma.staffAccount.update({
          where: { id: staffAccount.id },
          data: { failedAttempts: newFailed, lockedUntil },
        });

        return { success: false, error: "Invalid PIN" };
      }

      await prisma.staffAccount.update({
        where: { id: staffAccount.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });

      return { success: true, staffAccountId: staffAccount.id };
    }),

  earnPoints: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        staffAccountId: z.string(),
        customerId: z.string(),
        amount: z.number().int().positive(),
        idempotencyKey: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const membership = await prisma.membership.findUnique({
        where: { customerId_businessId: { customerId: input.customerId, businessId: input.businessId } },
      });

      if (!membership) {
        const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
        if (!customer) return { success: false, error: "Customer not found" };

        const newMembership = await prisma.membership.create({
          data: { customerId: input.customerId, businessId: input.businessId, points: 0 },
        });

        const idempotencyKey = input.idempotencyKey;
        const existing = await prisma.transaction.findUnique({ where: { idempotencyKey } });
        if (existing) return { success: true, transactionId: existing.id };

        const result = await prisma.$transaction(async (tx) => {
          const updated = await tx.membership.update({
            where: { id: newMembership.id },
            data: { points: { increment: input.amount } },
          });
          return tx.transaction.create({
            data: {
              type: "EARN",
              amount: input.amount,
              balanceBefore: 0,
              balanceAfter: updated.points,
              idempotencyKey,
              actorType: "STAFF",
              actorId: input.staffAccountId,
              membershipId: newMembership.id,
              customerId: input.customerId,
              businessId: input.businessId,
            },
          });
        });

        return { success: true, transactionId: result.id };
      }

      const existing = await prisma.transaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) return { success: true, transactionId: existing.id };

      const balanceBefore = membership.points;

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.membership.update({
          where: { id: membership.id },
          data: { points: { increment: input.amount } },
        });
        return tx.transaction.create({
          data: {
            type: "EARN",
            amount: input.amount,
            balanceBefore,
            balanceAfter: updated.points,
            idempotencyKey: input.idempotencyKey,
            actorType: "STAFF",
            actorId: input.staffAccountId,
            membershipId: membership.id,
            customerId: input.customerId,
            businessId: input.businessId,
          },
        });
      });

      return { success: true, transactionId: result.id };
    }),

  initiateRedeem: publicProcedure
    .input(
      z.object({
        businessId: z.string(),
        staffAccountId: z.string(),
        customerId: z.string(),
        amount: z.number().int().positive(),
        idempotencyKey: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const membership = await prisma.membership.findUnique({
        where: { customerId_businessId: { customerId: input.customerId, businessId: input.businessId } },
      });

      if (!membership || !membership.isActive) {
        return { success: false, error: "Membership not found or inactive" };
      }

      const existing = await prisma.transaction.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (existing) {
        return { success: true, transactionId: existing.id };
      }

      const balanceBefore = membership.points;

      const transaction = await prisma.$transaction(async (tx) => {
        const updated = await tx.membership.update({
          where: { id: membership.id },
          data: { points: { decrement: input.amount } },
        });

        if (updated.points < 0) {
          throw new Error("Insufficient balance");
        }

        return tx.transaction.create({
          data: {
            type: "REDEEM",
            amount: input.amount,
            balanceBefore,
            balanceAfter: updated.points,
            idempotencyKey: input.idempotencyKey,
            actorType: "STAFF",
            actorId: input.staffAccountId,
            membershipId: membership.id,
            customerId: input.customerId,
            businessId: input.businessId,
          },
        });
      });

      return { success: true, transactionId: transaction.id };
    }),

  confirmRedeem: publicProcedure
    .input(z.object({ transactionId: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.transaction.findUnique({
        where: { id: input.transactionId },
      });

      if (!existing || existing.type !== "REDEEM") {
        return { success: false, error: "Transaction not found" };
      }

      return { success: true };
    }),

  checkInByCustomerId: publicProcedure
    .input(z.object({ businessId: z.string(), customerId: z.string(), staffAccountId: z.string() }))
    .mutation(async ({ input }) => {
      const membership = await prisma.membership.findUnique({
        where: { customerId_businessId: { customerId: input.customerId, businessId: input.businessId } },
      });

      if (!membership || !membership.isActive) {
        return { success: false, error: "Membership not found or inactive" };
      }

      return { success: true, points: membership.points };
    }),

  manualCheckIn: publicProcedure
    .input(z.object({ businessId: z.string(), customerId: z.string(), staffAccountId: z.string(), confirmationCode: z.string() }))
    .mutation(async ({ input }) => {
      if (input.confirmationCode !== process.env.CRON_SECRET) {
        return { success: false, error: "Invalid confirmation code" };
      }

      const membership = await prisma.membership.findUnique({
        where: { customerId_businessId: { customerId: input.customerId, businessId: input.businessId } },
      });

      if (!membership || !membership.isActive) {
        return { success: false, error: "Membership not found or inactive" };
      }

      await prisma.membership.update({
        where: { id: membership.id },
        data: { lastEarnAt: new Date() },
      });

      return { success: true, points: membership.points };
    }),
});

export default staffRouter;
