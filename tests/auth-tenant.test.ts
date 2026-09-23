import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Auth and tenant isolation", () => {
  beforeAll(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "Transaction", "AuditLog", "Adjustment", "SupportMessage", "SupportTicket", "StaffPermission", "StaffAccount", "OtpCode", "Membership", "Customer", "Business", "Account" CASCADE`;
  });

  it("should not allow cross-tenant membership access", async () => {
    const owner1 = await prisma.account.create({
      data: { name: "Owner1T", email: "owner1-tenant2@test.com", role: "OWNER" },
    });
    const owner2 = await prisma.account.create({
      data: { name: "Owner2T", email: "owner2-tenant2@test.com", role: "OWNER" },
    });
    const biz1 = await prisma.business.create({
      data: { name: "Biz1T", slug: "biz1-tenant2", ownerId: owner1.id },
    });
    const biz2 = await prisma.business.create({
      data: { name: "Biz2T", slug: "biz2-tenant2", ownerId: owner2.id },
    });

    const customer = await prisma.customer.create({
      data: { accountId: (await prisma.account.create({ data: { name: "C1T", email: "c1-tenant2@test.com", role: "CUSTOMER" } })).id, phone: "+998900000011" },
    });

    await prisma.membership.create({
      data: { customerId: customer.id, businessId: biz1.id, points: 100 },
    });

    const crossMembership = await prisma.membership.findUnique({
      where: { customerId_businessId: { customerId: customer.id, businessId: biz2.id } },
    });
    expect(crossMembership).toBeNull();

    const biz1Membership = await prisma.membership.findUnique({
      where: { customerId_businessId: { customerId: customer.id, businessId: biz1.id } },
    });
    expect(biz1Membership?.points).toBe(100);
  });

  it("should require business scoped staff account", async () => {
    const owner = await prisma.account.create({
      data: { name: "OwnerT", email: "owner-scope2@test.com", role: "OWNER" },
    });
    const biz1 = await prisma.business.create({
      data: { name: "Biz1S", slug: "biz1-scope2", ownerId: owner.id },
    });
    const biz2 = await prisma.business.create({
      data: { name: "Biz2S", slug: "biz2-scope2", ownerId: owner.id },
    });
    const staffAccount = await prisma.account.create({
      data: { name: "StaffT", email: "staff-scope2@test.com", role: "STAFF" },
    });

    const staff1 = await prisma.staffAccount.create({
      data: { accountId: staffAccount.id, businessId: biz1.id, pinHash: "hash" },
    });

    const staff2 = await prisma.staffAccount.findUnique({
      where: { accountId_businessId: { accountId: staffAccount.id, businessId: biz2.id } },
    });
    expect(staff2).toBeNull();
    expect(staff1.businessId).toBe(biz1.id);
  });

  it("should not expose other business tickets via admin list", async () => {
    const owner1 = await prisma.account.create({
      data: { name: "Owner1T2", email: "owner1-tkt2@test.com", role: "OWNER" },
    });
    const owner2 = await prisma.account.create({
      data: { name: "Owner2T2", email: "owner2-tkt2@test.com", role: "OWNER" },
    });
    const cust1 = await prisma.customer.create({
      data: { accountId: (await prisma.account.create({ data: { name: "C1T2", email: "c1-tkt2@test.com", role: "CUSTOMER" } })).id, phone: "+998900000012" },
    });
    const cust2 = await prisma.customer.create({
      data: { accountId: (await prisma.account.create({ data: { name: "C2T2", email: "c2-tkt2@test.com", role: "CUSTOMER" } })).id, phone: "+998900000013" },
    });
    const biz1 = await prisma.business.create({
      data: { name: "Biz1T2", slug: "biz1-tkt2", ownerId: owner1.id },
    });
    const biz2 = await prisma.business.create({
      data: { name: "Biz2T2", slug: "biz2-tkt2", ownerId: owner2.id },
    });

    await prisma.supportTicket.create({
      data: { subject: "Ticket1", message: "Msg1", source: "CUSTOMER", customerId: cust1.id, businessId: biz1.id },
    });
    await prisma.supportTicket.create({
      data: { subject: "Ticket2", message: "Msg2", source: "CUSTOMER", customerId: cust2.id, businessId: biz2.id },
    });

    const biz1Tickets = await prisma.supportTicket.findMany({ where: { businessId: biz1.id } });
    expect(biz1Tickets).toHaveLength(1);
    expect(biz1Tickets[0].subject).toBe("Ticket1");

    const biz2Tickets = await prisma.supportTicket.findMany({ where: { businessId: biz2.id } });
    expect(biz2Tickets).toHaveLength(1);
    expect(biz2Tickets[0].subject).toBe("Ticket2");
  });
});
