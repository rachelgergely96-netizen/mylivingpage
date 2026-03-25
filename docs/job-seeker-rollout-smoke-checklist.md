# Job-Seeker Rollout Smoke Checklist

## Preconditions
- Apply `supabase/migrations/20260325120000_publish_cc_trial_pricing.sql`
- Apply `supabase/migrations/20260325153000_proof_and_testimonial_analytics.sql`
- Set both `STRIPE_STARTER_MONTHLY_PRICE_ID` and `STRIPE_PRO_MONTHLY_PRICE_ID`
- Confirm Stripe webhooks are pointed at `/api/webhooks/stripe`

## Automated Checks
- Run `npm run typecheck`
- Run targeted Vitest for billing, publish, parse, analytics, and dashboard flows
- Run `npm run check:single-page-schema`
- Run `npm run check:analytics-schema`
- Run `npm run test:e2e` in a staging-capable environment

## Manual API / UI Smoke
1. As a `publish_cc_trial_v1` user on `spark`, open `/create`, build a page, and confirm publish opens the Starter/Pro chooser instead of publishing directly.
2. Call `/api/stripe/checkout` for `starter` and `pro` and confirm each creates a subscription checkout session with the expected price id.
3. Confirm `/api/pages/publish` returns `402` with `code=checkout_required` for a new-cohort `spark` user.
4. Complete a Starter publish flow and confirm:
   - return lands back on `/create`
   - webhook upgrades the profile to Starter trialing
   - page auto-publishes
   - settings show Starter trial copy
   - dashboard shows basic visibility and upgrade-to-Pro prompts instead of full analytics
5. Upgrade the same user to Pro and confirm:
   - settings show Pro state
   - dashboard exposes Page Analytics
   - `/dashboard/analytics/[pageId]` loads successfully
6. Cancel or delete the subscription and confirm:
   - the public page shows the offline holding screen
   - visiting the offline page creates an owner-facing reactivation banner in the dashboard

## Release Gates
- Staging smoke passes with real Supabase + Stripe test infrastructure
- New schema checks pass against the target database
- Existing `legacy_freemium` and `trial_hosting_v1` flows remain green in automated tests
- Production rollout waits until at least one full Starter billing smoke passes outside localhost
