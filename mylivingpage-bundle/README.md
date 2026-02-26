# MyLivingPage — Complete Build Files

All code artifacts created for mylivingpage.com.

## Files

| File | Type | Description |
|------|------|-------------|
| `landing-page.html` | HTML | Production landing page with Three.js cosmic background, scroll reveals, pricing, waitlist CTA |
| `user-flow-prototype.jsx` | React | Full 7-step user journey prototype (signup → upload → photo → portfolio → theme → processing → live page) |
| `theme-picker-flow.jsx` | React | Working theme picker + generation flow with 6 live Canvas theme previews and processing animation |
| `theme-gallery-10.jsx` | React | Full theme engine gallery with 10 production-quality Canvas renderers (Cosmic, Fluid, Ember, Monolith, Aurora, Terracotta, Prism, Biolume, Circuit, Sakura) |
| `ai-resume-parser.jsx` | React | Working AI resume parser — paste text → Claude API parses to JSON → renders on living theme with interactive Canvas background |
| `architecture-build-plan.md` | Markdown | Complete product architecture: DB schema, file structure, AI pipeline, tech stack, 4-week MVP sprint plan |

## Tech Stack (Target MVP)

- **Frontend:** Next.js 14 (App Router)
- **Auth + DB + Storage:** Supabase
- **Hosting:** Vercel
- **AI Pipeline:** Anthropic API (Claude Sonnet)
- **Payments:** Stripe
- **Themes:** Custom Canvas 2D / Three.js renderers

## How to Use

### HTML file
Open `landing-page.html` directly in a browser.

### React (.jsx) files
These are React artifact components designed to run in Claude's artifact environment. To use in a real project:
1. Copy into a Next.js or Vite React project
2. Install dependencies: `npm install react`
3. Import fonts (Playfair Display, DM Sans, DM Mono) from Google Fonts
4. The AI parser requires access to `api.anthropic.com` — in production, proxy through your own API route

## Next Steps

1. Scaffold Next.js project + deploy to Vercel
2. Wire Supabase auth (email + Google)
3. Move AI parser to `/api/generate/parse` server route
4. Persist parsed data + theme choice to Supabase
5. Build `[username]` dynamic route for public living pages
6. Add Stripe for Spark/Glow/Radiance tiers
