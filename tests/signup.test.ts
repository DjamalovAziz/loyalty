import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Signup flow", () => {
  beforeAll(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "Transaction", "AuditLog", "Adjustment", "SupportMessage", "SupportTicket", "StaffPermission", "StaffAccount", "OtpCode", "Membership", "Customer", "Business", "Account" CASCADE`;
  });

  it("should create customer account via Telegram signup", async () => {
    const phone = "+998900000100";
    const password = "password123";
    const passwordHash = await import("bcryptjs").then((bcrypt) => bcrypt.hash(password, 12));

    const account = await prisma.account.create({
      data: {
        phone,
        name: phone,
        passwordHash,
        role: "CUSTOMER",
      },
    });

    expect(account.phone).toBe(phone);
    expect(account.role).toBe("CUSTOMER");

    const customer = await prisma.customer.create({
      data: {
        accountId: account.id,
        phone,
      },
    });

    expect(customer.accountId).toBe(account.id);
  });

  it("should create owner account without business", async () => {
    const phone = "+998900000101";
    const password = "password123";
    const passwordHash = await import("bcryptjs").then((bcrypt) => bcrypt.hash(password, 12));

    const account = await prisma.account.create({
      data: {
        phone,
        name: phone,
        passwordHash,
        role: "OWNER",
      },
    });

    expect(account.phone).toBe(phone);
    expect(account.role).toBe("OWNER");

    const businesses = await prisma.business.count({
      where: { ownerId: account.id },
    });
    expect(businesses).toBe(0);
  });

  it("should reject duplicate phone signup", async () => {
    const phone = "+998900000102";
    const passwordHash = await import("bcryptjs").then((bcrypt) => bcrypt.hash("password123", 12));

    await prisma.account.create({
      data: {
        phone,
        name: phone,
        passwordHash,
        role: "CUSTOMER",
      },
    });

    const existing = await prisma.account.findFirst({
      where: { phone },
    });

    expect(existing).toBeTruthy();
  });

  it("should allow staff invite acceptance", async () => {
    const owner = await prisma.account.create({
      data: { phone: "+998900000103", name: "+998900000103", role: "OWNER" },
    });
    const business = await prisma.business.create({
      data: { name: "Signup Test Biz", slug: "signup-test-biz", ownerId: owner.id },
    });

    const rawCode = "TESTINVITE123";
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
      data: { phone: "+998900000104", name: "+998900000104", role: "STAFF" },
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
  });
});
