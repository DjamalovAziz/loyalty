export default {
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    await handle(env);
  },
};

async function handle(env: Env) {
  const url = `${env.APP_URL}/api/health`;
  const secret = env.CRON_SECRET;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
    });

    if (!res.ok) {
      await sendAlert(env, `Health check failed: ${res.status}`);
    }
  } catch (err) {
    await sendAlert(env, `Health check error: ${err}`);
  }
}

async function sendAlert(env: Env, message: string) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.ALERT_TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: `LoyaltySphere Alert: ${message}` }),
  });
}

interface Env {
  APP_URL: string;
  CRON_SECRET: string;
  TELEGRAM_BOT_TOKEN: string;
  ALERT_TELEGRAM_CHAT_ID: string;
}

interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}
