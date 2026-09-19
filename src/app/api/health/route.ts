import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const businessCount = await prisma.business.count();
    const customerCount = await prisma.customer.count();
    const membershipCount = await prisma.membership.count();
    const transactionCount = await prisma.transaction.count();

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
      counts: {
        businesses: businessCount,
        customers: customerCount,
        memberships: membershipCount,
        transactions: transactionCount,
      },
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: "Failed to connect to database",
      },
      { status: 500 }
    );
  }
}
