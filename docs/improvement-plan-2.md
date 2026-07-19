# MyLivingPage — Improvement Plan 2

_Prepared 2026-07-19 from a full-codebase audit: 8 parallel analysis dimensions (security, architecture, performance, testing/CI, frontend/a11y/SEO, dependencies/config, product-truth, themes), every finding adversarially verified against current code, plus an independent completeness review. 66 findings confirmed, 2 refuted. Succeeds `docs/improvement-plan.md` (2026-07-18), whose execution this audit regression-checked._

## What the audit verified as done and holding

Every claim in the 2026-07-18 execution updates was re-verified in current code — none regressed:

- All Phase 1 security items hold: privileged-RPC lockdown, closed insert policies, fail-closed PDF export, Vercel-first client-IP trust, events allowlist, avatar magic-byte sniffing, atomic advisory-locked rate limiting.
- Lazy theme renderers are real (metadata-only `registry.ts`, one chunk per theme, zero static renderer imports in the build), three.js is gone, ThemePicker previews are static.
- The docs the pass claimed to fix are now accurate (route-security inventory matches all 24 API routes; security-protocols matches the 9 live rate-limit policies), the announced dead-code deletions happened, and a full zero-importer scan found no orphaned files.
- The TLS concern in the schema-check scripts is fixed (`rejectUnauthorized: true`).
- Post-audit commits (Signal Frame, theme hardening, admin deletion, sharp corners) introduced no security holes.

The debt that remains is real but different in kind: silent-failure blind spots, per-request waste, the deliberately-deferred refactors (now with concrete unblocking steps), and compliance/abuse surfaces no prior dimension owned.

---

## Review revisions and delivery rules

The audit findings remain the backlog, but they are not one atomic implementation. Ship independently reversible batches and require a green quality gate after each phase. Database migrations are additive before destructive cleanup; auth changes must support both password and federated identities; production integrations must never commit secrets.

| Change class | Landable in code | External completion gate |
|---|---|---|
| Runtime error capture | Structured Next.js instrumentation, global boundary, sanitized intake | Configure a Vercel alert/log drain; optionally connect Sentry with a project-managed DSN |
| Account reauthentication | Current-password verification for email identities; recent-login enforcement for federated identities | Verify provider re-login UX in staging; enroll the admin in MFA before enforcing AAL2 |
| Static legal/marketing routes | Build-time legal-site selection | Set `NEXT_PUBLIC_LEGAL_SITE` independently on every deployment |
| Retention, RLS, storage, indexes | Additive migrations | Apply to a Supabase preview branch, run schema checks, then promote |
| Stripe customer erasure | Tested code path | Confirm legal/finance retention policy and exercise in Stripe test mode |
| Browser and visual baselines | Test harness | Install browsers in CI and review committed baselines |
| Dependency major upgrades | Separate commits | Green build, route tests, and browser suite at each rung |

### Implementation status (2026-07-19)

- Implemented locally: provider-neutral production error capture, global error UI, client-error rate limiting, account-delete/password-change reauthentication and rate limits, fixed provider error messages, recovery-event-only reset verification, renderer fallback after three consecutive errors, build-time legal-site selection, server-derived public-page viewer state, per-request public-page caching, legacy visibility leak closure, and analytics indexes.
- External configuration remains: Vercel alert/log drain, `NEXT_PUBLIC_LEGAL_SITE`, Supabase migration promotion, and admin MFA enrollment.
- Deliver remaining phases as subsequent verified batches; do not combine destructive schema cleanup, dependency majors, and auth changes in one release.

---

## Phase 1 — Observability and account-security (highest priority, ~2 days)

