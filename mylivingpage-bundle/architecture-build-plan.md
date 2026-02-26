# MyLivingPage — Product Architecture & Build Plan

## Executive Summary

MyLivingPage transforms static resumes into living, breathing digital identities hosted at `mylivingpage.com/{username}`. Users upload a resume, pick a living theme, and our AI pipeline generates an interactive page with algorithmic art backgrounds, animated data visualizations, and a shareable URL.

**Stack:** Next.js 14 (App Router) + Supabase (Auth, DB, Storage) + Vercel (Hosting) + Anthropic API (Resume Processing)

**Target MVP:** 4-week sprint to a launchable product with waitlist conversion.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     VERCEL (Edge)                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Next.js 14 App Router                 │  │
│  │                                                    │  │
│  │  /                    → Landing page (marketing)   │  │
│  │  /signup              → Auth flow                  │  │
│  │  /create              → Resume upload + generation │  │
│  │  /dashboard           → Manage your pages          │  │
│  │  /[username]          → PUBLIC living page (SSR)   │  │
│  │  /api/generate        → AI pipeline endpoint       │  │
│  │  /api/webhooks/stripe → Payment processing         │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────┬──────────────┬──────────────┬────────────┘
               │              │              │
    ┌──────────▼──────┐  ┌───▼────┐  ┌──────▼──────┐
    │    SUPABASE      │  │ANTHROPIC│  │   STRIPE    │
    │                  │  │  API    │  │             │
    │  Auth (email,    │  │         │  │ Subscriptions│
    │    Google, LI)   │  │ Resume  │  │ Spark/Glow/ │
    │  PostgreSQL DB   │  │ parsing │  │ Radiance    │
    │  Storage (files) │  │ Theme   │  │             │
    │  Realtime        │  │ matching│  │             │
    └─────────────────┘  └─────────┘  └─────────────┘
```

---

## Database Schema (Supabase PostgreSQL)

```sql
-- Users (extends Supabase auth.users)
create table public.profiles (
  id            uuid primary key references auth.users(id),
  username      text unique not null,      -- mylivingpage.com/{username}
  full_name     text,
  email         text,
  avatar_url    text,                      -- Supabase storage path
  plan          text default 'spark',      -- spark | glow | radiance
  stripe_customer_id  text,
  custom_domain text,                      -- glow+ feature
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Living Pages
create table public.pages (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  slug          text not null,             -- URL slug (usually = username)
  status        text default 'draft',      -- draft | live | archived
  theme_id      text not null,             -- cosmic | fluid | ember | etc.
  resume_data   jsonb not null,            -- structured resume (AI output)
  raw_resume    text,                      -- original uploaded text
  portfolio_url text,
  page_config   jsonb default '{}',        -- theme overrides, custom colors
  views         integer default 0,
  published_at  timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, slug)
);

-- Page Analytics (glow+ feature)
create table public.page_views (
  id            uuid primary key default gen_random_uuid(),
  page_id       uuid references public.pages(id) on delete cascade,
  viewer_ip     text,                      -- hashed for privacy
  referrer      text,
  user_agent    text,
  country       text,
  viewed_at     timestamptz default now()
);

-- Waitlist (pre-launch)
create table public.waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  referral_code text,
  created_at    timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.pages enable row level security;
alter table public.page_views enable row level security;

-- Users can read/update their own profile
create policy "Users read own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users update own profile"
  on profiles for update using (auth.uid() = id);

-- Users manage own pages; everyone can read published pages
create policy "Users manage own pages"
  on pages for all using (auth.uid() = user_id);
create policy "Public reads live pages"
  on pages for select using (status = 'live');
