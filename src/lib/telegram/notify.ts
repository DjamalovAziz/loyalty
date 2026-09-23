const TELEGRAM_API = "https://api.telegram.org/bot";

export async function sendTelegramMessage(token: string, chatId: string, text: string) {
  if (!token || !chatId) return;

  try {
    await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error("Telegram notification failed:", err);
  }
}
