import { webhookCallback } from "grammy";
import { bot } from "~/lib/telegram-bot";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Trim defensively — a trailing newline/space pasted into Vercel's env var UI is a
// classic silent cause of "secret token is wrong": lengths differ, comparison fails,
// and there's nothing in the request itself to tell you why.
const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

const callback = webhookCallback(bot, "std/http", {
  secretToken: configuredSecret,
});

export async function POST(req: NextRequest) {
  const receivedHeader = req.headers.get("x-telegram-bot-api-secret-token")?.trim();

  // Diagnostic-only pre-check: never logs the actual secret values, only whether they
  // were present and how long they were, so this is safe to leave in Vercel's logs.
  if (receivedHeader !== configuredSecret) {
    console.warn("[telegram-webhook] secret mismatch", {
      hasConfiguredSecret: !!configuredSecret,
      configuredSecretLength: configuredSecret?.length ?? 0,
      hasReceivedHeader: !!receivedHeader,
      receivedHeaderLength: receivedHeader?.length ?? 0,
      hint: !configuredSecret
        ? "TELEGRAM_WEBHOOK_SECRET is not set in this deployment's environment"
        : !receivedHeader
          ? "Telegram sent no X-Telegram-Bot-Api-Secret-Token header — was the webhook ever registered with a secret_token?"
          : "Both present but different — most likely the deployed secret changed after the webhook was last registered. Re-run 'Register webhook now' in /admin.",
    });
  }

  return callback(req);
}
