# Developer Setup

## Prerequisites

- Node.js 22+
- PostgreSQL 16 (local instance on port 5433 recommended)
- Git

## Environment variables

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` / `DIRECT_URL`: local Postgres connection
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: optional for cache/broadcast
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Storage for logo uploads
- `TELEGRAM_BOT_TOKEN`: optional for Telegram features
- `TELEGRAM_WEBHOOK_SECRET`: optional for webhook validation
- `AUTH_SECRET`: NextAuth secret
- `CRON_SECRET`: cron endpoints secret
- `NEXTAUTH_URL`: app URL

## Local database

```bash
# Initialize local Postgres data directory (once)
initdb -D pgdata-test -U postgres -A trust -E utf8

# Start on port 5433
pg_ctl -D pgdata-test start -o "-p 5433"

# Create test database
psql -U postgres -h localhost -p 5433 -c "CREATE DATABASE loyalty_test;"

# Run migrations
npx prisma migrate deploy

# Seed (optional)
npx prisma db seed
```

## Install and run

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — Next.js dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript
- `npm run test` — Vitest (uses local Postgres on 5433)

## CI

GitHub Actions workflows:
- `.github/workflows/ci.yml` — test + typecheck + lint + build
- `.github/workflows/deploy.yml` — deploy to production via Vercel CLI
- `.github/workflows/backup.yml` — nightly `pg_dump`
- `.github/workflows/keepalive.yml` — health check every 5 minutes
