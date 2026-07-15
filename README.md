# MyLivingPage MVP

Next.js 15 App Router implementation for the MyLivingPage MVP.

## Stack

- Next.js 15.5 + React 18 + TypeScript + Tailwind CSS
- Supabase (`@supabase/ssr` and `@supabase/supabase-js`) for auth, DB, and storage
- Stripe for legacy subscription management and webhooks
- React PDF and Three.js for export and living theme rendering

## Quick Start

1. Copy `.env.example` to `.env.local` and fill in the required values.
2. Install dependencies with `npm install`.
3. Apply SQL migrations from `supabase/migrations`.
4. Run the app with `npm run dev`.

## Common Scripts

- `npm run dev` starts the Next.js dev server.
- `npm run build` runs the production build.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm run test` or `npm run test:unit` runs Vitest.
- `npm run test:e2e` runs Playwright.
- `npm run check:client-security` verifies client/server security boundaries.
- `npm run check:single-page-schema` verifies the one-page-per-account DB contract.

## CI

- GitHub Actions runs lint, typecheck, unit tests, client-security checks, and a production build on pushes to `main` and on pull requests.
- The integration lane runs schema, Stripe, and Playwright checks when staging secrets are configured.

## Supabase Setup

- Enable email and Google auth providers in Supabase Auth settings.
- Set production `NEXT_PUBLIC_APP_URL=https://www.mylivingpage.com`.
- Set Supabase Auth Site URL to `https://www.mylivingpage.com`.
- Allow redirect URLs for:
  - `https://www.mylivingpage.com/callback`
  - `https://mylivingpage.com/callback` (temporary defense-in-depth while canonical auth stays on `www`)
  - `http://localhost:3000/callback`
- Treat `https://www.mylivingpage.com` as the canonical production auth origin. OAuth starts from apex should still complete, but the callback should resolve on `www`.
- Enable Cloudflare Turnstile in Supabase Auth CAPTCHA settings when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set in the app env.

## Launch Configuration

- Set all required public legal env vars before launch:
  - `NEXT_PUBLIC_LEGAL_COMPANY_NAME`
  - `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL`
  - `NEXT_PUBLIC_LEGAL_MAILING_ADDRESS`
  - `NEXT_PUBLIC_DMCA_AGENT_NAME`
  - `NEXT_PUBLIC_DMCA_AGENT_EMAIL`
  - `NEXT_PUBLIC_DMCA_AGENT_ADDRESS`
  - `NEXT_PUBLIC_SECURITY_EMAIL`
- Mirror those values into any CI or staging secrets that render legal pages or run release-readiness checks.
- Keep `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the matching Supabase CAPTCHA configuration aligned so email signup hardening is active in production.
- The admin operations page now tracks Google OAuth start success, callback success, callback failures, and failure-rate context for PKCE troubleshooting.

## Stripe Setup

- In Stripe Dashboard, set live Terms of Service and Privacy Policy URLs for Checkout business details.
- Confirm customer portal cancellation is enabled for subscriptions.

## Key Routes

The authenticated `/api/resume/readiness` route runs the provider-free ATS check described in [docs/ats-readiness.md](./docs/ats-readiness.md).

- `/` landing page and waitlist
- `/signup`, `/login`, `/callback`
- `/create`, `/dashboard`, `/admin` for authenticated flows
- `/{username}` for the public living page
- `/api/generate/parse` is a temporary authenticated compatibility route that permanently refuses legacy AI parsing requests
- `/api/resume/export` for ATS-safe PDF export