**1.1 Add production error tracking — the highest-leverage single fix in this audit.**
There is no Sentry/log-drain/instrumentation anywhere: no `src/instrumentation.ts`, no `global-error.tsx`, no reporting SDK. The only error sink is 18 `console.error` sites, and the client error boundary logs into the visitor's own browser console (`src/app/error.tsx:13-15`). `track-event.ts:15-19` returns false into the void; `ViewTracker.tsx:304-306` swallows; renderers swallow (1.4). With a single maintainer, production breakage is discovered only when a user complains. Land a provider-neutral baseline first: Next.js request/process instrumentation, a reporting `global-error.tsx`, a sanitized rate-limited client-error intake, structured Vercel Runtime Logs, and an alert on function error rate. Sentry is optional after the project owner configures it; no DSN or token belongs in source. Roughly half the "silent failure" findings below are symptoms of this one gap.

**1.2 Require reauthentication for the three destructive account routes.**
- `POST /api/account/delete` (`route.ts:11-22`) takes no body, no password confirmation, no rate limit, then runs the irreversible `auth.admin.deleteUser` cascade. Anyone briefly controlling a logged-in browser destroys the account in one request.
- `POST /api/account/change-password` (`route.ts:8-27`) same weakness, plus it returns the raw Supabase `error.message` (line 22).
- `reset-password/page.tsx:40-44` treats *any* existing session as recovery-verified — a third no-reauth password change.
Fix all three together: email/password identities verify the current password with `signInWithPassword`; federated identities require a recent provider sign-in and receive a clear re-login instruction when stale. Add user-scoped rate-limit policies (`account_delete` ~3/hour, `password_change` ~5/hour) via the existing `enforceRateLimit`, map provider errors to fixed strings, and accept password reset only after a `PASSWORD_RECOVERY` event—not merely any existing session.

**1.3 Rate-limit the authenticated write surface.**
`/api/feedback` (unbounded ~2KB event rows into the table that backs rate limiting), `/api/avatar` (unlimited 2MB uploads, 4 storage/DB ops each), `/api/username` PATCH, `/api/pages/publish`, PATCH `/api/pages/[pageId]` (each PATCH also writes `page_archives`) all run uncapped (`rate-limit.ts:15-70` has no policies for them). Add user-scoped policies mirroring `resume/import`'s pattern.

**1.4 Stop swallowing renderer exceptions silently.**
`ThemeCanvas.renderFrame` wraps the renderer in an empty catch (`ThemeCanvas.tsx:173-185`); a deterministically-throwing renderer throws 30-60×/sec forever with `data-theme-renderer-status` still "ready". Track consecutive failures in a ref; after 3, stop the loop, set status `fallback`, `console.error` once — mirroring the already-hardened chunk-load path (`:331-334`).

**1.5 Admin step-up.** All admin gates reduce to one email string comparison (`admin.ts:10-12`, `route-security.ts:86`, `middleware.ts:27`) guarding irreversible user deletion. Enroll the admin account in Supabase MFA and have `requireAdminUser` reject sessions below AAL2. (Audit events for deletion already exist — `deleteUserAccount.ts:117-118`.)

**1.6 CSP: drop `'unsafe-inline'` script-src** (`next.config.mjs:11`) via middleware-emitted per-request nonce + `strict-dynamic` — but note this conflicts with Phase 2.1's static prerendering, so scope the nonce path to dynamic routes or accept `unsafe-inline` on static marketing pages deliberately. Gate the `ws: wss:` connect-src (line 15, dev-HMR residue) behind the existing `!isProduction` check.

## Phase 2 — Public-page performance and per-view cost (~2-3 days)

An anonymous page view currently costs ~15 DB round-trips: ~9 in `/api/pages/view` (`view/route.ts:52-188`) plus 5-7 on the render path. The fixes compound:

**2.1 Make the marketing/SEO funnel static (HIGH).**
`getRequestLegalSite()` calls `headers()` (`src/lib/legal/request-site.ts:5`) to pick one of two build-known legal configs, dragging the homepage, `/pricing`, `/examples`, `/guides`, `/guides/[slug]` (whose `generateStaticParams` it defeats), and all nine legal pages into per-request serverless rendering — the prerender manifest shows only 5 static routes. If each domain is its own Vercel deployment, read a `NEXT_PUBLIC_LEGAL_SITE` env var instead (site-config already reads build-time `NEXT_PUBLIC_*` vars); if one deployment serves both hosts, resolve the host in middleware via rewrite to per-site route groups. Every acquisition page becomes CDN-served HTML.

