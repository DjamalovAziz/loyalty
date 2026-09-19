import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function rateLimit(options: {
  key: string;
  limit: number;
  window: "1 s" | "1 m" | "1 h" | "1 d";
}): Promise<NextResponse | null> {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.limit, options.window),
    analytics: false,
  });

  const result = await ratelimit.limit(options.key);

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: result.reset },
      { status: 429 }
    );
  }

  return null;
}
