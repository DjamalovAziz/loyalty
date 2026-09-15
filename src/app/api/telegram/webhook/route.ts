import { webhookCallback } from "grammy";
import { bot } from "~/lib/telegram-bot";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Use Telegram's native secret_token mechanism rather than a URL query param:
// Telegram sends it back as the X-Telegram-Bot-Api-Secret-Token header on every
// webhook POST, so it's never exposed in the URL (Vercel access logs, proxies,
// referrer headers). Set the token via scripts/set-webhook.ts.
const callback = webhookCallback(bot, "std/http", {
  secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
});

export async function POST(req: NextRequest) {
  return callback(req);
}