```

---

## AI Resume Pipeline

The generation flow uses the Anthropic API (Claude Sonnet) in a 3-step pipeline, mirroring the A2 workflow:

### Step 1: Extract & Structure (`/api/generate/parse`)
```
Input:  Raw resume text (from PDF/DOCX extraction or paste)
Output: Structured JSON
```
```json
{
  "name": "Ray",
  "headline": "Attorney & Tech Founder",
  "location": "New York, NY",
  "contact": { "email": "...", "linkedin": "...", "website": "..." },
  "summary": "...",
  "experience": [
    {
      "title": "Founder & CEO",
      "company": "BarPrepPlay",
      "dates": "2024 - Present",
      "highlights": ["275+ active users", "Gamified bar exam prep"]
    }
  ],
  "education": [...],
  "skills": ["Legal Tech", "SaaS", "UI/UX", ...],
  "certifications": ["NY Bar", "FL Bar (pending)"]
}
```

### Step 2: Theme Analysis (`/api/generate/theme`)
```
Input:  Structured resume JSON + user's theme choice
Output: Theme configuration with AI-enhanced color/layout recommendations
```
```json
{
  "theme_id": "cosmic",
  "rationale": "Tech founder with creative edge...",
  "config": {
    "particle_density": 1800,
    "primary_hue": 42,
    "accent_hue": 262,
    "animation_speed": 0.8,
    "layout_variant": "hero-left"
  }
}
```

### Step 3: Page Assembly (Client-Side Rendering)
The living page is **not** generated as static HTML — it's a Next.js dynamic route (`/[username]`) that:
1. Fetches `resume_data` + `theme_id` + `page_config` from Supabase
2. Renders the appropriate living theme component with the data
3. Hydrates Canvas/Three.js animations client-side
4. SSR provides SEO-friendly meta tags + OG images

---

## Living Theme Engine

Each theme is a React component that receives resume data as props and renders both the content layout and the algorithmic art background.

```
/src/themes/
├── ThemeRegistry.ts        # Theme metadata, previews, configs
├── CosmicTheme.tsx         # Three.js particles + constellations
├── FluidTheme.tsx          # Canvas flow fields + gradients
├── EmberTheme.tsx          # Canvas particle embers + warmth
├── MonolithTheme.tsx       # Three.js wireframe geometry
├── AuroraTheme.tsx         # Canvas aurora curtains + shimmer
├── TerracottaTheme.tsx     # Canvas organic noise + earth tones
└── shared/
    ├── ResumeLayout.tsx    # Shared content layout components
    ├── ParticleEngine.ts   # Shared particle system utilities
    ├── NoiseField.ts       # Perlin noise for organic motion
    └── InteractionLayer.ts # Mouse/touch reactivity system
```

### Theme Component Contract
```typescript
interface LivingThemeProps {
  resumeData: ResumeData;      // Structured resume JSON
  themeConfig: ThemeConfig;     // AI-generated config overrides
  avatarUrl?: string;
  portfolioUrl?: string;
  isPreview?: boolean;          // Reduced animations for editor
}