**2.2 Remove the 53 kB gz Supabase client from the public page (HIGH).**
28% of `/[username]`'s 190 kB First Load JS is `@supabase/ssr`+`supabase-js`, pulled in by three components that only derive "is the viewer signed in / the owner": `PageOwnerBar.tsx:26-28`, `MadeWithBadge.tsx:16-22`, `ShareCardDownload.tsx:71-73`. The page is already force-dynamic — resolve viewer state server-side once and pass booleans down. Add a CI bundle budget for this route after.

**2.3 Halve render-path queries.** Wrap `fetchPublicLivePage` in `React.cache` keyed by username (it runs fully in both `generateMetadata` and the body — `[username]/page.tsx:96,137`) and return the profile row from it so the third profile fetch (`:182-192`) is deleted. Combined with Phase 3's sync removal, an anonymous view drops to ~2 render-path queries.

**2.4 Index and bound analytics reads.**
- Additive migration: `page_views (page_id, viewer_ip, viewed_at desc)` for the per-view dedupe lookup (`view/route.ts:122-127`) and `(page_id, viewed_at)` for dashboard range scans — only the single-column MVP index exists today.
- Bound the dashboard's unbounded all-history fetch (`dashboard/page.tsx:176-190`) with a `.gte(viewed_at)` cutoff + defensive `.limit()`; same pattern in `pages/[pageId]/proof/route.ts:51-63`. All-time totals already come from the counter column.

**2.5 Events-table retention (one fix for a triple-reported problem).**
Every allowed request on a rate-limited route inserts a `security.rate_limit.request` row; nothing ever prunes the table that is simultaneously rate-limit ledger, product analytics, and admin metrics. Add pg_cron (or a Vercel cron route): daily delete of `security.rate_limit.*` rows older than 7 days (safely past the 604800000 ms max window), a chosen retention for product events (e.g. 180 days), an index on `events(created_at desc)` for the admin feed (`admin/page.tsx:69`), and assert the job's existence in `check-database-security.mjs`.

**2.6 Small wins.** Memoize the two Google-Font fetches in `[username]/opengraph-image.tsx:35-43` at module scope (or bundle the TTFs — removes an external failure mode from link previews). Flip `ThemeCanvas`'s `maxFps` default to 30 (only 1 of 7 mount sites passes it today; the editors and homepage hero run 60fps under `backdrop-filter` blur — `ThemeCanvas.tsx:203`). Move `ensureUserProfile` out of the `(app)` layout (`layout.tsx:21-22`) into the auth callback only.

## Phase 3 — Billing dead-code excision, minimal safe slice (~1-2 days, −1,000+ lines)

`grantUniversalFreeAccess` (`account-access.ts:55-71`) forces entitlements free on all three cohort return paths (`:117,158,200`), so the following is *provably* dead and deletable **without the deferred product decision** (legacy-subscriber display fields — plan label, trial dates, portal button — are untouched):

