# Production Security Review

Self-assessment checklist for LoyaltySphere. This is a lightweight internal review, not an external audit.

## Auth & sessions
- [x] NextAuth with JWT sessions; `AUTH_SECRET` required.
- [x] Staff PIN login uses bcrypt with 12 rounds; lockout after 5 failed attempts for 15 minutes.
- [x] OTP codes are stored as base64-encoded hashes with TTL and max attempts.

## Authorization
- [x] tRPC procedures enforce ownership/business scope server-side.
- [x] `/admin` routes require `SUPER_ADMIN` role.
- [x] Staff operations are scoped by `businessId`.
- [x] Customer anonymization checks account ownership before wiping PII.

## Data protection
- [x] Financial events append-only via transactions; balance mutations only via atomic updates.
- [x] DB CHECK constraint prevents negative membership balances.
- [x] PII minimization: phone/telegram ID cleared on anonymization; ledger retained without PII.
- [x] Audit log retained for financial actions; retention job exists for non-financial logs.

## Transport & secrets
- [x] All write routes require `CRON_SECRET` or auth context.
- [x] Telegram webhook validates `x-telegram-bot-api-secret-token`.
- [x] Secrets are loaded from env; no hardcoded credentials.

## Observability & ops
- [x] Health endpoint checks DB and Redis.
- [x] Nightly backup workflow exists.
- [x] Reconciliation endpoint verifies membership balances vs transactions.
- [x] Quota endpoint tracks table counts.

## Dependencies & supply chain
- [x] `npm audit` informational; no critical auth-related vulnerabilities in direct deps.
- [x] Prisma schema validated; migrations applied via `prisma migrate deploy`.

## Residual risks
- Free-tier services may change terms/regions.
- Telegram rate limits are not enforced per-chat; `processQueue` sends in a loop.
- Admin routes depend on NextAuth JWT claims; token theft would bypass UI checks.
- No WAF/DDOS protection beyond Vercel defaults.
