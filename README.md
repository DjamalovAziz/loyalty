# LoyaltySphere

Мультитенантная платформа лояльности для локального бизнеса: Telegram-бот + клиентский каталог + dashboard владельца + staff-панель. Клиенты имеют глобальную идентичность, а каждый Business управляет баллами, cashback и rewards через Membership.

> **Важно:** README описывает продукт и архитектуру. Задачи и порядок выполнения находятся в `.todo`.
> **До завершения Phase 0 нельзя доверять системе реальные денежно-эквивалентные баллы.**

## 1. Основные концепции

* **Customer** — глобальный клиент, может состоять в программах нескольких Business.
* **Business** — tenant: магазин, кафе, салон и т.д.
* **Membership** — связь Customer ↔ Business; здесь хранятся points, tier и состояние лояльности.
* **Transaction** — движение баллов: `EARN`, `REDEEM`; планируется `ADJUSTMENT`.
* **LoyaltyRule** — правила начисления/списания и будущие триггеры, включая `REFERRAL`.
* **SupportTicket** — обращение клиента в поддержку, сохраняется в БД и отправляется в Telegram.
* **User/Staff** — владелец или сотрудник Business. Сейчас роль STAFF плоская; планируются CASHIER/MANAGER.
* **Points** — баланс конкретного Membership; не должен быть отрицательным.

Ключевые принципы: глобальная идентичность, tenant isolation, атомарные операции с баллами и Telegram как основной канал коммуникации.

## 2. Что уже работает

### Клиенты

* глобальный аккаунт;
* OTP-вход (`customer.requestLoginOtp`);
* каталог (`/explore`, `business.explore`);
* вступление/выход (`customer.join`, `customer.leave`);
* `/me` с membership и балансами;
* `/support`;
* QR/check-in по raw customer ID.

### Владельцы

* `/dashboard`;
* присутствие Business в каталоге;
* профиль Business поддерживает category, description, address, coordinates, logo, welcome points, minimum cashback, Telegram group;
* уведомления о SupportTicket через Telegram.

### Сотрудники

* вход по PIN;
* `staff.initiateRedeem`;
* атомарное `staff.confirmRedeem`;
* атомарное `earnPoints`;
* check-in по customer ID.

### Уже реализованные защитные механизмы

* атомарные earn/redeem;
* условное обновление баланса;
* Telegram webhook через `secret_token`;
* глобальная Customer-модель, устранившая прежний cross-tenant OTP bug;
* raw customer ID поддерживается для QR/check-in.

## 3. Что отсутствует

Критические пробелы:

* rate limiting;
* мониторинг и alerting;
* отмена/корректировка транзакций;
* DB `CHECK(points >= 0)`;
* audit log;
* Terms of Service и Privacy Policy;
* подтверждённая data residency для Узбекистана;
* автоматические тесты и CI.

Продуктовые пробелы:

* полноценный Business profile editor;
* customer navigation/UX;
* admin UI для SupportTicket;
* points expiry;
* staff permission tiers;
* camera QR scanner;
* analytics;
* broadcasts/reactivation;
* referrals;
* multi-location;
* billing/subscriptions.

## 4. Архитектура

Стек:

* Next.js + TypeScript;
* tRPC-подобные процедуры;
* Prisma;
* PostgreSQL/Supabase;
* Redis/Upstash;
* Telegram Bot API;
* Vercel;
* `html5-qrcode`;
* Sentry — планируется.

Поток:

`Client/Owner/Staff → Next.js/tRPC → Prisma/PostgreSQL`

Дополнительно используются Redis/Upstash и Telegram Bot API.

Архитектура — MVP-монолит. Это нормально для старта, но бизнес-логика, API и data access недостаточно разделены; Telegram тесно связан с приложением; отсутствие тестов/CI усложняет развитие. При росте потребуется рефакторинг слоёв.

## 5. Модель данных

Основные сущности:

`Business → Membership ← Customer`

`Membership → Transaction`

`Business → LoyaltyRule`

`Customer + Business → SupportTicket`

`Business → User/Staff`