1. **`syncPageHostingState` + feeder profile fetches at all call sites** — its write branch (`hosting-state.ts:46-52`) is unreachable; `pages/view`, `resume/export`, `fetchPublicLivePage` ×2, dashboard, and profile GET each pay a wasted query feeding it.
2. **The offline-page UI chain** — `fetchOfflinePageContext` always returns null (`[username]/page.tsx:63-65`), making the "page is being updated" screen (`:152-170`), the sole `page.offline_view_attempted` writer, and the dashboard offline-view banner (`dashboard/page.tsx:277-285`) unreachable features that look shipped.
3. **Dead client checkout-return flows** — the ~60-line `upgraded=true` poll (`settings/page.tsx:132-194`) and the `checkout=success&source=publish` draft-restore (`create/page.tsx:133-137,303-328`); checkout has 410'd since the release pass and nothing mints either param. Also the always-no-op theme-clamp effect (`create/page.tsx:279-286`).
4. **Stop stamping new publishers into the dead `PUBLISH_CC_TRIAL` cohort** (`publish/route.ts:207-216`) — every day grows the dataset the eventual migration must handle. Caveat found in verification: `dashboard/page.tsx:261` gates a callout on `!isLegacyAccount`, so write the legacy cohort or adjust that check rather than dropping the write naively.
5. **Delete the `profile-access.ts` schema-fallback** (`:65-163`) — 163 lines string-matching Postgres errors to tolerate migrations that have been applied for months; a transient error mentioning a hosting column silently nulls billing fields today.
6. **Tombstone `/api/waitlist`** (zero UI callers since the WaitlistForm purge; mirror the checkout 410), fix README line 71 ("landing page and waitlist"), update the route inventory.
7. **Delete the 13 stranded `marketing-samples.ts` exports** (~230 lines; `LANDING_FAQS` is kept alive only by its own test, which asserts copy no user sees). Note: `getMarketingSamples` is used internally by `getMarketingSampleGroups` — un-export, don't delete. Consider adding `knip`/`ts-prune` to CI, since unused *exports* are invisible to the strict-lint gate.

**Staging for the full cohort collapse** (still a product decision): first land a characterization test asserting `getAccountAccessState` returns constant entitlement fields across the cohort×plan×trial matrix (8 cases already exist in `account-access.test.ts`), then split a slim `getBillingDisplay(profile)` from the constant entitlements.

## Phase 4 — Testing and CI (~3-4 days, unblocks the deferred refactors)

**4.1 Give main real browser/schema coverage (HIGH).**
Today the integration and database-schema jobs skip-with-warning when staging secrets are missing (they are missing — `ci.yml:86-88,155-191`), so main goes green on unit+static coverage alone; the 13 credential-free public Playwright tests and the new 758-line homepage's only automated coverage never run. Split an unconditional `e2e-public` job (landing/marketing-funnel/seo-foundation specs against the placeholder env the quality job already builds with), and make the readiness gates **fail on main** (or add a nightly staging run) instead of warning forever.

**4.2 Test the three named destructive/critical modules** (still open from the last plan):
- `deleteUserAccount.test.ts` — assert call ordering (Stripe failure → 409 and *no* `deleteUser`; storage failure → 500 and no `deleteUser`); the route test mocks the whole module, so a reordering that deletes auth before Stripe cancellation passes CI today.
- `middleware.test.ts` — login redirect with `next` param, admin-email gate, pass-through.
- `ensureUserProfile.test.ts` — username-suffix loop, self-conflict, provider inference.

