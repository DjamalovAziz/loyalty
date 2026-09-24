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

export async function setSignupToken(token: string, data: { phone: string; passwordHash: string }, ttlSeconds = 600) {
  try {
    await redis.setex(`signup:${token}`, ttlSeconds, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export async function getSignupToken(token: string) {
  try {
    const data = await redis.get(`signup:${token}`);
    return data ? JSON.parse(data as string) : null;
  } catch {
    return null;
  }
}

export async function deleteSignupToken(token: string) {
  try {
    await redis.del(`signup:${token}`);
  } catch {
    // ignore cache errors
  }
}
