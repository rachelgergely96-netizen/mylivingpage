# MyLivingPage — Comprehensive Improvement Plan

_Prepared 2026-07-18 from a full-codebase analysis (architecture/data model, API security, frontend/themes, testing/CI). ~47k lines of TS/TSX, 151 commits, Next.js 15 App Router + Supabase + Stripe (new checkout disabled; legacy portal/webhooks retained) + React-PDF + canvas themes, deployed on Vercel._

## Execution update — 2026-07-18

The immediate release pass completed Phase 1: the database boundary migrations are live,
source résumé text is no longer retained, privileged RPCs and server-owned writes are locked
to trusted server code, rate limiting is atomic and bounded, public-page state checks are
coherent, client events are allowlisted, file uploads are signature-checked, and external
errors fail closed without exposing provider details.

It also completed the highest-value CI and UX safeguards from later phases: Node 22,
production-mode browser tests with diagnostics, explicit database/design gates, static
unselected theme previews, consolidated résumé-import review, accessible form labels and
dialogs, consent-based analytics, local-draft cleanup at sign-out/deletion, and sitewide
security headers. At that release checkpoint, the larger deletion/refactor and
renderer-splitting items below remained a staged roadmap. The second pass documented below
subsequently completed the safely verifiable subset.

Release verification completed with ESLint, TypeScript, client-boundary and Signal Frame
design guards, a production build, 64 passing Vitest files (320 tests), and the public
Playwright lane (13 tests). Authenticated browser coverage remains configured but requires
staging credentials; CI now reports that skip explicitly instead of silently passing it.

## Execution update (second pass) — 2026-07-18

A follow-up pass reviewed the release-pass commit (no high-severity regressions found; two
low-severity consistency nits fixed — a malformed `/api/events` `scenario` now returns 400,
and the `/api/username` GET rate-limit failure now returns 503 like its siblings) and then
executed the remaining safely-verifiable plan items:

- **Theme renderers are lazy-loaded.** `src/themes/registry.ts` is now metadata-only; renderers
  load on demand via `src/themes/loadRenderer.ts` (`import("./renderers/<id>")`, one chunk each),
  resolved inside `ThemeCanvas`. First Load JS for the public `/[username]` page dropped from
  220 kB to 195 kB (the ~58 unused renderers no longer ship to every visitor), and each new
  theme now adds a lazy chunk instead of page weight.
- **three.js removed.** `CosmicBackground` is re-implemented in the 2D canvas API (drifting
  particle constellation, proximity links, pointer parallax), preserving the reduced-motion /
  off-screen-pause behavior and the `data-ambient` test contract. The `three` and `@types/three`
  dependencies are gone (~150 KB gzip off every homepage visit).
- **Public-page paint budget.** `ThemeCanvas` gained an optional `maxFps`; the full-viewport
  living page renders at 30fps under its blurred surfaces instead of 60.
- **Dead marketing code deleted** (~1,600 lines, verified zero importers): `LandingUnifiedShowcase`,
  `LandingSampleShowcase`, `LandingNav`, `ClickMomentDemo`, `LandingStorySystemOverlay`,
  `WaitlistForm`, the entire `marketing/demo/` directory, and the orphaned `.story-*` /
  `.landing-focus-wash` CSS.
- **Route tests added** for 7 previously-untested handlers (41 cases): account/delete,
  admin/users/[userId], profile, legal/accept, feedback, waitlist, pages/engagement.
- **Strict lint**: `no-unused-vars` is now an error and `eslint . --max-warnings=0`, so dead
  code fails CI (the tree was already clean).
