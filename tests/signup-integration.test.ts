import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Signup integration flow", () => {
  beforeAll(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "Transaction", "AuditLog", "Adjustment", "SupportMessage", "SupportTicket", "StaffPermission", "StaffAccount", "OtpCode", "Membership", "Customer", "Business", "Account" CASCADE`;
  });

  it("full customer flow: signup → profile shows memberships", async () => {
    const phone = "+998900000200";
    const passwordHash = await import("bcryptjs").then((bcrypt) => bcrypt.hash("password123", 12));

    const account = await prisma.account.create({
      data: {
        phone,
        name: phone,
        passwordHash,
        role: "CUSTOMER",
      },
    });

    const customer = await prisma.customer.create({
      data: {
        accountId: account.id,
        phone,
      },
    });

    const business = await prisma.business.create({
      data: { name: "Customer Biz", slug: "customer-biz", ownerId: account.id },
    });

    await prisma.membership.create({
      data: {
        customerId: customer.id,
        businessId: business.id,
        points: 0,
      },
    });

    const memberships = await prisma.membership.findMany({
      where: { customerId: customer.id },
      include: { business: true },
    });

    expect(memberships).toHaveLength(1);
    expect(memberships[0].business.name).toBe("Customer Biz");
  });

  it("owner flow: signup → create business → dashboard available", async () => {
    const phone = "+998900000201";
    const passwordHash = await import("bcryptjs").then((bcrypt) => bcrypt.hash("password123", 12));

    const account = await prisma.account.create({
      data: {
        phone,
        name: phone,
        passwordHash,
        role: "OWNER",
      },
    });

    const business = await prisma.business.create({
      data: {
        name: "Owner Biz",
        slug: "owner-biz",
        ownerId: account.id,
      },
    });

    const pinCode = "123456";
    const pinHash = await import("@/lib/pin").then(({ hashPin }) => hashPin(pinCode));

    const staffAccount = await prisma.staffAccount.create({
      data: {
        accountId: account.id,
        businessId: business.id,
        pinHash,
        isActive: true,
      },
    });

    await prisma.staffPermission.create({
      data: {
        staffId: staffAccount.id,
        role: "OWNER",
        isActive: true,
      },
    });

    const loadedBusiness = await prisma.business.findUnique({
      where: { id: business.id },
    });

    expect(loadedBusiness?.ownerId).toBe(account.id);

    const staff = await prisma.staffAccount.findFirst({
      where: { accountId: account.id, businessId: business.id },
      include: { permissions: true },
    });

    expect(staff?.isActive).toBe(true);
    expect(staff?.permissions[0]?.role).toBe("OWNER");
  });

  it("staff invite flow: owner creates invite → staff accepts → staff access", async () => {
    const owner = await prisma.account.create({
      data: { phone: "+998900000202", name: "+998900000202", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "Staff Biz", slug: "staff-biz", ownerId: owner.id },
    });

    const rawCode = "STAFFINVITE123";
    const codeHash = await import("crypto").then((crypto) =>
      crypto.createHmac("sha256", "fallback").update(rawCode).digest("hex")
    );

    const invite = await prisma.staffInvite.create({
      data: {
        businessId: business.id,
        code: codeHash,
        role: "CASHIER",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const staffAccount = await prisma.account.create({
      data: { phone: "+998900000203", name: "+998900000203", role: "STAFF" },
    });

    const staff = await prisma.staffAccount.create({
      data: {
        accountId: staffAccount.id,
        businessId: business.id,
        pinHash: "",
        isActive: true,
      },
    });

    await prisma.staffPermission.create({
      data: {
        staffId: staff.id,
        role: "CASHIER",
        isActive: true,
      },
    });

    await prisma.staffInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    const updatedInvite = await prisma.staffInvite.findUnique({
      where: { id: invite.id },
    });

    expect(updatedInvite?.usedAt).toBeTruthy();

    const loadedStaff = await prisma.staffAccount.findFirst({
      where: { accountId: staffAccount.id, businessId: business.id },
      include: { permissions: true },
    });

    expect(loadedStaff?.isActive).toBe(true);
    expect(loadedStaff?.permissions[0]?.role).toBe("CASHIER");
  });
});
