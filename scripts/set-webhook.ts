// Run with: npm run bot:set-webhook
// Requires TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, and NEXT_PUBLIC_APP_URL in .env

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!token || !secret || !appUrl) {
  console.error("Missing TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, or NEXT_PUBLIC_APP_URL");
  process.exit(1);
}

const webhookUrl = `${appUrl}/api/telegram/webhook`;

fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
})
  .then((r) => r.json())
  .then((data) => console.log("Telegram setWebhook response:", data))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });