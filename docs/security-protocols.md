# Security Protocols

This repo treats security as an explicit release discipline, not a cleanup task.

## 1. Secret Handling

- Only `NEXT_PUBLIC_*` env vars may appear in client modules.
- Service-role Supabase keys, Stripe secrets, and webhook secrets stay server-only.
- CI enforces the client boundary with `npm run check:client-security`.
- Tests, smoke flows, and integration credentials must point at staging, never production.
- Rotate a secret immediately if it appears in client code, logs, screenshots, or git history.

Secret rotation checklist:

1. Rotate the provider secret in Supabase, Stripe, or the upstream system.
2. Update local env files, deployment env vars, and GitHub Actions secrets.
3. Redeploy the affected environment.
4. Audit recent logs, screenshots, and git history for any additional leak surface.
5. Record the incident and the rotated secret owner in the release notes or ops log.

## 2. Backend Access Control

- Every API route declares `routeTrustLevel`.
- Routes using service-role Supabase must perform a second control:
  - ownership check,
  - authenticated-user check,
  - admin authorization, or
  - verified webhook signature.
- Shared helpers live in `src/lib/security/route-security.ts`.
- Public ATS download is page-bound and server-fetched from approved page data.

## 3. Abuse and Rate Limiting

- Shared policies live in `src/lib/security/rate-limit.ts`.
- The current mandatory policies cover:
  - waitlist submission,
  - username availability checks,
  - public page view tracking,
  - public page engagement tracking,
  - public ATS download.
- Rate limits persist through the existing `events` table so serverless instances share the same window.
- Blocked attempts are logged as `security.rate_limit.blocked`.

Production auth checklist:

- Supabase email confirmation stays enabled.
- Cloudflare Turnstile is configured in app env and Supabase Auth CAPTCHA settings.
- Supabase Auth provider rate limits stay at documented defaults or stricter.
- Playwright and integration credentials stay on staging-only secrets.

## 4. Maintainability

- Reuse `requireAuthenticatedUser`, `requireAdminUser`, `assertSignedWebhook`, and `enforceRateLimit`.
- Do not hand-roll new route guards when a shared helper already exists.
- Update the route inventory whenever a route, payment path, secret usage, or public compute contract changes.
- Run a security refactor checkpoint every month or after 3-5 feature launches to collapse duplicated auth and service-role patterns.

## 5. AI Session and Release Protocol

End every AI coding session with this prompt:

`Review this entire change as a security expert and tell me what you would attack first.`

Pre-merge gate:

1. `npm run lint`
2. `npm run check:client-security`
3. `npm run typecheck`
4. `npm run test:unit`
5. `npm audit --omit=dev`
6. Route trust declaration review

Pre-launch gate:

1. Run staging smoke tests.
2. Verify protected routes reject unauthorized access.
3. Verify webhook signature handling still fails closed.
4. Spot-check rate limits on public write and public compute endpoints.
5. Confirm legal and security contact env vars are final.

Route inventory lives in [docs/route-security-inventory.md](./route-security-inventory.md).
