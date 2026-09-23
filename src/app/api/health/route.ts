import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redisPing } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const hasSecret = authHeader === `Bearer ${secret}`;

  const [dbOk, redisOk] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    redisPing(),
  ]);

  const payload = {
    status: dbOk ? "ok" : "degraded",
    db: dbOk ? "ok" : "error",
    timestamp: new Date().toISOString(),
  };

  if (hasSecret) {
    const [membershipCount, transactionCount, dbSize] = await Promise.all([
      prisma.membership.count(),
      prisma.transaction.count(),
      prisma.$queryRaw`SELECT pg_database_size(current_database())`.then((r: any) => r[0]?.pg_database_size ?? null).catch(() => null),
    ]);

    return NextResponse.json({
      ...payload,
      redis: redisOk ? "ok" : "error",
      details: {
        dbStatus: dbOk ? "ok" : "error",
        redisStatus: redisOk ? "ok" : "error",
        membershipCount,
        transactionCount,
        dbSizeBytes: dbSize,
      },
    });
  }

  return NextResponse.json({
    status: payload.status,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
