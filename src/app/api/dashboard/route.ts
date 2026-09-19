import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const business = await prisma.business.update({
      where: { id: body.id },
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        address: body.address,
        latitude: body.latitude,
        longitude: body.longitude,
        logo: body.logo,
        telegramGroup: body.telegramGroup,
        welcomePoints: body.welcomePoints,
        minimumCashback: body.minimumCashback,
        pointsExpiryDays: body.pointsExpiryDays,
      },
    });

    await logAudit({
      action: "business_updated",
      actorType: "owner",
      resourceType: "business",
      resourceId: business.id,
      metadata: {
        name: business.name,
        category: business.category,
      },
    });

    return NextResponse.json({ success: true, business });
  } catch (error) {
    console.error("Dashboard update error:", error);
    return NextResponse.json(
      { error: "Failed to update business" },
      { status: 500 }
    );
  }
}