- **Docs corrected** to match code: route-security inventory (3 missing routes added), security
  protocols (atomic-RPC rate limiter, full policy list, fail-closed export), legal-risk register
  and job-seeker checklist (paid checkout is 410'd / publishing is free), SEO checklist URL.
- **Repo hygiene**: untracked 4.4 MB of `.claude/*.png` screenshots and `.claude/settings.local.json`;
  gitignored those, `*.code-workspace`, and `playwright-report/`.

Second-pass verification: TypeScript clean, `eslint . --max-warnings=0` clean, **361 unit tests
passing** (up from 320), production build green. The tracked diff from the preceding commit was
net **−810 lines**, plus the removed dependency.

### Deliberately deferred (require a decision or an environment this pass cannot provide)

These plan items were **not** executed, each for a concrete reason — not for lack of time:

1. **Destructive schema migrations** (drop `page_entries`/`page_collaborators`/`access_logs` and
   collapse the `pages` `user_id`/`status` dual model). Irreversible against production data, and
   the release pass deliberately *hardened* (locked to service-role, browser-role revoked) rather
   than dropped the sharing schema — so a drop would reverse recent intentional work. The dead
   tables are already inaccessible. The `pages` column collapse also needs a synchronized code
   sweep applied atomically with the migration. Both belong in a reviewed data-migration PR.
2. **Billing/entitlement simplification.** Only partially dead: `grantUniversalFreeAccess` forces
   the *entitlement* fields free, but the cohort branches still compute product-visible billing/
   trial state (plan label, trial dates, subscription flags) that legacy and pro accounts render.
   Collapsing it changes what real subscribers see — a product decision.
3. **RLS-first data access** (move owner reads/writes off the service-role client). High value, but
   verifying that no access path breaks or leaks requires a live database; unsafe to change blind.
4. **Renderer de-duplication** (extract shared canvas helpers across 59 renderers). Behavior must
   stay pixel-identical; without visual-regression tooling a subtle math change would pass
   typecheck yet break themes silently. The bundle win was already captured by lazy-loading.
5. **Create/edit editor unification.** A large pure-DRY refactor of the two biggest client pages,
   with no component tests to verify the interactive flows against.

Each is individually scoped and ready to pick up with the right review or environment.

## Original codebase map (pre-execution audit snapshot)

_The map and phase lists below preserve the original audit baseline. Completed work remains
listed as a historical record; the execution updates above are the current status._

- **Routing groups**: `(auth)` login/signup/callback (PKCE), `(app)` create/dashboard/edit/settings, `(admin)` admin dashboards (email-gated), `[username]` public living page (force-dynamic), root marketing + legal pages, ~24 API routes under `api/*`.
- **Data flow**: create (842-line client page, local drafts) → `POST /api/pages/publish` (service-role upsert, one page per owner enforced by DB) → public render via `fetchPublicLivePage` → `ViewTracker` posts view + engagement beacons → analytics dashboards read via service-role.
- **DB**: 11 migrations; `profiles`, `pages`, `page_views`, `page_interactions`, `page_archives`, `events` (also the rate-limit store), `waitlist`, `legal_acceptances`, plus an unused sharing/collaboration trio (`page_entries`, `page_collaborators`, `access_logs`). RLS exists but is mostly bypassed because the app reads/writes through the service-role client.
- **Themes**: 59 Canvas-2D renderers (5,774 lines), all statically imported by `src/themes/registry.ts`, shipped to every visitor. Three.js is used only by the marketing `CosmicBackground`.
- **Tests**: 51 vitest files with strong lib coverage; 13 of 24 API routes untested; high-quality Playwright suite whose authenticated lane silently skips without staging secrets.

Overall verdict at audit time: **fundamentally sound architecture with disciplined patterns** (route trust-level convention, DB-backed serverless-correct rate limiter, correct Stripe webhook signature handling, careful file-parse hardening, good RSC/client split on marketing pages) — but carrying **three systemic debts**: (1) a database authorization layer with real holes because the app bypasses RLS, (2) a dead billing/entitlement system that still executes everywhere, and (3) an eager theme registry + dead marketing code inflating every visitor's bundle.

---

## Phase 1 — Security & data-integrity hardening (highest priority, ~1 day)

One new Supabase migration plus small route edits.

1. **Lock down the two exposed SECURITY DEFINER RPCs.** `increment_page_views` (`supabase/migrations/20260227200000_increment_page_views.sql`) and `increment_sign_in_count` (`20260228180000_enhance_user_data.sql:14-20`) have no `REVOKE`, so any anonymous PostgREST caller can inflate any page's view count or any user's sign-in stats (which feed bot-risk scoring). Mirror the revoke/grant pattern already used at `20260227163000_secure_pages_rls.sql:683-690`; also `SET search_path`.
2. **Close the open insert policies.** `events_insert_service_role` is `FOR INSERT TO public WITH CHECK (true)` (`20260228180000:63-64`) — despite the name, it opens client inserts into the table that backs rate limiting, admin metrics, and proof analytics (forgeable per-user, and a victim's rate-limit bucket can be exhausted). `page_archives` has the same pattern (`20260303000000:22-23`). Service role bypasses RLS, so both policies can simply be dropped.
3. **Make PDF export fail closed.** `src/app/api/resume/export/route.ts:100-108` proceeds unthrottled when the rate limiter errors — the most expensive public endpoint becomes a cost/DoS amplifier exactly when the DB is struggling. Return 503 like `resume/import` and `resume/readiness` already do.
4. **Trust the right IP.** `getClientIp` (`src/lib/security/request.ts:3-14`) uses the spoofable leftmost `X-Forwarded-For` entry; prefer `x-vercel-forwarded-for` / right-most hop so every IP-scoped limit isn't bypassable by header rotation.
5. **Namespace-allowlist `/api/events`** (`src/app/api/events/route.ts`): currently any authenticated user can write `security.*` / `billing.*` events with unbounded metadata. Restrict names to product namespaces and cap metadata size/depth.
6. **Smaller items**: atomic rate-limit accounting (insert-first, closes the TOCTOU burst window in `rate-limit.ts:160-200`); fix `pages/view`'s OR to AND (`status === "live" && visibility === "public"`); stop returning raw DB/Stripe error messages (7 routes); magic-byte sniff avatar uploads; gate `track-login` self-increment; move `ADMIN_EMAIL` (`src/lib/admin.ts:1`) to env.

## Phase 2 — Decide product truth, delete the dead systems (~2–3 days, −4,000+ lines)

The repo's biggest tax is code that no longer serves the product.

1. **Billing/entitlements: pick one truth.** `grantUniversalFreeAccess` (`src/lib/account-access.ts:55-71`) unconditionally overwrites all three cohort branches — ~110 lines of cohort math compute values that are discarded, `syncPageHostingState` can never unpublish yet runs (with an extra profile fetch) on every public view/export/profile call, and the offline-page UI in `[username]/page.tsx` is unreachable. Either delete the cohort/hosting-state/Stripe machinery (`account-access.ts`, `hosting-state.ts`, `billing.ts`, `stripeWebhook.ts`, portal route, checkout-return flow in `create/page.tsx`) or remove the override — the current state pays for complexity *and* has no gating. If billing may return: first re-apply `isThemeAllowed` + variant-limit checks in `PATCH /api/pages/[pageId]` (they exist only in `/publish`), since that's the entitlement bypass that becomes real the day tiers return.
2. **Delete dead frontend (~1,600 lines, zero importers, verified):** `LandingUnifiedShowcase`, `LandingSampleShowcase`, `LandingNav`, `ClickMomentDemo`, `LandingStorySystemOverlay`, `WaitlistForm`, the entire `src/components/marketing/demo/` directory, plus orphaned `.story-*` / `.landing-focus-wash` CSS in `globals.css`.
3. **Drop dead schema:** `page_entries`, `page_collaborators`, `access_logs`, share-token columns/RPCs and `visibility='link'` (~500 lines of migration surface, zero references in `src/`). Then delete the runtime schema-fallback in `src/lib/profile-access.ts:65-163` that string-matches Postgres errors to tolerate un-applied migrations.
4. **Fix the stale docs** (they self-describe as sources of truth): `route-security-inventory.md` is missing `auth/google`, `pages/[pageId]/proof`, `resume/import`; `legal-risk-register.md` claims paid checkout is live (it 410s); `job-seeker-rollout-smoke-checklist.md` describes a checkout flow the e2e suite asserts doesn't exist; `security-protocols.md` omits two live rate-limit policies; `seo-geo-launch-checklist.md` has a redirected URL.

## Phase 3 — Architecture consolidation (~1 week, staged)

1. **Move owner-scoped data access onto the RLS-enforced SSR client.** Today nearly every read/write uses the service-role client with hand-rolled `.or(user_id.eq.X,owner_id.eq.X)` filters — one forgotten filter is a cross-tenant leak, and the carefully built RLS protects almost nothing. Reserve service role for webhooks, admin, and anonymous analytics writes.
2. **Collapse the dual publication model on `pages`.** `user_id`/`owner_id` and `status`/`visibility` coexist; `isPubliclyAvailablePage` logic is duplicated in 4+ places with no CHECK constraints. A finishing migration (backfill, drop one column of each pair, add CHECKs) removes a whole class of "which field wins?" bugs.
3. **Unify create/edit.** `create/page.tsx` (842 lines) re-implements draft/save/preview/access logic from `PageEditorClient.tsx` (426). Extract a shared `useResumeEditor` hook; split `ResumeEditorFields.tsx` (812 lines) into memoized per-section components so a keystroke re-renders one fieldset instead of the whole document + live ThemeCanvas preview; replace the per-keystroke `JSON.stringify` dirty-check.
4. **Single source of truth for reserved usernames.** `RESERVED_SLUGS` omits `examples`, `guides`, `homepage-preview` (users can claim unreachable usernames), and neither the DB's `generate_unique_username` nor `ensureUserProfile` consults the list at all.
5. **Profile provisioning in one place.** Creation logic exists in a DB trigger, `ensureUserProfile` (racy check-then-upsert, runs 2+ service-role queries on *every* `(app)` navigation via the layout), and the publish route. Trust the trigger; run `ensureUserProfile` only in the auth callback.
6. **Public page render efficiency**: `fetchPublicLivePage` runs in both `generateMetadata` and the page body plus a third profile fetch (5–7 queries per anonymous view) and `syncPageHostingState` can write during a GET render. Wrap in `React.cache`, move reconciliation out of render.
7. **Rate limiting off the analytics table**: dedicated table with `(identifier_hash, policy, created_at)` index and pruning (the current JSONB-contains count has no supporting index and the table grows unboundedly), or Upstash/Vercel KV. Also add the missing `page_views(page_id, viewed_at)` composite index.

## Phase 4 — Frontend performance (~2–3 days)

1. **Lazy-load theme renderers.** `registry.ts` statically imports all 59 renderers, so every public `/[username]` visitor ships ~58 unused renderers (~35–50KB gzip, growing per theme). Split metadata from render code; `ThemeCanvas` resolves `import("./renderers/" + id)` in an effect, painting the theme's background color as the first frame.
2. **Replace three.js `CosmicBackground` with Canvas-2D.** ~150KB gzip on every homepage visit for a decorative starfield; the repo already has a 2D `cosmic` renderer in the same aesthetic. Removes the `three` dependency entirely.
3. **ThemePicker: static previews, animate on hover** — it currently mounts up to 59 live canvases (IO-paused, but 6–9 visible ones each run their own rAF loop).
4. **Public-page paint budget**: full-viewport 60fps canvas at 2× DPR beneath `backdrop-filter: blur(14–18px)` surfaces is the main mobile battery/jank risk — cap at ~30fps or pause while scrolled; consider smaller blur radii.
5. **Deduplicate renderer idioms** (~1,200–1,700 lines / 20–30%): extract `starField()`, `backgroundGradient()`, `vignette()`, `pointerGlow()`, seeded random, shared `TAU` into `src/themes/shared/` — new themes drop from ~120 to ~30–60 lines.
6. Reserve height for the homepage's `ssr:false` `SignalFrameRichOutput` placeholder; consolidate on `SiteHeader` as the single nav.

## Phase 5 — Testing, CI, and hygiene (ongoing)

1. **Test the destructive/privileged untested routes first**: `account/delete`, `admin/users/[userId]`, `webhooks/stripe` route glue, `username` PATCH, `avatar` — then the remaining nine untested routes (13 of 24 have no tests; `pages/publish/route.test.ts` is the mocking pattern to copy). Also untested: `middleware.ts`, `deleteUserAccount.ts`, `ensureUserProfile.ts`.
2. **Make the integration lane's skip state visible.** Missing staging secrets currently produce a green check with zero e2e/schema coverage; the readiness gate still demands Stripe secrets for a flow that 410s. Fail or warn on main when skipped; drop the stale secret requirements.
3. **CI correctness**: run Playwright against `next build && next start` (not the dev server); set `retries ≥ 1` so `trace: on-first-retry` can ever fire; upload traces on failure; wire in `check:signal-frame` and `check:analytics-schema`; add `concurrency` + `timeout-minutes`; bump Node 20 (EOL) → 22.
4. **Lint that can fail**: ESLint 8 is EOL; migrate to flat config, restore `no-unused-vars` to error (with a `routeTrustLevel` ignore pattern), add `--max-warnings=0`.
5. **Dependency ladder** (in order): React 19 → Next 16 → ESLint flat config → Tailwind 4 → Vitest 4 → Stripe SDK (re-pin API version) → rest. Add `engines` to package.json.
6. **Repo hygiene**: `git rm --cached` the ~4.4MB of `.claude/*.png` screenshots and `.claude/settings.local.json`; gitignore them plus `*.code-workspace`; remove `rejectUnauthorized: false` from both schema-check scripts (TLS verification disabled against the production DB); reconsider committing 2.5MB of `docs/previews/` PNGs.

---

## Suggested sequencing

| Order | Work | Effort | Payoff |
|---|---|---|---|
| 1 | Phase 1 security migration + route fixes | ~1 day | Closes real anonymous-writable holes |
| 2 | Phase 2 dead-code purge + doc truth | ~2–3 days | −4,000+ lines, every future change gets cheaper |
| 3 | Phase 4.1–4.2 (lazy renderers, drop three.js) | ~1 day | Biggest user-facing perf win |
| 4 | Phase 5.1–5.4 (route tests, CI visibility, lint) | ~2–3 days | Safety net before refactors |
| 5 | Phase 3 (RLS-first access, schema consolidation, editor unification) | ~1 week, staged | Structural debt paydown |
| 6 | Phase 5.5 dependency ladder | ongoing | Stay off EOL software |

Quick wins if only an afternoon is available: the Phase 1 migration (items 1–3), deleting the dead marketing directory, and `git rm --cached` on the committed local settings/screenshots.