Баланс хранится в `Membership.points`. На уровне приложения используются атомарные операции, но DB constraint `points >= 0` ещё отсутствует.

Основные будущие усиления: permission tiers, multi-location, referral rules, tamper-evident audit и DB-level balance protection.

## 6. Безопасность

Есть четыре auth-механизма:

1. customer OTP;
2. owner credentials;
3. staff PIN;
4. Telegram webhook identity.

Основные проблемы:

* 4-digit PIN можно brute-force без rate limiting/lockout;
* нет мониторинга;
* нельзя безопасно исправлять ошибочные transactions;
* нет DB-level `points >= 0`;
* нет полноценного audit log;
* отсутствуют ToS/Privacy Policy;
* не подтверждена data residency.

**Phase 0 должен закрыть эти проблемы до использования реальных баллов.**

## 7. Telegram

Telegram используется для:

* webhook;
* поддержки;
* уведомлений.

Планируется:

* broadcasts;
* reactivation;
* birthday/tier notifications;
* webhook monitoring;
* `/admin` для поддержки.

Telegram не должен оставаться единственным интерфейсом поддержки при масштабировании.

## 8. API и страницы

Основные процедуры:

* `business.explore`
* `customer.requestLoginOtp`
* `customer.join`
* `customer.leave`
* `staff.initiateRedeem`
* `staff.confirmRedeem`
* `staff.checkInByCustomerId`
* `earnPoints`

Страницы:

`/`, `/explore`, `/me`, `/support`, `/dashboard`, staff panel; `/admin` — планируется.

API пока минимален: отсутствуют analytics, messaging, referrals и billing API; также нет полноценного versioning/documentation.

## 9. База данных

Prisma — source of truth, PostgreSQL — основная БД, Supabase — текущий host.

Необходимы:

* `Membership.points >= 0`;
* воспроизводимые migrations;
* backup/recovery strategy;
* проверка data residency.

Сейчас DB-level CHECK и полноценная backup/recovery strategy отсутствуют.

## 10. Тестирование и CI

Сейчас автоматических тестов нет; ошибки находились вручную или после deployment.

Минимум:

* unit tests earn/redeem;
* concurrency tests;
* auth integration tests;
* membership/tenant isolation tests;
* CI: typecheck + lint + tests + build + Prisma validation.

Ранее уже встречались ошибки, которые CI должен предотвращать: отсутствующий npm package, router collision, missing schema field и build/type errors.

## 11. Deployment

Production:

`Vercel + Supabase PostgreSQL + Upstash + Telegram webhook`

Перед deployment необходимо проверить:

* environment;
* migrations;
* Telegram webhook и `secret_token`;
* `getWebhookInfo`;
* Redis;
* rate limiting;
* `points >= 0`;
* monitoring.

Сейчас нет автоматизированного deployment checklist, rollback strategy или canary/blue-green deployment.

## 12. Roadmap

### Phase 0 — Production Safety

Rate limiting, atomicity/concurrency, transaction adjustments, DB constraint, monitoring, critical tests, CI, auth/tenant audit.

### Phase 1 — Core Product

Business profile editor, navigation, customer UX, support admin, point expiry, audit log, staff roles, camera QR.

### Phase 2 — Growth

Analytics, broadcasts/reactivation, referrals, loyalty campaign engine, segmentation, multi-location.

### Phase 3 — Commercialization

Billing/Payme/Click, ToS, Privacy Policy, Uzbekistan compliance/data residency, production security review.

### Phase 4 — Engineering Maturity

Expanded tests, Prisma fallback, developer setup docs, migration discipline, observability/runbook.

**Непосредственная последовательность должна определяться `.todo`; Phase 0 является обязательным барьером перед реальными баллами.**

## 13. Ограничения и итог

LoyaltySphere — MVP с правильными базовыми концепциями: глобальный Customer, Membership, атомарные transactions и Telegram. Но сейчас система не готова для реального денежно-эквивалентного loyalty balance из-за критических security/operational gaps и отсутствия тестовой инфраструктуры.

Главные технические направления:

