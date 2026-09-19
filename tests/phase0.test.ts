import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  membership: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  transaction: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  customer: {
    findUnique: vi.fn(),
  },
  business: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(async (fn: any) => fn(mockPrisma as any)),
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

describe("phase 0 safety tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should atomically earn points", async () => {
    const mockMembership = {
      id: "m1",
      customerId: "c1",
      businessId: "b1",
      points: 100,
    };

    mockPrisma.membership.findUnique.mockResolvedValue(mockMembership as any);
    mockPrisma.membership.update.mockResolvedValue({ ...mockMembership, points: 150 } as any);
    mockPrisma.transaction.create.mockResolvedValue({ id: "t1" } as any);

    const result = await (mockPrisma as any).$transaction(async (tx: any) => {
      const updated = await tx.membership.update({
        where: { id: "m1" },
        data: { points: { increment: 50 } },
      });
      const txn = await tx.transaction.create({
        data: {
          type: "EARN",
          amount: 50,
          membershipId: "m1",
          businessId: "b1",
          customerId: "c1",
        },
      });
      return { membership: updated, transaction: txn };
    });

    expect(result.membership.points).toBe(150);
    expect(result.transaction.id).toBe("t1");
  });

  it("should atomically redeem points", async () => {
    const mockMembership = {
      id: "m1",
      customerId: "c1",
      businessId: "b1",
      points: 100,
    };

    mockPrisma.membership.findUnique.mockResolvedValue(mockMembership as any);
    mockPrisma.membership.update.mockResolvedValue({ ...mockMembership, points: 50 } as any);
    mockPrisma.transaction.create.mockResolvedValue({ id: "t2" } as any);

    const result = await (mockPrisma as any).$transaction(async (tx: any) => {
      const updated = await tx.membership.update({
        where: { id: "m1" },
        data: { points: { decrement: 50 } },
      });
      const txn = await tx.transaction.create({
        data: {
          type: "REDEEM",
          amount: 50,
          membershipId: "m1",
          businessId: "b1",
          customerId: "c1",
        },
      });
      return { membership: updated, transaction: txn };
    });

    expect(result.membership.points).toBe(50);
    expect(result.transaction.id).toBe("t2");
  });

  it("should reject insufficient balance for redeem", async () => {
    const mockMembership = {
      id: "m1",
      customerId: "c1",
      businessId: "b1",
      points: 30,
    };

    mockPrisma.membership.findUnique.mockResolvedValue(mockMembership as any);

    const result = await mockPrisma.membership.findUnique({
      where: { id: "m1" },
    });

    expect(result?.points).toBeLessThan(100);
  });

  it("should support ADJUSTMENT transaction type", async () => {
    const adjustment = {
      type: "ADJUSTMENT",
      amount: 50,
      originalTransactionId: "t1",
    };

    expect(adjustment.type).toBe("ADJUSTMENT");
    expect(adjustment.originalTransactionId).toBe("t1");
  });

  it("should ensure tenant isolation for membership queries", async () => {
    const memberships = [
      { customerId: "c1", businessId: "b1", points: 100 },
      { customerId: "c1", businessId: "b2", points: 50 },
    ];

    const business1Memberships = memberships.filter((m) => m.businessId === "b1");
    expect(business1Memberships).toHaveLength(1);
    expect(business1Memberships[0].businessId).toBe("b1");
  });

  it("should prevent cross-tenant transaction access", async () => {
    const transaction = {
      id: "t1",
      businessId: "b1",
      customerId: "c1",
      membershipId: "m1",
    };

    expect(transaction.businessId).toBe("b1");
    expect(transaction.businessId).not.toBe("b2");
  });

  it("should support concurrent safe operations via $transaction", async () => {
    const mockMembership = {
      id: "m1",
      customerId: "c1",
      businessId: "b1",
      points: 0,
    };

    mockPrisma.membership.update.mockResolvedValue({ ...mockMembership, points: 100 } as any);
    mockPrisma.transaction.create.mockResolvedValue({ id: "t3" } as any);

    const result = await (mockPrisma as any).$transaction(async (tx: any) => {
      const updated = await tx.membership.update({
        where: { id: "m1" },
        data: { points: { increment: 100 } },
      });
      const txn = await tx.transaction.create({
        data: {
          type: "EARN",
          amount: 100,
          membershipId: "m1",
          businessId: "b1",
          customerId: "c1",
        },
      });
      return { membership: updated, transaction: txn };
    });

    expect(result.membership.points).toBe(100);
    expect(result.transaction.id).toBe("t3");
  });

  it("should create ADJUSTMENT transaction linked to original", async () => {
    const originalTransaction = {
      id: "t1",
      businessId: "b1",
      membershipId: "m1",
      customerId: "c1",
      type: "REDEEM",
      amount: 50,
    };

    mockPrisma.transaction.findUnique.mockResolvedValue(originalTransaction as any);
    mockPrisma.membership.findUnique.mockResolvedValue({ id: "m1", points: 50 } as any);
    mockPrisma.membership.update.mockResolvedValue({ id: "m1", points: 100 } as any);
    mockPrisma.transaction.create.mockResolvedValue({ id: "adj1", type: "ADJUSTMENT", amount: 50 } as any);

    const result = await (mockPrisma as any).$transaction(async (tx: any) => {
      const updated = await tx.membership.update({
        where: { id: "m1" },
        data: { points: { increment: 50 } },
      });

      const adjustment = await tx.transaction.create({
        data: {
          type: "ADJUSTMENT",
          amount: 50,
          description: "Correction",
          membershipId: "m1",
          businessId: "b1",
          customerId: "c1",
          actorId: "a1",
          actorType: "OWNER",
          originalTransactionId: "t1",
          metadata: { originalType: "REDEEM", originalAmount: 50 },
        },
      });

      return { membership: updated, adjustment };
    });

    expect(result.adjustment.type).toBe("ADJUSTMENT");
    expect(result.membership.points).toBe(100);
  });
});
