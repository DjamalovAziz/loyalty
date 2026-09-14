import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// --- Key helpers ---
export const keys = {
  signupVerify: (token: string) => `verify:${token}`,
  clientOtp: (clientId: string) => `otp:${clientId}`,
  clientLoginOtp: (phone: string) => `login-otp:${phone}`,
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
  await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
}

export async function getAndParse<T>(key: string): Promise<T | null> {
  const raw = await redis.get<string>(key);
  if (!raw) return null;
  // Upstash SDK sometimes auto-parses JSON already; guard both cases.
  if (typeof raw === "object") return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function del(key: string) {
  await redis.del(key);
}
