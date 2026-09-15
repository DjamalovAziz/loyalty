# LoyaltySphere

Multi-tenant, Telegram/phone-native loyalty platform. No email dependencies anywhere in the
auth flows — Business Owners use phone + password, Staff use phone + PIN + business slug,
Clients use phone + OTP delivered over Telegram, and the Super Admin uses a single
username/password pair via a dedicated admin panel.

## Stack

- **Next.js 14** (App Router) + **React 18**
- **tRPC v11** + Zod
- **Prisma v5** on **Supabase PostgreSQL** (pooled `DATABASE_URL` on 6543 for runtime,
  direct `DIRECT_URL` on 5432 for migrations)
- **Upstash Redis** for short-lived state: signup verification tokens (TTL 600s),
  redemption OTPs (TTL 300s), client login OTPs (TTL 300s)
- **NextAuth v5** with three JWT credential providers (`owner`, `staff`, `client`)
- **grammY** Telegram bot, stateless webhook at `/api/telegram/webhook`
- Super Admin panel at `/admin` — plain Next.js pages + a `SUPER_ADMIN`-gated tRPC router,
  no third-party admin framework (see note below on why AdminJS was dropped)

## Getting started

```bash
npm install
cp .env.example .env   # fill in Supabase, Upstash, Telegram, and admin credentials
npm run db:push        # or db:migrate for a tracked migration
npm run dev
```

To receive Telegram events locally, either use a tunnel (ngrok/Cloudflare Tunnel) and point
`NEXT_PUBLIC_APP_URL` at it, or deploy first and then run:

```bash
npm run bot:set-webhook
```

## Flows implemented

1. **Business Owner signup** (`/signup`) — collects name/phone/password, stashes a pending
   record in Redis under `verify:<token>`, and deep-links to
   `https://t.me/<bot>?start=<token>`. The bot asks the user to share their contact; on
   match it creates the `User` (role `BUSINESS_OWNER`) + a `Business` row and deletes the
   Redis key. On mismatch it replies with an explicit error and nothing is created.
2. **Tiers & rules** (`/dashboard/loyalty`) — full CRUD, scoped to the signed-in owner's
   business via `ownerProcedure`.
3. **Points operations** — `staff.earnPoints` increments balance, recalculates tier, and
   logs a `Transaction`. Redemption is two-step: `staff.initiateRedeem` generates a 6-digit
   OTP (Redis `otp:<clientId>`, 300s TTL) sent to the client's linked Telegram chat;
   `staff.confirmRedeem` validates it, deducts points, and logs the transaction.
4. **Staff panel** (`/staff/[slug]/panel`) — client search by name/phone (swap in an
   `html5-qrcode` scanner component wherever you want camera input; `staff.searchClient`
   already accepts a raw scanned client ID as the query).
5. **Client webapp** (`/b/[slug]`) — phone + Telegram OTP login, auto-registers the client
   on first successful verification, shows points/tier/progress bar, a QR code of the
   client ID for staff to scan, and paginated-ready transaction history.
6. **Super Admin** (`/admin`) — signs in via the `admin` NextAuth provider using
   `ADMIN_USERNAME` / `ADMIN_PASSWORD` (no DB row), then sees global stats, a businesses
   table, and an owners/staff table with a verify/unverify toggle.

## Known rough edges to expect

- **Why no AdminJS**: the original spec called for AdminJS, but `@adminjs/nextjs` is not a
  published package and AdminJS has no official Next.js App Router adapter — the only
  supported integrations are Express/Fastify/NestJS/Koa, none of which map cleanly onto
  Vercel's serverless functions. The Super Admin panel here is hand-rolled instead (plain
  pages + `adminProcedure`); it covers the spec's "global system overview and business
  control" requirement without a dependency that can't actually build. If you want AdminJS's
  auto-generated CRUD UI specifically, it needs a standalone Express server deployed
  separately from this Next.js app.
- **Vercel serverless + Prisma**: the global singleton in `src/server/db.ts` avoids
  exhausting Supabase's free-tier connection limit, but keep `connection_limit=1` on the
  pooled URL as this prompt specifies.
- **grammY webhook mode**: the webhook handler is intentionally stateless
  (`export const dynamic = 'force-dynamic'`) — don't add in-memory bot state that needs to
  survive across invocations; use Redis/Postgres instead (already done for OTPs).
- Every phone number is normalized with `phone.replace(/\D/g, '')` before comparison or
  storage, per the spec, to tolerate `+`, spaces, and dashes.

## Project layout

```
prisma/schema.prisma          Data models
src/server/db.ts               Prisma singleton
src/server/redis.ts            Upstash client + TTL helpers
src/server/auth.ts              NextAuth v5 config (owner/staff/client providers)
src/server/api/                tRPC routers (auth, loyalty, staff, client)
src/lib/telegram-bot.ts        grammY bot + signup/contact handlers
src/app/api/telegram/webhook   Webhook route
src/app/signup                 Owner signup
src/app/dashboard              Owner dashboard + loyalty CRUD
src/app/staff/[slug]           Staff signin + panel
src/app/b/[slug]                Client webapp
src/app/admin                  Super Admin (custom, NextAuth + tRPC)
scripts/set-webhook.ts          Registers the Telegram webhook
```
