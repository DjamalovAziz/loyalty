import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Concurrency and idempotency", () => {
  beforeAll(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "Transaction", "AuditLog", "Adjustment", "SupportMessage", "SupportTicket", "StaffPermission", "StaffAccount", "OtpCode", "Membership", "Customer", "Business", "Account" CASCADE`;
  });

  it("should prevent double spend on concurrent redeems", async () => {
    const account = await prisma.account.create({
      data: { name: "TestA", email: "test-ds2@test.com", role: "CUSTOMER" },
    });
    const customer = await prisma.customer.create({
      data: { accountId: account.id, phone: "+998900000007" },
    });
    const owner = await prisma.account.create({
      data: { name: "OwnerA", email: "owner-ds2@test.com", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "Test BizA", slug: "test-ds2", ownerId: owner.id },
    });
    const membership = await prisma.membership.create({
      data: { customerId: customer.id, businessId: business.id, points: 50 },
    });

    const results = await Promise.allSettled(
      Array.from({ length: 3 }).map(async (_, i) => {
        return prisma.$transaction(async (tx) => {
          const updated = await tx.membership.update({
            where: { id: membership.id },
            data: { points: { decrement: 30 } },
          });
          if (updated.points < 0) throw new Error("Insufficient balance");
          return tx.transaction.create({
            data: {
              type: "REDEEM",
              amount: 30,
              balanceBefore: 50,
              balanceAfter: updated.points,
              idempotencyKey: `ds-${Date.now()}-${i}`,
              actorType: "STAFF",
              actorId: "staff-1",
              membershipId: membership.id,
              customerId: customer.id,
              businessId: business.id,
            },
          });
        });
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    expect(succeeded).toBeGreaterThanOrEqual(1);

    const finalMembership = await prisma.membership.findUnique({ where: { id: membership.id } });
    expect(finalMembership?.points).toBeGreaterThanOrEqual(0);
  });

  it("should handle concurrent earn and redeem safely", async () => {
    const account = await prisma.account.create({
      data: { name: "TestB", email: "test-cer2@test.com", role: "CUSTOMER" },
    });
    const customer = await prisma.customer.create({
      data: { accountId: account.id, phone: "+998900000008" },
    });
    const owner = await prisma.account.create({
      data: { name: "OwnerB", email: "owner-cer2@test.com", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "Test BizB", slug: "test-cer2", ownerId: owner.id },
    });
    const membership = await prisma.membership.create({
      data: { customerId: customer.id, businessId: business.id, points: 50 },
    });

    const results = await Promise.allSettled(
      Array.from({ length: 2 }).map(async (_, i) => {
        if (i === 0) {
          return prisma.$transaction(async (tx) => {
            const updated = await tx.membership.update({
              where: { id: membership.id },
              data: { points: { increment: 20 } },
            });
            return tx.transaction.create({
              data: {
                type: "EARN",
                amount: 20,
                balanceBefore: 50,
                balanceAfter: updated.points,
                idempotencyKey: `cer-earn-${Date.now()}`,
                actorType: "STAFF",
                actorId: "staff-1",
                membershipId: membership.id,
                customerId: customer.id,
                businessId: business.id,
              },
            });
          });
        } else {
          return prisma.$transaction(async (tx) => {
            const updated = await tx.membership.update({
              where: { id: membership.id },
              data: { points: { decrement: 10 } },
            });
            if (updated.points < 0) throw new Error("Insufficient balance");
            return tx.transaction.create({
              data: {
                type: "REDEEM",
                amount: 10,
                balanceBefore: 50,
                balanceAfter: updated.points,
                idempotencyKey: `cer-redeem-${Date.now()}`,
                actorType: "STAFF",
                actorId: "staff-1",
                membershipId: membership.id,
                customerId: customer.id,
                businessId: business.id,
              },
            });
          });
        }
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    expect(succeeded).toBe(2);

    const finalMembership = await prisma.membership.findUnique({ where: { id: membership.id } });
    expect(finalMembership?.points).toBeGreaterThanOrEqual(0);
  });

  it("should enforce idempotency on duplicate requests", async () => {
    const account = await prisma.account.create({
      data: { name: "TestC", email: "test-idem3@test.com", role: "CUSTOMER" },
    });
    const customer = await prisma.customer.create({
      data: { accountId: account.id, phone: "+998900000009" },
    });
    const owner = await prisma.account.create({
      data: { name: "OwnerC", email: "owner-idem3@test.com", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "Test BizC", slug: "test-idem3", ownerId: owner.id },
    });
    const membership = await prisma.membership.create({
      data: { customerId: customer.id, businessId: business.id, points: 100 },
    });

    const idempotencyKey = "earn-idem-456";

    await prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({
        where: { id: membership.id },
        data: { points: { increment: 10 } },
      });
      return tx.transaction.create({
        data: {
          type: "EARN",
          amount: 10,
          balanceBefore: 100,
          balanceAfter: updated.points,
          idempotencyKey,
          actorType: "STAFF",
          actorId: "staff-1",
          membershipId: membership.id,
          customerId: customer.id,
          businessId: business.id,
        },
      });
    });

    await expect(
      prisma.$transaction(async (tx) => {
        const updated = await tx.membership.update({
          where: { id: membership.id },
          data: { points: { increment: 10 } },
        });
        return tx.transaction.create({
          data: {
            type: "EARN",
            amount: 10,
            balanceBefore: updated.points - 10,
            balanceAfter: updated.points,
            idempotencyKey,
            actorType: "STAFF",
            actorId: "staff-1",
            membershipId: membership.id,
            customerId: customer.id,
            businessId: business.id,
          },
        });
      })
    ).rejects.toThrow();

    const txCount = await prisma.transaction.count({ where: { idempotencyKey } });
    expect(txCount).toBe(1);

    const freshMembership = await prisma.membership.findUnique({ where: { id: membership.id } });
    expect(freshMembership?.points).toBe(110);
  });

  it("should maintain non-negative balance under concurrency", async () => {
    const account = await prisma.account.create({
      data: { name: "TestD", email: "test-bal2@test.com", role: "CUSTOMER" },
    });
    const customer = await prisma.customer.create({
      data: { accountId: account.id, phone: "+998900000010" },
    });
    const owner = await prisma.account.create({
      data: { name: "OwnerD", email: "owner-bal2@test.com", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "Test BizD", slug: "test-bal2", ownerId: owner.id },
    });
    const membership = await prisma.membership.create({
      data: { customerId: customer.id, businessId: business.id, points: 100 },
    });

    const results = await Promise.allSettled(
      Array.from({ length: 10 }).map(async (_, i) => {
        return prisma.$transaction(async (tx) => {
          const updated = await tx.membership.update({
            where: { id: membership.id },
            data: { points: { decrement: 15 } },
          });
          if (updated.points < 0) throw new Error("Insufficient balance");
          return tx.transaction.create({
            data: {
              type: "REDEEM",
              amount: 15,
              balanceBefore: 100,
              balanceAfter: updated.points,
              idempotencyKey: `bal-${Date.now()}-${i}`,
              actorType: "STAFF",
              actorId: "staff-1",
              membershipId: membership.id,
              customerId: customer.id,
              businessId: business.id,
            },
          });
        });
      })
    );

    const finalMembership = await prisma.membership.findUnique({ where: { id: membership.id } });
    expect(finalMembership?.points).toBeGreaterThanOrEqual(0);
  });
});