// Every theme exports:
export default function CosmicTheme(props: LivingThemeProps) {
  // 1. Render Canvas/Three.js background
  // 2. Render resume content overlay
  // 3. Handle mouse/touch interactivity
  // 4. Handle responsive layout
}
```

---

## File Structure

```
mylivingpage/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout + fonts
│   │   ├── page.tsx                   # Landing page (marketing)
│   │   ├── (auth)/
│   │   │   ├── signup/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── callback/route.ts      # OAuth callback
│   │   ├── (app)/
│   │   │   ├── layout.tsx             # Authenticated layout
│   │   │   ├── create/
│   │   │   │   ├── page.tsx           # Multi-step creation flow
│   │   │   │   └── components/
│   │   │   │       ├── UploadStep.tsx
│   │   │   │       ├── PhotoStep.tsx
│   │   │   │       ├── PortfolioStep.tsx
│   │   │   │       ├── ThemeStep.tsx
│   │   │   │       └── ProcessingStep.tsx
│   │   │   ├── dashboard/page.tsx     # Manage pages
│   │   │   └── edit/[id]/page.tsx     # Edit existing page
│   │   ├── [username]/
│   │   │   ├── page.tsx               # PUBLIC living page (SSR)
│   │   │   └── opengraph-image.tsx    # Dynamic OG image
│   │   └── api/
│   │       ├── generate/
│   │       │   ├── parse/route.ts     # Resume → structured JSON
│   │       │   └── theme/route.ts     # Theme analysis
│   │       ├── upload/route.ts        # File upload handler
│   │       ├── waitlist/route.ts      # Email capture
│   │       └── webhooks/
│   │           └── stripe/route.ts
│   ├── themes/                        # Living theme components
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client
│   │   │   ├── server.ts             # Server client
│   │   │   └── middleware.ts          # Auth middleware
│   │   ├── anthropic.ts              # Claude API wrapper
│   │   ├── resume-parser.ts          # PDF/DOCX text extraction
│   │   └── stripe.ts                 # Stripe config
│   ├── components/
│   │   ├── ui/                        # Shared UI components
│   │   └── marketing/                 # Landing page components
│   └── styles/
│       └── globals.css
├── supabase/
│   └── migrations/                    # SQL migrations
├── public/
├── next.config.js
├── tailwind.config.ts
├── package.json
└── .env.local
```

---

## Build Plan — 4-Week MVP Sprint

### Week 1: Foundation
| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Project scaffolding: Next.js 14, Supabase init, Vercel deploy, env vars | Empty app deploys to mylivingpage.com |
| 2 | Supabase schema: run migrations, set up RLS, configure Auth (email + Google) | Working signup/login |
| 3 | Landing page: port the existing HTML landing page into Next.js + wire waitlist endpoint | Production landing page live |
| 4 | File upload: Supabase Storage for resume files + PDF text extraction (pdf-parse) | Upload → text extraction working |
| 5 | AI pipeline Step 1: `/api/generate/parse` — Claude structures resume text | Resume → JSON working |

### Week 2: Generation Flow
| Day | Task | Deliverable |
|-----|------|-------------|
| 6 | Multi-step creation flow UI (port the React prototype into actual pages) | /create flow navigable |
| 7 | Photo upload step + Supabase Storage integration | Avatar upload working |
| 8 | Theme picker UI with live preview swatches | Theme selection functional |
| 9 | AI pipeline Step 2: theme analysis + page_config generation | Full pipeline end-to-end |
| 10 | Processing screen with real progress (SSE from API) + save to DB | Upload → live page in DB |

### Week 3: Living Themes
| Day | Task | Deliverable |
|-----|------|-------------|
| 11 | Cosmic theme: Three.js particles + constellation + resume layout | First working living page |
| 12 | Fluid theme: Canvas flow field + gradient shifts | 2 themes complete |
| 13 | Monolith theme: wireframe geometry + minimal layout | 3 themes complete |
| 14 | `[username]` dynamic route: SSR + client hydration + SEO meta | Public URLs working |
| 15 | OG image generation (dynamic social sharing cards) | Shareable links look great |

### Week 4: Polish & Launch
| Day | Task | Deliverable |
|-----|------|-------------|
| 16 | Dashboard: list pages, view stats, edit/archive | User management working |
| 17 | ATS PDF export: generate clean resume PDF from structured data | Download PDF working |
| 18 | Stripe integration: Spark (free) / Glow ($9) / Radiance ($29) | Payments working |
| 19 | Analytics: page view tracking, referrer logging (glow+) | Basic analytics |
| 20 | QA, mobile testing, performance optimization, soft launch | MVP LIVE |

---

## Key Technical Decisions

### Why SSR for Living Pages (not Static Generation)
Living pages need to be immediately available after creation (no rebuild delay) and support real-time view counting. SSR with aggressive caching (ISR with `revalidate: 60`) gives us both freshness and performance.

### Why Client-Side Theme Rendering (not Pre-generated HTML)
The "living" animations (Canvas, Three.js) must run client-side. Pre-generating static HTML would lose the entire value prop. Instead, we SSR the content skeleton for SEO, then hydrate the theme engine client-side.

### Why Anthropic API (not the A2 Pipeline)
Direct API calls give us: streaming for real-time progress UI, structured output control, lower latency, and no dependency on A2 infrastructure. The A2 workflow logic maps cleanly to two API calls.

### Resume File Processing
Use `pdf-parse` (npm) for PDF text extraction and `mammoth` for DOCX. Both run server-side in Next.js API routes. No need for external services.

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App
NEXT_PUBLIC_APP_URL=https://mylivingpage.com
```

---

## Post-MVP Roadmap

**Phase 2 (Weeks 5-8):**
- 3 more themes (Ember, Aurora, Terracotta)
- Custom domain support (Vercel domains API)
- Page editor (modify content without re-uploading)
- LinkedIn import (OAuth + profile scraping)

**Phase 3 (Weeks 9-12):**
- NFC card integration (NFC tag → page URL)
- Team pages (companies can host employee pages)
- White-label option (Radiance tier)
- API for programmatic page creation

**Phase 4 (Expansion):**
- Merge with LiveCardStudio — shared "living document" engine
- Portfolio mode (not just resumes)
- Connection requests between users
- Recommendation endorsements (like LinkedIn, but beautiful)
