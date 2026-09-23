# Data Residency & Compliance

This document records where LoyaltySphere data is stored and which compliance considerations apply during the pilot phase. This is research/documentation only; it is not legal advice.

## Data inventory

| Data | Storage | Region | Notes |
| --- | --- | --- | --- |
| Primary database | Supabase Postgres | EU Central (Frankfurt) | Connection via pooler on port 6543. |
| Cache/queue | Upstash Redis | US | Used for analytics cache and broadcast queue. |
| Backups | GitHub Actions artifacts | US | Nightly `pg_dump` stored in Actions artifacts; retention depends on repo settings. |
| Functions/logs | Vercel | US/EU edge | Serverless functions and logs. |
| Auth/sessions | NextAuth (JWT) | Vercel | Session tokens stored client-side. |
| Telegram IDs/OTP | Supabase Postgres | EU Central | Telegram user IDs and OTP hashes stored in Postgres. |
| Sentry errors | Sentry | US | If enabled, may contain request metadata. |

## Applicable regime

- Primary user-facing data: phone numbers, Telegram IDs, names.
- During the pilot we treat these as ordinary personal data, not biometric/genetic/telecom-specific categories that would trigger mandatory localization under the March 2026 amendment (ZRU-1125).

## Free-tier feasibility

- Supabase free tier does not currently offer a choice of region for new projects in all cases; if the project was created in EU Central, data remains there.
- Upstash Redis free tier region is not selectable in all cases; if the instance is US-based, cache/queue data is stored in the US.

## Decision

- Continue on the current free stack if:
  - the project confirms data stays in EU Central for Supabase, and
  - at least one adequacy/contractual mechanism is accepted for US-based Upstash/Vercel/Sentry (standard contractual clauses or provider terms).
- If either condition cannot be confirmed, treat this as a trigger to leave the free stage before scaling the pilot.

## Residual risk

- Backup artifacts in GitHub Actions may leave copies in the US.
- Sentry (if enabled) may capture request data outside the primary database region.
- Free-tier terms can change; region assignment can be affected by project moves.

## Actions required before production scale

- Confirm Supabase region from the project dashboard.
- Confirm Upstash region from the dashboard/CLI.
- Document Vercel deployment region and logs retention.
- If needed, add a data processing agreement or restrict cross-region services.
