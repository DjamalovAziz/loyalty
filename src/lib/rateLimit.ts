import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const otpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, "1 m"),
  analytics: false,
  prefix: "ratelimit:otp",
});

export const redeemLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: false,
  prefix: "ratelimit:redeem",
});

export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  analytics: false,
  prefix: "ratelimit:api",
});

export const broadcastLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: false,
  prefix: "ratelimit:broadcast",
});
