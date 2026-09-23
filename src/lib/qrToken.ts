import { createHmac } from "crypto";

export function generateQrToken(customerId: string, businessId: string, ttlSeconds = 60) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${customerId}:${businessId}:${exp}`;
  const signature = createHmac("sha256", process.env.TELEGRAM_WEBHOOK_SECRET!)
    .update(payload)
    .digest("hex");
  return `${payload}:${signature}`;
}

export function verifyQrToken(token: string) {
  const [customerId, businessId, exp, signature] = token.split(":");
  if (!customerId || !businessId || !exp || !signature) return null;

  if (Number(exp) < Math.floor(Date.now() / 1000)) return null;

  const payload = `${customerId}:${businessId}:${exp}`;
  const expected = createHmac("sha256", process.env.TELEGRAM_WEBHOOK_SECRET!)
    .update(payload)
    .digest("hex");

  if (signature !== expected) return null;

  return { customerId, businessId };
}
