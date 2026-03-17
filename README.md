# MyLivingPage MVP

Next.js 15 App Router implementation for the MyLivingPage MVP.

## Stack

- Next.js 15.5 + React 18 + TypeScript + Tailwind CSS
- Supabase (`@supabase/ssr` and `@supabase/supabase-js`) for auth, DB, and storage
- Stripe for checkout, portal, and webhooks
- Anthropic SDK for server-side resume parsing and ATS review flows
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
  - `http://localhost:3000/callback`

## Stripe Setup

- In Stripe Dashboard, set live Terms of Service and Privacy Policy URLs for Checkout business details.
- Confirm customer portal cancellation is enabled for subscriptions.

## Key Routes

- `/` landing page and waitlist
- `/signup`, `/login`, `/callback`
- `/create`, `/dashboard`, `/admin` for authenticated flows
- `/{username}` for the public living page
- `/api/generate/parse` for SSE resume parsing
- `/api/resume/export` for ATS-safe PDF export
