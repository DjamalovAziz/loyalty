/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const path = body.path as string[];
    const input = body.json as Record<string, unknown>;

    let result: unknown;

    if (path[0] === "customer") {
      if (path[1] === "requestLoginOtp") {
        const { phone } = input as { phone: string };
        const limited = await rateLimit({
          key: `otp:${phone}`,
          limit: 3,
          window: "1 h",
        });
        if (limited) return limited;

        const customer = await prisma.customer.upsert({
          where: { phone },
          update: { isVerified: false },
          create: { phone },
        });

        await logAudit({
          action: "otp_requested",
          actorType: "customer",
          customerId: customer.id,
          metadata: { phone },
        });

        result = { success: true, message: "OTP sent" };
      } else if (path[1] === "me") {
        const { customerId } = input as { customerId: string };
        result = await prisma.customer.findUnique({
          where: { id: customerId },
          include: {
            memberships: {
              where: { isActive: true },
              include: {
                business: {
                  select: { id: true, name: true, slug: true, logo: true, category: true },
                },
              },
            },
          },
        });
      } else if (path[1] === "join") {
        const { customerId, businessId } = input as { customerId: string; businessId: string };
        const business = await prisma.business.findUnique({ where: { id: businessId } });
        if (!business || !business.isActive) {
          return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        const membership = await prisma.membership.upsert({
          where: { customerId_businessId: { customerId, businessId } },
          create: { customerId, businessId, points: business.welcomePoints },
          update: { isActive: true },
        });

        if (business.welcomePoints > 0) {
          await prisma.transaction.create({
            data: {
              type: "EARN",
              amount: business.welcomePoints,
              description: "Welcome bonus",
              membershipId: membership.id,
              businessId,
              customerId,
            },
          });
        }

        await logAudit({
          action: "membership_joined",
          actorType: "customer",
          customerId,
          businessId,
          resourceType: "membership",
          resourceId: membership.id,
        });

        result = { success: true, membership };
      } else if (path[1] === "leave") {
        const { customerId, businessId } = input as { customerId: string; businessId: string };
        const membership = await prisma.membership.update({
          where: { customerId_businessId: { customerId, businessId } },
          data: { isActive: false },
        });

        await logAudit({
          action: "membership_left",
          actorType: "customer",
          customerId,
          businessId,
          resourceType: "membership",
          resourceId: membership.id,
        });

        result = { success: true };
      }
    } else if (path[0] === "business") {
      if (path[1] === "explore") {
        const { query, category, limit, cursor } = input as {
          query?: string;
          category?: string;
          limit?: number;
          cursor?: string;
        };

        const where: Record<string, unknown> = { isActive: true };
        if (category) where.category = category;
        if (query) {
          where.OR = [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ];
        }

        const businesses = await prisma.business.findMany({
          where,
          take: (limit || 20) + 1,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            category: true,
            address: true,
            latitude: true,
            longitude: true,
            logo: true,
            welcomePoints: true,
            minimumCashback: true,
            createdAt: true,
          },
        });

        let nextCursor: string | undefined;
        if (businesses.length > (limit || 20)) {
          const nextItem = businesses.pop();
          nextCursor = (nextItem as any)?.id;
        }

        result = { items: businesses, nextCursor };
      } else if (path[1] === "getById") {
        const { id } = input as { id: string };
        result = await prisma.business.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            category: true,
            address: true,
            latitude: true,
            longitude: true,
            logo: true,
            welcomePoints: true,
            minimumCashback: true,
            telegramGroup: true,
            createdAt: true,
          },
        });
      }
    } else if (path[0] === "staff") {
      if (path[1] === "initiateRedeem") {
        const { businessId, customerId, amount, description, actorId } = input as {
          businessId: string;
          customerId: string;
          amount: number;
          description?: string;
          actorId: string;
        };

        const limited = await rateLimit({
          key: `redeem:${businessId}:${customerId}`,
          limit: 5,
          window: "1 m",
        });
        if (limited) return limited;

        const membership = await prisma.membership.findUnique({
          where: { customerId_businessId: { customerId, businessId } },
        });

        if (!membership || !membership.isActive) {
          return NextResponse.json({ error: "Membership not found" }, { status: 404 });
        }
        if (membership.points < amount) {
          return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
        }

        const result2 = await prisma.$transaction(async (tx: any) => {
          const updated = await tx.membership.update({
            where: { id: membership.id },
            data: { points: { decrement: amount } },
          });
          const txn = await tx.transaction.create({
            data: {
              type: "REDEEM",
              amount,
              description: description || "Redeem",
              membershipId: membership.id,
              businessId,
              customerId,
              actorId,
              actorType: "STAFF",
            },
          });
          return { membership: updated, transaction: txn };
        });

        await logAudit({
          action: "redeem_initiated",
          actorId,
          actorType: "STAFF",
          businessId,
          customerId,
          resourceType: "transaction",
          resourceId: (result2 as any).transaction.id,
          metadata: { amount },
        });

        result = { success: true, transaction: (result2 as any).transaction, newBalance: (result2 as any).membership.points };
      } else if (path[1] === "earnPoints") {
        const { businessId, customerId, amount, description, actorId } = input as {
          businessId: string;
          customerId: string;
          amount: number;
          description?: string;
          actorId: string;
        };

        const membership = await prisma.membership.findUnique({
          where: { customerId_businessId: { customerId, businessId } },
        });

        if (!membership || !membership.isActive) {
          return NextResponse.json({ error: "Membership not found" }, { status: 404 });
        }

        const result2 = await prisma.$transaction(async (tx: any) => {
          const updated = await tx.membership.update({
            where: { id: membership.id },
            data: { points: { increment: amount } },
          });
          const txn = await tx.transaction.create({
            data: {
              type: "EARN",
              amount,
              description: description || "Earn points",
              membershipId: membership.id,
              businessId,
              customerId,
              actorId,
              actorType: "STAFF",
            },
          });
          return { membership: updated, transaction: txn };
        });

        await logAudit({
          action: "earn_points",
          actorId,
          actorType: "STAFF",
          businessId,
          customerId,
          resourceType: "transaction",
          resourceId: (result2 as any).transaction.id,
          metadata: { amount },
        });

        result = { success: true, transaction: (result2 as any).transaction, newBalance: (result2 as any).membership.points };
      } else if (path[1] === "checkInByCustomerId") {
        const { businessId, customerId, actorId } = input as {
          businessId: string;
          customerId: string;
          actorId: string;
        };

        const membership = await prisma.membership.findUnique({
          where: { customerId_businessId: { customerId, businessId } },
        });

        if (!membership || !membership.isActive) {
          return NextResponse.json({ error: "Membership not found" }, { status: 404 });
        }

        const business = await prisma.business.findUnique({
          where: { id: businessId },
          select: { welcomePoints: true },
        });

        if (!business) {
          return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        if (business.welcomePoints > 0) {
          const result2 = await prisma.$transaction(async (tx: any) => {
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
                businessId,
                customerId,
                actorId,
                actorType: "STAFF",
              },
            });
            return { membership: updated, transaction: txn };
          });

          await logAudit({
            action: "checkin",
            actorId,
            actorType: "STAFF",
            businessId,
            customerId,
            resourceType: "transaction",
            resourceId: (result2 as any).transaction.id,
          });

          result = { success: true, transaction: (result2 as any).transaction, newBalance: (result2 as any).membership.points };
        } else {
          await logAudit({
            action: "checkin",
            actorId,
            actorType: "STAFF",
            businessId,
            customerId,
          });
          result = { success: true };
        }
      } else if (path[1] === "adjustTransaction") {
        const { businessId, originalTransactionId, amount, reason, actorId, actorType } = input as {
          businessId: string;
          originalTransactionId: string;
          amount: number;
          reason: string;
          actorId: string;
          actorType: string;
        };

        const original = await prisma.transaction.findUnique({
          where: { id: originalTransactionId },
        });

        if (!original || original.businessId !== businessId) {
          return NextResponse.json({ error: "Original transaction not found" }, { status: 404 });
        }

        const membership = await prisma.membership.findUnique({
          where: { id: original.membershipId },
        });

        if (!membership) {
          return NextResponse.json({ error: "Membership not found" }, { status: 404 });
        }

        const result2 = await prisma.$transaction(async (tx: any) => {
          const updated = await tx.membership.update({
            where: { id: membership.id },
            data: { points: { increment: amount } },
          });

          const adjustment = await tx.transaction.create({
            data: {
              type: "ADJUSTMENT",
              amount,
              description: reason,
              membershipId: membership.id,
              businessId,
              customerId: original.customerId,
              actorId,
              actorType,
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
          actorId,
          actorType,
          businessId,
          customerId: original.customerId,
          resourceType: "transaction",
          resourceId: (result2 as any).adjustment.id,
          metadata: {
            originalTransactionId: original.id,
            amount,
            reason,
          },
        });

        result = { success: true, adjustment: (result2 as any).adjustment, newBalance: (result2 as any).membership.points };
      }
    } else if (path[0] === "admin") {
      if (path[1] === "listTickets") {
        const { businessId, status, limit } = input as {
          businessId?: string;
          status?: string;
          limit?: number;
        };
        const where: Record<string, unknown> = {};
        if (businessId) where.businessId = businessId;
        if (status) where.status = status;

        const tickets = await prisma.supportTicket.findMany({
          where,
          take: (limit || 50) + 1,
          orderBy: { createdAt: "desc" },
          include: {
            customer: { select: { id: true, phone: true, name: true, telegramUsername: true } },
            business: { select: { id: true, name: true } },
          },
        });

        let nextCursor: string | undefined;
        if (tickets.length > (limit || 50)) {
          nextCursor = (tickets.pop() as any)?.id;
        }

        result = { items: tickets, nextCursor };
      } else if (path[1] === "updateTicketStatus") {
        const { ticketId, status } = input as { ticketId: string; status: string };
        const ticket = await prisma.supportTicket.update({
          where: { id: ticketId },
          data: {
            status: status as any,
            resolvedAt: status === "RESOLVED" ? new Date() : undefined,
          },
        });

        await logAudit({
          action: "ticket_updated",
          actorType: "admin",
          resourceType: "support_ticket",
          resourceId: ticket.id,
          metadata: { status },
        });

        result = { success: true, ticket };
      }
    }

    if (result === undefined) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: { message: err.message || "Internal error" } },
      { status: 500 }
    );
  }
}
