import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function redisPing() {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

export async function getCachedAnalytics(key: string) {
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached as string) : null;
  } catch {
    return null;
  }
}

export async function setCachedAnalytics(key: string, data: any, ttlSeconds = 300) {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch {
    // ignore cache errors
  }
}

export async function setVerifyToken(token: string, data: { phone: string; passwordHash: string }, ttlSeconds = 600) {
  try {
    await redis.setex(`verify:${token}`, ttlSeconds, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export async function getVerifyToken(token: string) {
  try {
    const data = await redis.get(`verify:${token}`);
    return data ? JSON.parse(data as string) : null;
  } catch {
    return null;
  }
}

export async function deleteVerifyToken(token: string) {
  try {
    await redis.del(`verify:${token}`);
  } catch {
    // ignore cache errors
  }
}
