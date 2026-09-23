import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Auth failure monitoring", () => {
  beforeAll(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "Transaction", "AuditLog", "Adjustment", "SupportMessage", "SupportTicket", "StaffPermission", "StaffAccount", "OtpCode", "Membership", "Customer", "Business", "Account" CASCADE`;
  });

  it("should count auth failures and detect spike", async () => {
    const owner = await prisma.account.create({
      data: { name: "OwnerAF", phone: "owner-af@test.com", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "BizAF", slug: "biz-af", ownerId: owner.id },
    });

    const now = new Date();
    for (let i = 0; i < 12; i++) {
      await prisma.auditLog.create({
        data: {
          action: "auth.failed",
          actorType: "STAFF",
          actorId: "staff-af",
          businessId: business.id,
          createdAt: new Date(now.getTime() - i * 60000),
        },
      });
    }

    const since = new Date(now.getTime() - 15 * 60 * 1000);
    const failures = await prisma.auditLog.groupBy({
      by: ["actorId", "action"],
      where: {
        action: "auth.failed",
        createdAt: { gte: since },
      },
      _count: { action: true },
    });

    const total = failures.reduce((sum, f) => sum + f._count.action, 0);
    const isAlert = total >= 10;

    expect(isAlert).toBe(true);
    expect(total).toBe(12);
    expect(failures[0].actorId).toBe("staff-af");
    expect(failures[0]._count.action).toBe(12);
  });

  it("should not alert when failures are below threshold", async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "Transaction", "AuditLog", "Adjustment", "SupportMessage", "SupportTicket", "StaffPermission", "StaffAccount", "OtpCode", "Membership", "Customer", "Business", "Account" CASCADE`;
    const owner = await prisma.account.create({
      data: { name: "OwnerAF2", phone: "owner-af2@test.com", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "BizAF2", slug: "biz-af2", ownerId: owner.id },
    });

    const now = new Date();
    await prisma.auditLog.create({
      data: {
        action: "auth.failed",
        actorType: "STAFF",
        actorId: "staff-af2",
        businessId: business.id,
        createdAt: new Date(now.getTime() - 60000),
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "auth.failed",
        actorType: "STAFF",
        actorId: "staff-af2",
        businessId: business.id,
        createdAt: new Date(now.getTime() - 120000),
      },
    });

    const since = new Date(now.getTime() - 15 * 60 * 1000);
    const failures = await prisma.auditLog.groupBy({
      by: ["actorId", "action"],
      where: {
        action: "auth.failed",
        createdAt: { gte: since },
      },
      _count: { action: true },
    });

    const total = failures.reduce((sum, f) => sum + f._count.action, 0);
    const isAlert = total >= 10;

    expect(isAlert).toBe(false);
    expect(total).toBe(2);
  });
});
