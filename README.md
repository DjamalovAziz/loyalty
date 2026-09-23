# LoyaltySphere

Мультитенантная платформа лояльности для локального бизнеса на free-tier сервисах.

## Стек

- **Frontend:** Next.js 15, React 19, Tailwind CSS
- **Backend:** tRPC v11, NextAuth v5
- **Database:** Supabase PostgreSQL (Free)
- **Cache:** Upstash Redis (Free)
- **Telegram:** telegraf, webhook
- **Monitoring:** Sentry (Free)
- **Tests:** Vitest, Testing Library

## Free-stack правила

- Vercel Hobby: только non-commercial personal use
- OTP доставляется только через Telegram
- OTP и lockout хранятся в Postgres; Redis — только throttle
- Для auth/PIN/OTP при недоступности Redis — fail-closed
- Production и staging — разные Supabase-проекты
- Тесты — только на локальном/CI Postgres, никогда на prod-БД
- Дампы БД и логи с PII не хранятся в публичном репо
- Cloudflare Worker — для частых задач (health check), GitHub Actions — для CI и ночных задач

## Локальный запуск

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

## Скрипты

- `npm run dev` — запуск dev-сервера
- `npm run build` — production сборка
- `npm run typecheck` — проверка типов
- `npm run lint` — линтинг
- `npm run test` — тесты
- `npx prisma studio` — просмотр БД

## Тесты

```bash
npm run test
```

## Деплой

Vercel Hobby (non-commercial pilot only).

## Файлы

- `prisma/schema.prisma` — схема БД
- `src/lib/routers/` — tRPC роутеры
- `src/app/` — Next.js pages
- `.github/workflows/` — CI/CD
- `workers/monitor/` — Cloudflare Worker монитор
- `docs/` — документация

## License

MIT
