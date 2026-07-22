# Backup and recovery runbook

## Required production configuration

1. Confirm the production Supabase project has daily backups or point-in-time recovery enabled.
2. Record the recovery window and responsible account owner outside the repository.
3. Schedule `prune_expired_operational_data()` daily with the service role after legal review of the default 7/180/180-day retention windows.
4. Keep Vercel production deployment promotion dependent on the repository's required CI checks.

## Quarterly restore exercise

1. Restore the newest production backup into an isolated Supabase project.
2. Apply any migrations newer than the backup.
3. Run `check:single-page-schema`, `check:analytics-schema`, and `check:database-security` against the restored database.
4. Run the authenticated Playwright smoke suite against an isolated preview deployment.
5. Record recovery point, recovery time, missing objects, and follow-up work. Never point a restore exercise at production.

## Destructive operations

Account deletion remains immediate. Before introducing a grace period, align the product copy, privacy policy, Stripe retention requirements, and Supabase Auth behavior. Never restore one deleted account by copying production rows manually without a reviewed data-recovery procedure.
