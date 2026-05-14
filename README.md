# Программа лояльности

Веб-приложение для управления бонусной программой.
Стек: Next.js 15 (App Router) · TypeScript · Prisma · NextAuth.js · Tailwind CSS · PostgreSQL

---

## Быстрый старт

### 1. Установите зависимости
```bash
npm install
```

### 2. Переменные окружения
```bash
cp .env.example .env
# Заполните DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
```

### 3. База данных
```bash
npx prisma db push        # dev
# или
npx prisma migrate deploy # prod
```

### 4. Seed (первые аккаунты)
```bash
npm run db:seed
```

| Email | Пароль | Роль |
|---|---|---|
| admin@loyalty.local | admin123 | Администратор |
| cashier@loyalty.local | cashier123 | Кассир |

### 5. Запуск
```bash
npm run dev   # http://localhost:3000
```

---

## Деплой: Vercel + Supabase

1. Создайте проект на supabase.com, скопируйте DATABASE_URL (Transaction pooler)
2. Импортируйте репо на vercel.com
3. Добавьте env-переменные: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
4. После деплоя: `npx prisma migrate deploy && npm run db:seed`

## Деплой: VPS (Ubuntu) + PM2 + Nginx

```bash
npm install && cp .env.example .env
# Заполните .env
npx prisma migrate deploy
npm run db:seed
npm run build
pm2 start npm --name loyalty -- start
```

Nginx:
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
}
```

---

## Структура

```
app/admin/clients      # Клиенты (CRUD + бонусы + QR)
app/admin/transactions # Журнал + CSV/Excel экспорт
app/admin/users        # Сотрудники (кассиры)
app/cashier            # Интерфейс кассира (сканер QR)
app/client/[token]     # Публичная страница клиента
app/api/               # REST API
components/            # AdminSidebar, ClientModal, QRModal
prisma/                # Schema + seed
```

## Роли

| Маршрут | ADMIN | CASHIER | Без входа |
|---|---|---|---|
| /admin/* | ✅ | ❌ | ❌ |
| /cashier | ✅ | ✅ | ❌ |
| /client/[token] | ✅ | ✅ | ✅ |

## Команды

```bash
npm run dev           # Разработка
npm run build         # Сборка
npm run db:push       # Применить схему (dev)
npm run db:migrate    # Миграции (prod)
npm run db:seed       # Тестовые аккаунты
npm run db:studio     # Prisma Studio GUI
```

```
POST /api/auth/signin       — вход (NextAuth, не вызывается напрямую)

GET  /api/clients           — список клиентов (ADMIN, CASHIER)
POST /api/clients           — создать клиента (ADMIN only)
GET  /api/clients/[id]      — клиент по ID (ADMIN, CASHIER)
PUT  /api/clients/[id]      — редактировать (ADMIN only)
GET  /api/clients/token/[t] — публичная страница (без авторизации)

GET  /api/transactions      — журнал операций (ADMIN, CASHIER)
POST /api/transactions      — начислить/списать (ADMIN, CASHIER)

GET  /api/users             — список сотрудников (ADMIN only)
POST /api/users             — создать сотрудника (ADMIN only)
PATCH /api/users/[id]       — деактивировать/активировать (ADMIN only)

GET  /api/export            — скачать CSV или Excel (ADMIN only)
```