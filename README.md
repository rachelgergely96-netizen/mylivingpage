# MyLivingPage MVP

Next.js 14 App Router implementation for the MyLivingPage MVP.

## Stack

- Next.js 14 + TypeScript + Tailwind CSS
- Supabase (`@supabase/ssr`) for auth, DB, and storage
- Anthropic SDK for server-side resume parsing
- Canvas/Three.js living theme rendering

## Quick Start

1. Copy `.env.example` to `.env.local` and fill values.
2. Install dependencies:
   - `npm install`
3. Run dev server:
   - `npm run dev`

## Supabase

- Apply SQL migrations from `supabase/migrations`.
- Enable email + Google auth providers in Supabase Auth settings.
- Set callback URL to:
  - `http://localhost:3000/callback` (dev)

## Key Routes

- `/` landing page + waitlist
- `/signup`, `/login`, `/callback`
- `/create`, `/dashboard` (protected)
- `/{username}` public living page
- `/api/generate/parse` SSE AI parsing endpoint