**4.3 Close the route-test gaps.** Four routes have zero tests: `username` (GET's rate-limit-503 behavior shipped untested; PATCH renames the public URL with an untested 409/mirror path), `account/change-password`, `stripe/portal`, `webhooks/stripe` glue. And `pages/[pageId]`'s PATCH tests never exercise authz denial — the mock ignores all arguments and always returns the page (`route.test.ts:47-60`), so dropping the ownership filter would pass; make the mock argument-sensitive and add 401/non-owner/invalid-theme cases.

**4.4 Add a DOM test environment.** All six `.test.tsx` files are `renderToStaticMarkup` string assertions in a node environment. Add `jsdom` + `@testing-library/react` + `user-event` with `environmentMatchGlobs` scoping jsdom to `.test.tsx`. First targets: create-page draft persistence, `PageEditorClient` dirty-check/save, `PublicPageActionDock` error stacking. **This is the stated blocker for the deferred editor unification.**

**4.5 Build the theme visual-regression harness.** The deferred renderer dedup stalls on "a subtle math change would pass typecheck yet break themes silently." Concretely unblock it:
1. Determinism PR: seed `shared/noise.ts`'s permutation shuffle (currently `Math.random` at module load — affects the 17 importing renderers) with a fixed mulberry32; add `shared/random.ts` `createSeededRandom` and route `tempest.ts`/`obsidian.ts` (the only direct `Math.random` users) through it.
2. A NODE_ENV-gated `/dev/theme-lab` fixture page mounting a 320×200 DPR-1 canvas via `loadRenderer(id)`, stepping stateful renderers with fixed deltas to t=1.5/4.0.
3. `tests/e2e/theme-renderers.spec.ts` looping THEME_IDS × 2 timestamps with `toHaveScreenshot({ maxDiffPixelRatio: 0.001 })`, chromium-only, ~118 small committed baselines — run in the new unconditional e2e-public lane. Prefer Playwright over node-canvas (different rasterization of shadowBlur/composites).

**4.6 Harden the design gate.** `check-signal-frame-ui.mjs` is an opt-in allowlist of 36 paths — new components silently escape it. Invert to scan-all-with-explicit-THEME_OWNED_EXCLUDE and fail on unclassified files. Also split `DownloadResumeButton`'s theme branch (hardcodes banned `#93C5FD` / `rgba(240,244,255,…)`) from its site variant so the file can enter scope. Add `scripts/check-theme-contrast.mjs`: WCAG contrast of each theme's text/muted/subtle tokens against background+minimum-scrim (subtle tokens are 0.42-alpha white over scrim corners that drop to 0.01-0.04 opacity; the stat label is `text-[8px]` — raise to ≥10px).

## Phase 5 — Data model and RLS, staged (the deferred items, now with unblocked first steps) (~1 week staged)

**5.1 `owner_id` sweep — Stage A is now zero-risk.** The deferral premise is stale: migration `20260310170000` already backfills, CHECK-constrains (`user_id is null or user_id = owner_id`), and trigger-mirrors the pair. Replace the 8 remaining `.or(user_id.eq.X,owner_id.eq.X)` filters and `user_id ?? owner_id` fallbacks, **standardizing on `owner_id`** (a NULL `user_id` with set `owner_id` is legal, so `user_id` filters would drop rows). Make `PageRecord.owner_id` required. Stage B (reviewed data-migration PR, later): stop writing `user_id` in publish, drop the column.

**5.2 Publication-state truth.** "Is this page public" has 5 app implementations, 2 divergent (settings page and both `AdminPagesTable` expressions classify draft+public as live), and no DB CHECK constrains `(status, visibility)` pairs. Non-destructive migration: backfill `visibility='public'` where live+null, add `pages_publication_state_chk`, consolidate all callers onto `isPubliclyAvailablePage`. Also close the metadata leak this dual model enables: `generateMetadata` skips the visibility gate the body applies, so a live+private legacy row leaks name/headline/summary into og/twitter meta (`fetchPublicLivePage.ts:55-62` vs `[username]/page.tsx:92-110,138`) — one-line fix plus a test.

**5.3 RLS-first access — the blocker moved.** The July-18 hardening revoked content-column select on `pages` from `authenticated`, so no owner read can move to the SSR client regardless of RLS policies (which exist and are correct). Stage 0 is now a *grants* migration (re-grant authenticated full column access on `pages`; owner RLS policies + the integrity trigger remain the gate; keep `anon` restricted). Stage 1: swap `pages/[pageId]`, dashboard, and analytics reads to the SSR client, deleting hand-rolled ownership filters. Stage 2 (movable today, zero schema work): `api/profile` PATCH and `api/events`' ownership check. Verify on a Supabase preview branch with the route suite + authenticated Playwright lane. Service role remains for: anon public reads, analytics writes, admin, webhooks, deletion, rate-limit RPC.

**5.4 Storage posture.** `storage_page_images_insert/update` still grant any authenticated user browser-side writes into the dead `page-images` bucket with no MIME/size constraint — unvalidated public file hosting if the bucket exists — and neither bucket is codified in migrations (posture lives only in the dashboard). Ship the non-destructive slice now: drop the three write policies, codify both buckets in `storage.buckets` (public flag, size limit, MIME allowlist), extend `check-database-security.mjs` to assert no browser-role INSERT policy on `storage.objects`.

**5.5 Profile provisioning in one place.** Three creation paths exist; the publish-route inline upsert (`publish/route.ts:199-231`) skips the uniqueness loop entirely (narrow 500 path). Trust the DB trigger; keep `ensureUserProfile` in the auth callback only; route the publish upsert through it. Add a CI parity check between `RESERVED_USERNAME_SLUGS` and the SQL array copy in `generate_unique_username` (30 entries each today; they will drift silently).

**5.6 Consistency sweep (low, mechanical).** Migrate the 16 inline-auth routes onto the existing `requireAuthenticatedUser`/`requireAdminUser` guards; add a `readJsonBody` helper (3 routes 500 on malformed JSON today).

## Phase 6 — Compliance, abuse, and operational trust (~3-4 days, mostly new surface)

**6.1 Complete GDPR deletion.** DB cascades are correctly wired (verified), but: the Stripe *customer* is never deleted (only subscriptions cancelled — `deleteUserAccount.ts:42-68`; name/email/payment methods persist forever), only the `avatars` bucket is cleaned (`page-images` objects orphan), and the admin-deletion audit event re-writes the deleted user's email/username into `events` with no retention — while the privacy policy promises deletion (`policy-content.ts:561`).

**6.2 Fix IP pseudonymization.** `hashSecurityIdentifier` is unsalted `sha256(ip)` (`request.ts:24-26`) — IPv4 brute-forces in seconds, so `page_views.viewer_ip` is effectively the raw IP stored indefinitely with UA and country. Switch to HMAC with a server-secret pepper (rotate so hashes age out), and set a `page_views` retention cutoff. Document the raw-IP retention in `legal_acceptances` (defensible, but currently unmentioned in any schedule).

**6.3 Bot filtering for "proof" analytics.** `/api/pages/view` counts any JS-executing client; Googlebot renders JS and public pages are indexable by design; `user_agent` is stored but never consulted. Add known-bot UA rejection server-side + a `navigator.webdriver` check in `ViewTracker`. The product's core promise is credible view counts.

**6.4 Minimum abuse surface for UGC publishing.** Add `rel="nofollow ugc"` to user-supplied outbound links (`RecruiterSkimPanel.tsx:147,190` — currently a link-equity target for SEO spam), an admin page-unpublish action (the only admin lever today is whole-user deletion), and a report link in the public-page footer. (`toHref` is already scheme-safe — verified.)

**6.5 Backups and recovery.** Zero mentions of backup/PITR/restore anywhere; deletion is instant with no grace window. Verify/document the Supabase backup tier, write a restore runbook, consider a deletion grace period.

**6.6 Email posture.** No custom SMTP configured or documented (Supabase's built-in mailer throttles at modest scale — signup confirmations and resets will silently fail); no email-change flow exists at all (rectification-right and lockout gap); no notification email on password change or deletion.

**6.7 Deployment governance.** Nothing gates Vercel's auto-deploy of main on CI passing — combined with 4.1, a red or hollow CI ships to production. Enable "require checks" on the Vercel Git integration (or `ignoreCommand`), set `maxDuration` on `resume/export` and the OG route, and record the Vercel↔Supabase region alignment (it multiplies every per-view query finding).

## Phase 7 — Frontend polish, a11y, SEO (~2 days, all S-effort items)

1. **Social preview images**: every acquisition page declares `summary_large_image` with no image anywhere (`public/` still holds only Next starter SVGs). Extract `renderFallbackCard` from `[username]/opengraph-image.tsx:69-105` into a root `opengraph-image.tsx`; delete the starter SVGs; add an apple-icon.
2. **Auth-page metadata**: all four auth pages serve the root default title, indexable, `/signup?ref=…` mints unbounded indexable URL variants. Per-route titles, canonicals, noindex on forgot/reset (copy `homepage-preview`'s pattern).
3. **Offline pages are soft-404s**: HTTP 200 + generic title + no noindex keeps de-hosted pages in search indefinitely — return `robots: noindex` from `generateMetadata`'s null branch (owner expectation: turning hosting off removes it from search).
4. **Silent PDF failure**: `RecruiterSkimPanel` renders `DownloadResumeButton` without `onErrorChange`, so a 429 (plausible on corporate NAT — exactly the recruiter audience) stops the spinner and shows nothing; `PublicPageActionDock` wires the same button correctly. Give the button a built-in `role="alert"` fallback + `aria-live` on the label.
5. **Create-flow focus**: `GuidedFlow` step changes and the create page's input→review swap move focus nowhere and announce nothing (the review swap resets focus to `<body>`). Focus the step heading (`tabIndex={-1}`) on change — `FeedbackWidget.tsx:90-94` is the in-repo pattern.
6. **Editor labels**: `ResumeEditorFields` repeats identical aria-labels across list entries (~25 labels; GuidedFlow already indexes correctly — mechanical fix).
7. **Cookie-settings reopen** never moves focus to the panel and Escape doesn't close (`AnalyticsConsent.tsx:59-63,132-164`).
8. **ThemeCanvas corner-radius string-sniff**: defaults to `borderRadius: 16` unless className contains the literal `"rounded-none"`, so the homepage hero (CSS-module class) renders rounded corners inside the sharp-corner design system that shipped yesterday, invisible to the CI check. Replace with `var(--site-radius)` or delete the inline default.
9. **ThemeCanvas crash-proofing**: `THEME_MAP[themeId]` has no fallback — a renamed/removed theme id in DB or localStorage hard-crashes the editor for exactly the users trying to switch off it. One-line `?? THEME_MAP.cosmic` + an `isThemeId` guard at the three unvalidated boundary casts.

## Phase 8 — Dependency ladder (sequenced; each rung verified unblocked)

Registry state as of 2026-07-19: eslint 8.57 (EOL Oct 2024; latest 10.x, maintenance 9.39), next 15.5.20 is now the npm **"backport"** dist-tag (latest 16.2.10), vitest 3.2.7 is the legacy "V3" tag (latest 4.1.10), tailwind 3.4.17 (v3-lts is 3.4.19), stripe 20.4.0 (latest 22.3.2).

- **Rung 0 (same day, one batch PR)**: `@types/node` ^22 (currently ^20 vs `engines >=22` and Node-22 CI), tailwindcss 3.4.19, `pg` → devDependencies (only CI scripts import it), `@supabase/ssr` ^0.12 + `supabase-js` ^2.110 (auth-critical 0.x package four minors behind — read the cookie-API changelogs), `@react-pdf/renderer` ^4.5. Also: remove the two env vars no code reads (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` from `.env.example`+ci.yml, `PLAYWRIGHT_SUPABASE_PUBLISHABLE_KEY`), document `PLAYWRIGHT_BROWSER_CHANNEL`.
- **Rung 1 — ESLint 9 flat config** (before the majors so lint stays green through them). Unblocked: `eslint-config-next@15.5.20` already peers `^9`, the eslintrc is 11 lines. Add a non-blocking full-tree `npm audit --audit-level=moderate` step while touching CI (dev-toolchain advisories are currently invisible).
- **Rung 2 — React 19.** Unblocked: next 15.5 peers `^19`; verified zero forwardRef/defaultProps/JSX.Element/class components/argless useRef in src; renderers are React-free canvas functions; `@react-pdf/renderer` peers ^19. Budget a half-day for @types fallout.
- **Rung 3 — Next 16** immediately after React 19 is green. Verified ready: `remotePatterns` (not `domains`), no custom webpack (Turbopack-safe), lint already bypasses `next lint`. Touchpoints: middleware→proxy rename, `eslint-config-next@16` in lockstep. Escape hatch: `next build --webpack`.
- **Rung 4 — Vitest 4** (config needs zero changes; fix mock auto-reset/spy-typing deltas).
- **Rung 5 — Tailwind 4** — only after the visual-regression harness (4.5) exists; v4's browser floor is Safari 16.4+. Zero `@apply` in globals.css; colors already CSS-variable indirections that map 1:1 onto `@theme`.
- **Rung 6 — Stripe 22 + apiVersion re-pin**, explicitly coupled to any billing revival (the literal-typed apiVersion forces the re-pin at compile time; update the dashboard webhook version in lockstep). Do not bump casually.
- Keep `docs/previews/` PNGs (2.5MB, 45% of the tracked tree) out of future churn: gitignore + attach to PRs as CI artifacts before the next visual pass.

## Phase 9 — The big refactors (after Phase 4 lands the nets)

**9.1 Editor unification** (blocked-on: 4.4). Extract `useEditorSession(draftKey)` (draft persistence + dirty tracking — replace the per-keystroke full-document `JSON.stringify` with an edit counter — + account-access load) and a shared `<LivePreviewFrame>`; hook-test both before either page consumes them; migrate `PageEditorClient` (smaller) first, then `create/page.tsx`.

**9.2 Renderer de-duplication** (blocked-on: 4.5). Duplication measured: 28 files declare their own `TAU`, 38 files/108 occurrences of the seeded-scatter idiom, 47 `createLinearGradient` washes, 6 near-identical vignettes, 18 pointer-distance boosts. Extract `shared/canvas.ts` (`scatterField`, `vignette`, `pointerBoost`, `TAU`) matching existing math exactly; convert 5 pilot renderers (one per collection) with zero-pixel-diff gates; then alphabetical batches of ~10. Never big-bang.

**9.3 Full billing/entitlement collapse + destructive schema drops** — still gated on the product decision and a reviewed data-migration PR respectively, but Phase 3 and 5 shrink both to small, well-rehearsed steps.

---

## Suggested sequencing

| Order | Work | Effort | Payoff |
|---|---|---|---|
| 1 | Phase 1.1-1.3 (observability, reauth, write rate limits) | ~2 days | Ends flying blind; closes the worst account-takeover surface |
| 2 | Phase 2.1-2.3 (static funnel, 53 kB off public page, query halving) | ~2 days | Biggest user-facing perf wins; cuts per-view cost |
| 3 | Phase 4.1 (unconditional public e2e + fail-on-main) | ~0.5 day | Makes every later change verifiable |
| 4 | Phase 3 (billing dead-code slice) | ~1-2 days | −1,000+ lines off the hottest paths, zero product change |
| 5 | Phase 4.2-4.6 (tests, DOM env, visual harness) | ~3 days | Unblocks Phase 9; pins destructive-path behavior |
| 6 | Phase 6 (GDPR/abuse/backup/email) | ~3-4 days | Compliance debt before it's incident-shaped |
| 7 | Phase 5 (owner_id sweep, publication CHECK, RLS stages) | ~1 week staged | Structural debt paydown, now de-risked |
| 8 | Phase 7 + Phase 8 rungs 0-4 | ~3 days | Polish + off EOL tooling |
| 9 | Phase 9 (editor unification, renderer dedup) | staged | The deferred refactors, now safe |

**Quick wins if only an afternoon is available**: Sentry bootstrap (1.1), reauth on delete/change-password (1.2), the `page_views` index migration (2.4), `React.cache` on `fetchPublicLivePage` (2.3), root og-image (7.1), ThemeCanvas fallback (7.9), and Rung 0 of the ladder.

## Findings rejected during verification (for the record)

- `noUncheckedIndexedAccess` tsconfig gap: the claimed runtime holes were all guarded; hygiene-only, deprioritized.
- Deleting `/homepage-preview`: documented as an intentionally-retained noindex review mirror in `docs/previews/README.md`; kept.
- `pg` in dependencies is cosmetic (server-only, never bundled) — folded into Rung 0 as a one-liner, not a finding.
- The events-table growth was triple-reported across dimensions; consolidated into 2.5.
- CAPTCHA-enforcement-as-dashboard-toggle is inherent to managed Supabase auth and documented in the README; downgraded to a release-checklist probe (pairs with the equally-unverifiable SMTP config in 6.6).
