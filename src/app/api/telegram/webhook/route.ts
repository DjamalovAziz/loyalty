import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-telegram-bot-api-secret-token");
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (secret && signature !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = await req.json();

    const message = update.message;
    if (message) {
      const text = message.text || "";
      const chatId = String(message.chat.id);

      if (text.startsWith("/start")) {
        const parts = text.split(" ");
        const token = parts[1];

        if (token) {
          return NextResponse.json({
            ok: true,
            message: "Token received. Please open the bot to continue.",
            token,
            chatId,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
