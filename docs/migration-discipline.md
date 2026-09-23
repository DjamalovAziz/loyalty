# Database Migration Discipline

## Rules

1. Every schema change must have a migration file under `prisma/migrations/`.
2. `CHECK` constraints, triggers, and indexes go through raw SQL in migration files.
3. `prisma migrate dev` is allowed only on local development databases.
4. Supabase (remote) migrations must be applied with `prisma migrate deploy` or via Supabase SQL editor.
5. After baseline is set, `prisma db push` is forbidden.
6. Do not manually alter production schema outside migrations.
7. Destructive migrations require explicit review.

## Workflow

```bash
# Local change
# 1. Edit prisma/schema.prisma
# 2. Create migration manually or via prisma migrate dev on local DB
# 3. Test migration on fresh local DB: npx prisma migrate reset
# 4. Commit migration files
# 5. CI runs prisma migrate deploy on a test database
# 6. Production deploy applies migrations via prisma migrate deploy
```

## Fresh-DB compatibility

- All migrations are sequential and must apply cleanly on a fresh database.
- Use `npx prisma migrate reset` to verify.
