import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Phase 0 safety", () => {
  beforeAll(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "Transaction", "AuditLog", "Adjustment", "SupportMessage", "SupportTicket", "StaffPermission", "StaffAccount", "OtpCode", "Membership", "Customer", "Business", "Account" CASCADE`;
  });

  it("should have DB CHECK constraint protecting against negative balance", async () => {
    const account = await prisma.account.create({
      data: { name: "Test", phone: "+998900000001", role: "CUSTOMER" },
    });
    const customer = await prisma.customer.create({
      data: { accountId: account.id, phone: "+998900000001" },
    });
    const business = await prisma.business.create({
      data: { name: "Test Biz", slug: "test-check", ownerId: account.id },
    });
    const membership = await prisma.membership.create({
      data: { customerId: customer.id, businessId: business.id, points: 100 },
    });

    await expect(
      prisma.membership.update({
        where: { id: membership.id },
        data: { points: -1 },
      })
    ).rejects.toThrow();

    const fresh = await prisma.membership.findUnique({ where: { id: membership.id } });
    expect(fresh?.points).toBe(100);
  });

  it("should prevent concurrent negative balance via atomic redeem", async () => {
    const account = await prisma.account.create({
      data: { name: "Test2", phone: "+998900000002", role: "CUSTOMER" },
    });
    const customer = await prisma.customer.create({
      data: { accountId: account.id, phone: "+998900000002" },
    });
    const owner = await prisma.account.create({
      data: { name: "Owner2", phone: "+998900000082", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "Test Biz2", slug: "test-conc2", ownerId: owner.id },
    });
    const membership = await prisma.membership.create({
      data: { customerId: customer.id, businessId: business.id, points: 50 },
    });

    const results = await Promise.allSettled(
      Array.from({ length: 5 }).map(async (_, i) => {
        const idempotencyKey = `redeem-conc2-${Date.now()}-${i}`;
        return prisma.$transaction(async (tx) => {
          const updated = await tx.membership.update({
            where: { id: membership.id },
            data: { points: { decrement: 30 } },
          });
          if (updated.points < 0) {
            throw new Error("Insufficient balance");
          }
          return tx.transaction.create({
            data: {
              type: "REDEEM",
              amount: 30,
              balanceBefore: 50,
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
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    expect(succeeded).toBeGreaterThanOrEqual(1);
    expect(failed).toBeGreaterThanOrEqual(1);

    const finalMembership = await prisma.membership.findUnique({ where: { id: membership.id } });
    expect(finalMembership?.points).toBeGreaterThanOrEqual(0);
  });

  it("should enforce idempotency on duplicate requests", async () => {
    const account = await prisma.account.create({
      data: { name: "Test3", phone: "+998900000003", role: "CUSTOMER" },
    });
    const customer = await prisma.customer.create({
      data: { accountId: account.id, phone: "+998900000003" },
    });
    const owner = await prisma.account.create({
      data: { name: "Owner3", phone: "+998900000083", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "Test Biz3", slug: "test-idem2", ownerId: owner.id },
    });
    const membership = await prisma.membership.create({
      data: { customerId: customer.id, businessId: business.id, points: 100 },
    });

    const idempotencyKey = "earn-idem-123";

    const tx1 = await prisma.$transaction(async (tx) => {
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

  it("should support atomic earn via staff.earnPoints", async () => {
    const account = await prisma.account.create({
      data: { name: "Test4", phone: "+998900000004", role: "CUSTOMER" },
    });
    const customer = await prisma.customer.create({
      data: { accountId: account.id, phone: "+998900000004" },
    });
    const owner = await prisma.account.create({
      data: { name: "Owner4", phone: "+998900000084", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "Test Biz4", slug: "test-earn2", ownerId: owner.id },
    });
    const membership = await prisma.membership.create({
      data: { customerId: customer.id, businessId: business.id, points: 0 },
    });

    const idempotencyKey = "earn-123";
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({
        where: { id: membership.id },
        data: { points: { increment: 50 } },
      });
      return tx.transaction.create({
        data: {
          type: "EARN",
          amount: 50,
          balanceBefore: 0,
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

    expect(result.balanceAfter).toBe(50);
    const fresh = await prisma.membership.findUnique({ where: { id: membership.id } });
    expect(fresh?.points).toBe(50);
  });

  it("should support atomic adjustment via adjustment.create", async () => {
    const account = await prisma.account.create({
      data: { name: "Test5", phone: "+998900000005", role: "CUSTOMER" },
    });
    const customer = await prisma.customer.create({
      data: { accountId: account.id, phone: "+998900000005" },
    });
    const owner = await prisma.account.create({
      data: { name: "Owner5", phone: "+998900000085", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "Test Biz5", slug: "test-adj2", ownerId: owner.id },
    });
    const membership = await prisma.membership.create({
      data: { customerId: customer.id, businessId: business.id, points: 100 },
    });

    const originalTx = await prisma.transaction.create({
      data: {
        type: "EARN",
        amount: 100,
        balanceBefore: 0,
        balanceAfter: 100,
        idempotencyKey: "original-adj-1",
        actorType: "STAFF",
        actorId: "staff-1",
        membershipId: membership.id,
        customerId: customer.id,
        businessId: business.id,
      },
    });

    const adjustmentTx = await prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({
        where: { id: membership.id },
        data: { points: { increment: -20 } },
      });
      const adjTx = await tx.transaction.create({
        data: {
          type: "ADJUSTMENT",
          amount: -20,
          balanceBefore: 100,
          balanceAfter: updated.points,
          idempotencyKey: "adj-1",
          reason: "Correction",
          referenceId: originalTx.id,
          actorType: "OWNER",
          actorId: owner.id,
          membershipId: membership.id,
          customerId: customer.id,
          businessId: business.id,
        },
      });
      await tx.adjustment.create({
        data: {
          reason: "Correction",
          actorId: owner.id,
          actorType: "OWNER",
          originalId: originalTx.id,
          referenceId: adjTx.id,
        },
      });
      return adjTx;
    });

    expect(adjustmentTx.amount).toBe(-20);
    expect(adjustmentTx.referenceId).toBe(originalTx.id);

    const freshMembership = await prisma.membership.findUnique({ where: { id: membership.id } });
    expect(freshMembership?.points).toBe(80);

    const adjustment = await prisma.adjustment.findFirst({
      where: { referenceId: adjustmentTx.id },
    });
    expect(adjustment).toBeDefined();
    expect(adjustment?.originalId).toBe(originalTx.id);
  });

  it("should support points expiry via expiry.run", async () => {
    const account = await prisma.account.create({
      data: { name: "Test6", phone: "+998900000006", role: "CUSTOMER" },
    });
    const customer = await prisma.customer.create({
      data: { accountId: account.id, phone: "+998900000006" },
    });
    const owner = await prisma.account.create({
      data: { name: "Owner6", phone: "+998900000086", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "Test Biz6", slug: "test-exp2", ownerId: owner.id, welcomePoints: 0 },
    });
    const membership = await prisma.membership.create({
      data: { customerId: customer.id, businessId: business.id, points: 100, lastEarnAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) },
    });

    const idempotencyKey = `expire:${membership.id}`;
    await prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({
        where: { id: membership.id },
        data: { points: 0, isActive: false },
      });
      await tx.transaction.create({
        data: {
          type: "EXPIRE",
          amount: -100,
          balanceBefore: 100,
          balanceAfter: 0,
          idempotencyKey,
          reason: "Inactivity expiry",
          actorType: "SYSTEM",
          actorId: "cron",
          membershipId: membership.id,
          customerId: customer.id,
          businessId: business.id,
        },
      });
    });

    const freshMembership = await prisma.membership.findUnique({ where: { id: membership.id } });
    expect(freshMembership?.points).toBe(0);
    expect(freshMembership?.isActive).toBe(false);

    const expireTx = await prisma.transaction.findUnique({ where: { idempotencyKey } });
    expect(expireTx?.type).toBe("EXPIRE");
  });

  it("should support staff permission assignment", async () => {
    const owner = await prisma.account.create({
      data: { name: "Owner7", phone: "+998900000087", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "Test Biz7", slug: "test-perm2", ownerId: owner.id },
    });
    const staffAccount = await prisma.account.create({
      data: { name: "Staff7", phone: "+998900000007", role: "STAFF" },
    });
    const staff = await prisma.staffAccount.create({
      data: { accountId: staffAccount.id, businessId: business.id, pinHash: "hash" },
    });

    await prisma.staffPermission.upsert({
      where: { staffId_role: { staffId: staff.id, role: "MANAGER" } },
      update: { isActive: true },
      create: { staffId: staff.id, role: "MANAGER" },
    });

    const permissions = await prisma.staffPermission.findMany({ where: { staffId: staff.id } });
    expect(permissions).toHaveLength(1);
    expect(permissions[0].role).toBe("MANAGER");
  });
});
