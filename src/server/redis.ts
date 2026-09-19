import { Redis } from "@upstash/redis";
import { env } from "~/env";

export const redis = new Redis({
  url: env().UPSTASH_REDIS_REST_URL,
  token: env().UPSTASH_REDIS_REST_TOKEN,
});

// --- Key helpers ---
export const keys = {
  signupVerify: (token: string) => `verify:${token}`,
  // Redemption OTP, scoped to a specific membership (business + customer pair) —
  // unaffected by the Client→Customer/Membership refactor beyond the id it takes.
  redemptionOtp: (membershipId: string) => `otp:${membershipId}`,
  // Customer login is global now (Customer is one identity across every business),
  // so this is correctly scoped by phone alone — no businessSlug needed. The old
  // per-business Client model needed businessSlug scoping specifically because a
  // phone could have a separate Client row per business; that whole problem class
  // goes away once identity is global.
  customerLoginOtp: (phone: string) => `login-otp:${phone}`,
};

export type PendingSignup = {
  name: string;
  phone_number: string;
  password_hash: string;
};

export type PendingRedeem = {
  membershipId: string;
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
