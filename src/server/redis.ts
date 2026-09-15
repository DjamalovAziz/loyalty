import { Redis } from "@upstash/redis";
import { env } from "~/env";

export const redis = new Redis({
  url: env().UPSTASH_REDIS_REST_URL,
  token: env().UPSTASH_REDIS_REST_TOKEN,
});

// --- Key helpers ---
export const keys = {
  signupVerify: (token: string) => `verify:${token}`,
  clientOtp: (clientId: string) => `otp:${clientId}`,
  // Scoped by businessSlug + phone: a phone number can belong to a Client row in
  // multiple businesses (Client is unique per businessId+phoneNumber), so a login
  // OTP issued for one business must never validate a login against a different
  // business's client webapp. Keying by phone alone was a cross-tenant auth bug.
  clientLoginOtp: (businessSlug: string, phone: string) => `login-otp:${businessSlug}:${phone}`,
};

export type PendingSignup = {
  name: string;
  phone_number: string;
  password_hash: string;
};

export type PendingRedeem = {
  clientId: string;
  points: number;
  code: string;
};

export async function setWithTtl<T>(key: string, value: T, ttlSeconds: number) {
  // @upstash/redis auto-serializes non-string values (see defaultSerializer in the SDK) —
  // pass the object directly rather than double-encoding with JSON.stringify ourselves.
  await redis.set(key, value, { ex: ttlSeconds });
}

export async function getAndParse<T>(key: string): Promise<T | null> {
  // automaticDeserialization is on by default, so this already comes back parsed.
  const raw = await redis.get<T>(key);
  return raw ?? null;
}

export async function del(key: string) {
  await redis.del(key);
}
