# Operational Runbook

## Outages

### Telegram outage
- Impact: OTP delivery fails, support notifications delayed
- Action: Monitor webhook logs, queue messages in DB for later delivery
- Rollback: N/A (external service)

### Redis outage
- Impact: Rate limiting degrades to fail-open for non-critical endpoints
- Action: Monitor `/api/health`, verify DB-level rate limits still work
- Rollback: N/A (Upstash manages Redis)

### Database outage
- Impact: All operations fail
- Action: Check Supabase status, verify backups are current
- Rollback: Restore from backup if needed

### Vercel deployment failure
- Impact: Service unavailable
- Action: Check Vercel dashboard, review logs, rollback to previous deployment
- Rollback: `vercel rollback`

## Quota exhaustion

### Upstash Redis
- Monitor: command count in Upstash dashboard
- Alert: at 80% of 500K/month
- Action: Reduce rate limit windows, fail-open non-critical endpoints

### Supabase database
- Monitor: database size in Supabase dashboard
- Alert: at 400MB of 500MB
- Action: Archive old audit logs, enable retention policies

### Sentry
- Monitor: error count in Sentry dashboard
- Alert: at 4K of 5K/month
- Action: Reduce sampling rate, filter noise

## Suspicious activity

### Staff lockout spike
- Check: `/admin` audit logs for staff login attempts
- Action: Lock staff account, notify owner

### Points discrepancy
- Run: reconciliation query comparing `Membership.points` to `SUM(Transaction)`
- Action: Create adjustment with reason, notify admin

### Unauthorized access attempts
- Check: audit logs for failed authorization
- Action: Review affected accounts, rotate credentials if needed

## Recovery procedures

### Database restore
1. Create new Supabase project
2. Run `prisma migrate deploy`
3. Restore from latest `pg_dump` backup
4. Verify data integrity

### Webhook reconfiguration
1. Set webhook URL: `https://your-domain/api/telegram/webhook`
2. Set secret token: matches `TELEGRAM_WEBHOOK_SECRET`
3. Verify: `getWebhookInfo`

## Escalation

- Critical: service down → check Vercel, Supabase, Upstash status pages
- Security: suspicious activity → review audit logs, lock accounts, notify owner
- Data: discrepancy or loss → restore from backup, investigate root cause