1. закрыть Phase 0;
2. сделать usable dashboard/customer UX;
3. добавить growth/commercial features;
4. укрепить тестирование, CI и эксплуатацию;
5. при росте разделить слои монолита.

Для contributions: изменения должны соответствовать текущей фазе, не нарушать tenant isolation и относиться к points как к денежному эквиваленту. License пока не указана.

## 14. Текущее состояние

На текущий момент реализовано:

### Phase 0 — базовая безопасность и корректность
- Rate limiting для OTP и redeem через Upstash Redis
- Атомарные earn/redeem через `prisma.$transaction`
- DB constraint `memberships.points >= 0`
- Тип `ADJUSTMENT` для корректировок transactions
- Health check endpoint: `GET /api/health`
- CI: typecheck + lint + tests + build
- Базовый audit log

### Phase 1 — основной продукт
- Dashboard владельца с редактированием Business profile
- Каталог `/explore` с поиском и фильтрацией
- Детальная страница бизнеса `/explore/[slug]` с join/leave
- `/me` — просмотр memberships и балансов
- `/support` — форма обращения
- `/admin` — управление support tickets

## 15. Быстрый старт

### Предварительные требования
- Node.js 18+
- PostgreSQL (Supabase или локальный)
- Upstash Redis
- Telegram Bot Token

### Установка

```bash
# 1. Клонировать репозиторий
git clone <repo-url> && cd loyalty

# 2. Установить зависимости
npm install

# 3. Настроить переменные окружения
cp .env .env.local
# Отредактировать .env.local с вашими значениями

# 4. Применить миграции
npx prisma migrate dev

# 5. Заполнить тестовыми данными (опционально)
npm run db:seed

# 6. Запустить dev сервер
npm run dev
```

### Переменные окружения

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Direct PostgreSQL connection (для миграций) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token |
| `TELEGRAM_WEBHOOK_SECRET` | Secret для вебхука |
| `NEXTAUTH_URL` | Base URL приложения |
| `AUTH_SECRET` | Secret для NextAuth |

### Доступные скрипты

```bash
npm run dev          # Dev сервер
npm run build        # Production сборка
npm run start        # Запуск production
npm run lint         # ESLint
npm run typecheck    # TypeScript проверка
npm run test         # Запуск тестов
npm run db:generate  # Генерация Prisma Client
npm run db:push      # Push schema в БД
npm run db:migrate   # Применить миграции
npm run db:studio    # Prisma Studio
npm run db:seed      # Заполнить тестовыми данными
```

## 16. Структура проекта

```
src/
├── app/
│   ├── api/
│   │   ├── trpc/                    # tRPC endpoint
│   │   ├── telegram/webhook/        # Telegram webhook
│   │   ├── dashboard/               # Dashboard API
│   │   └── health/                  # Health check
│   ├── explore/
│   │   ├── page.tsx                 # Список бизнесов
│   │   └── [slug]/
│   │       └── page.tsx             # Детали бизнеса
│   ├── me/page.tsx                  # Личный кабинет
│   ├── support/page.tsx             # Поддержка
│   ├── dashboard/page.tsx           # Dashboard владельца
│   ├── staff/page.tsx               # Staff панель
│   ├── admin/page.tsx               # Admin support
│   └── layout.tsx                   # Root layout
├── components/                      # UI компоненты
├── lib/
│   ├── prisma.ts                    # Prisma Client
│   ├── redis.ts                     # Upstash Redis
│   ├── rateLimit.ts                 # Rate limiting
│   ├── audit.ts                     # Audit logging
│   ├── trpc.ts                      # tRPC setup
│   └── routers/
│       ├── _app.ts                  # Root router
│       ├── customer.ts              # Customer procedures
│       ├── business.ts              # Business procedures
│       ├── staff.ts                 # Staff procedures
│       └── admin.ts                 # Admin procedures
├── types/                           # TypeScript types
└── middleware.ts                    # Next.js middleware
prisma/
├── schema.prisma                    # Prisma schema
├── migrations/                      # Миграции
└── seed.ts                          # Seed script
tests/
└── phase0.test.ts                   # Phase 0 тесты
```
