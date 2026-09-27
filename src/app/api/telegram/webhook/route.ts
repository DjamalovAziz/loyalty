import { NextRequest, NextResponse } from "next/server";
import bot from "@/lib/telegram/bot";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-telegram-bot-api-secret-token");
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (secret && signature !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = await req.json();
    await bot.handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
