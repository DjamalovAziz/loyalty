# loyalty

Multi-tenant, Telegram/phone-native loyalty platform. No email dependencies anywhere in the
auth flows — Business Owners use phone + password, Staff use phone + PIN + business slug,
Clients use phone + OTP delivered over Telegram, and the Super Admin uses a single
username/password pair via AdminJS.

## Stack

- **Next.js 14** (App Router) + **React 18**
- **tRPC v11** + Zod
- **Prisma v5** on **Supabase PostgreSQL** (pooled `DATABASE_URL` on 6543 for runtime,
  direct `DIRECT_URL` on 5432 for migrations)
- **Upstash Redis** for short-lived state: signup verification tokens (TTL 600s),
  redemption OTPs (TTL 300s), client login OTPs (TTL 300s)
- **NextAuth v5** with three JWT credential providers (`owner`, `staff`, `client`)
- **grammY** Telegram bot, stateless webhook at `/api/telegram/webhook`
- **AdminJS 7** for the Super Admin panel at `/admin`

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
6. **Super Admin** (`/admin`) — AdminJS over the same Prisma models, gated by
   `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

## Known rough edges to expect

- **AdminJS + Next.js 14 App Router**: `@adminjs/nextjs` is the least mature piece of this
  stack. If the `/admin` route fails to build, the usual fixes are pinning `adminjs` /
  `@adminjs/prisma` / `@adminjs/nextjs` to mutually-compatible versions and disabling SSR
  for any client bundle that imports `adminjs` directly.
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
src/app/admin                  Super Admin (AdminJS)
scripts/set-webhook.ts          Registers the Telegram webhook
```
