# Operational Runbook

## Telegram outage

- Symptom: bot not responding, webhook errors in logs.
- Check: `TELEGRAM_BOT_TOKEN` validity, webhook URL, network egress.
- Rollback: disable webhook, queue messages in DB if needed.
- Escalation: check @BotSupport on Telegram.

## Redis / Upstash outage

- Symptom: analytics cache misses, broadcast queue not processing.
- Check: Upstash dashboard, `UPSTASH_REDIS_REST_URL` env.
- Rollback: app continues without cache; broadcasts queue in DB.
- Escalation: Upstash status page.

## Database / Supabase outage

- Symptom: 500 errors, DB connection failures.
- Check: Supabase status, connection pooler, `DATABASE_URL`.
- Rollback: none; wait for provider recovery.
- Escalation: Supabase status page, support.

## Quota exhaustion

- Symptom: Upstash Redis or Sentry quota exceeded.
- Check: provider dashboard, logs.
- Rollback: disable non-critical features (broadcast, error reporting).
- Escalation: upgrade plan or switch to free alternative.

## Failed deployment

- Symptom: Vercel deploy failed, CI red.
- Check: Vercel build logs, `npm run build` locally.
- Rollback: redeploy previous commit, revert PR.
- Escalation: Vercel support if platform issue.

## Stuck transactions / incorrect balance

- Symptom: customer balance mismatch, reconciliation shows discrepancies.
- Check: `cron.reconciliation` endpoint, transaction ledger.
- Rollback: do not manually adjust DB; use `adjustment.create` with audit trail.
- Escalation: notify security lead, preserve ledger.

## Suspicious staff activity

- Symptom: unexpected point changes, multiple failed logins.
- Check: `audit.businessLog`, `staffAccount.failedAttempts`.
- Rollback: disable staff account, freeze business if needed.
- Escalation: notify owner, review audit trail.

## Auth abuse

- Symptom: brute-force OTP/PIN attempts, token replay.
- Check: OTP attempts count, staff lockout state, session invalidation.
- Rollback: increase lockout threshold, rotate `AUTH_SECRET`, invalidate sessions.
- Escalation: notify security lead.

## Backup restore

- Symptom: data loss, corruption.
- Check: latest backup in GitHub Actions artifacts.
- Rollback: restore via `psql` or `pg_restore` to a new DB; verify before cutover.
- Escalation: database admin, Supabase support.
