import { webhookCallback } from "grammy";
import { bot } from "~/lib/telegram-bot";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const callback = webhookCallback(bot, "std/http");

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return callback(req);
}
