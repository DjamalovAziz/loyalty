# LoyaltySphere — Project Overview & Roadmap to Production-Grade

*Last updated: September 2026*

This document has two parts: **(1)** an honest snapshot of what LoyaltySphere actually is today, and **(2)** a staged, prioritized roadmap of what separates it from a loyalty platform you could confidently sell to a real business and trust with their customers' money-equivalent points.

The tone here is intentionally critical. A loyalty program is a trust product — clients trust it to remember their points correctly, business owners trust it to never lose a transaction, and Telegram is the only channel binding a person's identity to their balance. Every gap below is written from that lens, not as a checklist of "nice to haves."

---

## Part 1 — What LoyaltySphere Is Today

### 1.1 Concept & Positioning

A multi-tenant, Telegram-native loyalty-program SaaS for small/medium businesses in Uzbekistan and Central Asia. The core bet: in a market where email is a weak identity anchor but Telegram penetration is very high, phone number + Telegram chat replaces email/password/app-install entirely for the end customer. A business owner signs up once, gets a shareable link (`/b/<slug>`), and their customers never install anything or remember a password — they get a 6-digit code in a Telegram chat.

### 1.2 Tech Stack (as built)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 App Router, React 18 | Stable pairing at the time of build; React 18 chosen originally for an AdminJS compatibility constraint that no longer applies (AdminJS was removed — see §1.5) |
| API | tRPC v11 + Zod | End-to-end type safety between server and client without a separate REST/OpenAPI layer |
| Database | Supabase Postgres + Prisma v5 | Managed Postgres with a free tier; Prisma for schema/migrations |
| Connection strategy | PgBouncer transaction pooler (6543, `connection_limit=1`) at runtime, direct connection (5432) for migrations only | Serverless functions each get their own tiny pool; avoids exhausting Supabase's connection cap |
| Ephemeral state | Upstash Redis (REST SDK) | OTPs, signup verification tokens — all TTL-bound. REST-based, not `ioredis`, because serverless functions don't hold persistent TCP connections well |
| Auth | NextAuth v5, JWT sessions, 4 separate Credentials providers | One provider per role (`admin`, `owner`, `staff`, `client`) — different verification logic, same session shape |
| Bot | grammY, webhook mode | Stateless per-request; secured via Telegram's native `secret_token` header mechanism |
| Hosting | Vercel (free tier) | Serverless functions, generous enough for early-stage traffic |
| i18n | Custom lightweight context (no `next-intl`) | English / Russian / Uzbek, no locale-prefixed routing, persisted client-side |
| Theming | Tailwind `class` strategy, CSS-variable tokens | Strict black/white light+dark, respects `prefers-color-scheme` |

### 1.3 Roles & Access Model

Four roles, each walled off by both `tRPC` middleware and `middleware.ts` route guards:

- **Super Admin** (`/admin`) — single env-credentialed account, no DB row. Global visibility across all tenants, manual webhook registration/diagnostics.
- **Business Owner** (`/dashboard`) — phone + password. Owns exactly one `Business`. Manages tiers, rules, staff, sees aggregate stats.
- **Staff** (`/staff/<slug>/panel`) — phone + 4-digit PIN, scoped to one business. Searches clients, awards points, initiates/confirms point redemption via OTP.
- **Client** (`/b/<slug>`) — phone + Telegram-delivered OTP, auto-provisioned on first successful login. Views balance, tier progress, QR code, transaction history.

### 1.4 Core Flows

