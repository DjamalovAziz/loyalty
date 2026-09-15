import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required (openssl rand -base64 32)"),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required — bot-dependent routes will 500 without it"),
    TELEGRAM_BOT_USERNAME: z.string().min(1),
    // Telegram only accepts A-Z, a-z, 0-9, _ and - in secret_token, 1-256 chars.
    TELEGRAM_WEBHOOK_SECRET: z.string().regex(/^[A-Za-z0-9_-]{1,256}$/, "must match Telegram's secret_token charset"),
    ADMIN_USERNAME: z.string().min(1),
    ADMIN_PASSWORD: z.string().min(8),
    NEXT_PUBLIC_APP_URL: z.string().url(),
});

// Validated lazily (not at import time) so this never crashes routes that don't need
// the vars they're missing — call `env()` inside the code path that actually needs it.
let cached: z.infer<typeof envSchema> | undefined;

export function env() {
    if (!cached) {
        const parsed = envSchema.safeParse(process.env);
        if (!parsed.success) {
            const missing = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n  ");
            throw new Error(`Invalid/missing environment variables:\n  ${missing}`);
        }
        cached = parsed.data;
    }
    return cached;
}