# Job-Seeker Rollout Smoke Checklist

> **The paid Starter/Pro rollout was cancelled.** There is no plan chooser, no
> `402 checkout_required`, no live checkout session, and no trial webhook in the
> publish flow. Publishing a living page is free for every account.
> `/api/stripe/checkout` is tombstoned and returns `410` with
> `code=billing_disabled`. This checklist now smoke-tests the **free-publish**
> flow. The authoritative coverage lives in `tests/e2e/user-ready.spec.ts`
> ("free users can publish without checkout or a payment method" and "existing
> users can create, publish, edit, and change their public URL").

## Preconditions
- Apply the latest `supabase/migrations` (including the security-hardening
  migrations `20260718160000_*` and `20260718170000_*`).
- Set Playwright auth and Supabase service-role env vars so the admin fixture
  flows run instead of skipping.
- No Stripe price ids are required to publish; only the legacy customer portal
  (`/api/stripe/portal`) and signed webhook (`/api/webhooks/stripe`) remain.

## Automated Checks
- Run `npm run typecheck`
- Run `npm run test:unit`
- Run `npm run check:single-page-schema`
- Run `npm run check:analytics-schema`
- Run `npm run check:database-security`
- Run `npm run check:client-security`
- Run `npm run test:e2e` in a staging-capable environment

## Manual API / UI Smoke
1. Sign in as a `spark` user (any billing cohort, including
   `publish_cc_trial_v1`), open `/create`, and build a page.
2. Click **Publish Page** and confirm the page publishes directly to the
   "Your page is live." confirmation. There is no "Choose Plan to Publish"
   button and no plan chooser.
3. Confirm no `POST` to `/api/stripe/checkout` is made during publish, and that
   `/api/pages/publish` returns `200` with `{ slug, pageId }` (never `402` /
   `checkout_required`).
4. Call `/api/stripe/checkout` directly and confirm it returns `410` with
   `code=billing_disabled`.
5. In `/dashboard/settings`, confirm the "No card or subscription required" copy
   appears and that no "Start Starter Trial", "Start Pro Trial", or
   "Upgrade to Pro" buttons are present.
6. Confirm the public page is live and that Resume PDF export works for both the
   signed-in owner and an anonymous viewer.

## Release Gates
- Staging smoke passes with real Supabase infrastructure.
- Schema and database-security checks pass against the target database.
- The free-publish e2e coverage in `tests/e2e/user-ready.spec.ts` stays green.
- No publish path attempts a checkout session or blocks publishing behind payment.