1. **Owner signup** — form → Redis-staged pending record (600s TTL) → Telegram deep link → contact share or typed phone number → phone match check → `User` + `Business` row created.
2. **Points earning** — staff searches/scans a client, enters an amount, `Transaction(type=EARN)` logged, tier recalculated, client notified via Telegram if linked.
3. **Points redemption** — two-step OTP: staff initiates (Redis-staged code, 300s TTL, sent to client's Telegram), client reads it off their phone, staff confirms, balance decremented, `Transaction(type=REDEEM)` logged.
4. **Client login** — phone → OTP requested (business-scoped Redis key) → delivered via Telegram if already linked, otherwise a bot-link prompt → OTP submitted → NextAuth session issued, `Client` row upserted.

### 1.5 What Changed During Hardening (chronological, for context)

This build went through a real audit-and-fix cycle, not just initial implementation:

- Removed a non-existent `@adminjs/nextjs` dependency (AdminJS has no working Next.js App Router integration at all) — replaced with a hand-rolled Super Admin panel.
- Fixed a root tRPC router naming collision (`client` shadowed a reserved property on the React Query proxy).
- Patched Next.js to close a critical RCE (CVE-2025-66478).
- **Fixed a real cross-tenant security bug**: client login OTPs were keyed by phone number alone, not `businessSlug` — meaning an OTP issued for Business A's client webapp would also authenticate against Business B's client account for the same phone number.
- Fixed a Prisma connection-pool leak (singleton wasn't cached in production builds).
- Switched Telegram webhook auth from a URL query-param secret to Telegram's native `secret_token` header.
- Added `src/env.ts` (Zod-validated environment) so missing/malformed config fails loudly instead of crashing deep inside a third-party library.
- Added `bot.catch()` and try/catch boundaries around Telegram update handling so failures log clearly instead of surfacing as bare 500s.
- Added a text-message fallback for phone verification (not everyone taps the native "share contact" button).

None of this is exotic — it's the normal shape of "build it, then find out what's actually wrong with it." The point of listing it here is that **Part 2 below is the same exercise, done proactively instead of reactively.**

---

## Part 2 — Critical Gaps & Staged Roadmap

Ordered by urgency, not by how interesting each item is to build. Phase 0 items are things I would not let a business owner rely on for real money-equivalent value until fixed. Everything after that is genuine product maturity, roughly in the order a loyalty-program specialist would prioritize it.

### Phase 0 — Before Any Real Business Relies On This

These are the ones that keep me up at night as the person who just built this.

1. **~~Race condition in point redemption~~ — FIXED while writing this document.**
   `staff.confirmRedeem` and `staff.earnPoints` used to read the client's balance, then separately `update` it — not wrapped in a `prisma.$transaction` with row-level locking. Two staff members (or one staff member double-tapping on a slow connection) confirming redemption for the same client at nearly the same moment could both pass the "sufficient balance" check before either write landed, producing a negative balance. Fixed in `src/server/api/routers/staff.ts`: both flows are now wrapped in `prisma.$transaction`, and redemption uses an atomic conditional update (`UPDATE ... WHERE points >= X`) instead of a read-then-check-then-write sequence — Postgres locks the row during that single statement, so a losing concurrent request simply matches zero rows instead of racing. Still outstanding: a DB-level `CHECK (points >= 0)` constraint as a second line of defense (belt-and-suspenders — the app-level fix above is the one that actually matters).

2. **No rate limiting anywhere.** OTP request endpoints (`client.requestLoginOtp`, `staff.initiateRedeem`), and password/PIN login attempts, have no throttling. This is directly exploitable: a 4-digit staff PIN is 10,000 combinations — with no lockout, it's brute-forceable in minutes against an exposed endpoint. Fix: `@upstash/ratelimit` (same Redis instance already in use) on every auth-adjacent mutation.

3. **No monitoring or alerting.** If the Telegram webhook silently starts failing, or Redis runs out of its free-tier command quota, the business owner finds out from an angry customer, not from you. Fix: Sentry (or even a scheduled health-check hitting `getWebhookInfo` and alerting on `last_error_message`), plus Vercel's own log drains.

4. **No transaction reversal / correction mechanism.** Staff will fat-finger an amount. Right now there is no way to void or correct a `Transaction` — the ledger has no concept of "this was a mistake." Fix: an `ADJUSTMENT` transaction type, owner-only, that references the transaction it corrects.

### Phase 1 — Core Loyalty-Program Maturity

5. **Point expiry policy.** Every serious loyalty program expires points after a period of inactivity (encourages return visits, caps long-term liability). Currently points never expire — this is both a missed retention lever and a growing "liability" the business owner has no way to manage.

6. **Audit log.** Every balance-changing action should be immutably attributable: who (which staff), when, from which IP/device. Right now `Transaction.staffId` exists but there's no tamper-evidence and no way for an owner to review "what did this staff member do today."

7. **Staff permission tiers.** Single flat `STAFF` role today. Real businesses distinguish a cashier (can earn/redeem points) from a shift manager (can also void transactions, add other staff). Worth adding before Phase 0's correction flow ships, since corrections should probably be manager-gated.

8. **Multi-location support.** Schema is `Business → Client/User`, flat. A business with 3 branches currently can't see per-branch stats or restrict staff to their own location. This is a real gap for anything beyond a single-storefront business — retail chains, barbershops with multiple locations (directly relevant to your other project).

### Phase 2 — Growth & Retention Features (this is the actual product)

A loyalty platform's value isn't the points ledger — it's what it lets an owner *do* with customer behavior. Right now there is none of this:

9. **Owner-facing analytics.** Beyond raw counts (clients, transactions), owners need: top spenders, at-risk/lapsed clients (no visit in N days), tier distribution, points-issued-vs-redeemed trend over time. This is what turns "a points tracker" into "a tool that pays for its own subscription."

10. **Broadcast / re-engagement messaging.** The bot already has a channel to every linked client — use it. Owner-triggered or automatic messages: "you haven't visited in 30 days, here's 50 bonus points," birthday bonuses, new-tier-unlocked congratulations. This is the highest-leverage feature to build next, because the infrastructure (Telegram delivery, client records) already exists.

11. **Referral program.** Client A refers Client B → both get bonus points on B's first transaction. Classic loyalty mechanic, straightforward to layer onto the existing `LoyaltyRule` model (add a `REFERRAL` trigger type).

### Phase 3 — This Becomes a Business, Not a Demo

12. **Billing.** There is currently no subscription/payment layer at all. For a Central Asian market, that means Payme or Click integration (Stripe is a poor fit for local card rails here), tied to per-business plan limits (e.g., staff count, client count, or transaction volume caps on a free tier).

13. **Terms of Service & Privacy Policy.** Not optional once real client phone numbers and transaction histories are being stored for paying businesses. Also directly relevant to the point below.

14. **Data residency / local compliance review.** Uzbekistan's personal data law generally expects certain categories of personal data about citizens to be processed with attention to where it's stored. Supabase's hosting region should be checked against this explicitly — this is easy to overlook when the whole stack is "just Vercel + Supabase defaults," and it's a legal question, not a technical one, so it's worth a real answer rather than an assumption.

### Phase 4 — Engineering Discipline

15. **Zero automated tests today.** Every fix in this project so far was found by manual audit or by a production error. For a ledger system, that's not sustainable past the first few real businesses. Minimum viable: unit tests on the two redemption/earn flows (especially the Phase 0 race-condition fix — that's exactly the kind of bug a concurrency test catches and a manual read-through doesn't), integration tests on all four auth providers.
16. **No CI pipeline.** `tsc --noEmit` and a lint pass should run on every push, automatically — this project has already shipped two build failures (a nonexistent npm package, a router naming collision) that a CI check would have caught before Vercel did.
17. **No local dev parity check.** `prisma generate`'s engine download depends on unrestricted network access — worth documenting a fallback (e.g., a committed `binaryTargets` config or a Docker-based dev environment) so a new contributor isn't blocked by a flaky network the way debugging sessions in this project sometimes were.

---

## Suggested Immediate Next Action

The one item on this list that could silently cost a real business real money-equivalent value in production, today, without any error being thrown — the Phase 0 race condition — is already fixed as of this document. The next smallest-effort, highest-leverage move is **rate limiting (#2)**: it's a single Redis-backed package (`@upstash/ratelimit`) applied to a handful of mutations you already have, using infrastructure you're already paying for. Everything after that is either a growth opportunity you're choosing to defer, or a risk that requires someone to actively attack the system rather than just use it normally.
