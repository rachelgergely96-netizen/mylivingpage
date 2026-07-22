# Project closeout handoff — 2026-07-22

This is the resume point for MyLivingPage. The public homepage and Living Page theme work are already merged and live. A separate security/CI/SEO/recovery batch is preserved locally, validated, and intentionally **not pushed or merged** because it still needs staging credentials and external deployment checks.

## Repository checkpoint

- Repository: `/Users/rachelgergely/Documents/mylivingpage`
- Active branch: `agent/security-ci-seo-hardening`
- Hardening code checkpoint: `4de914f` (`Harden CI security SEO and recovery workflows`)
- Rebased onto: `1ba4208` (`Redesign homepage conversion story and motion (#4)`), which was `origin/main` at closeout
- Recovery snapshot: `safety/security-ci-seo-hardening-20260722` at `ef85a88` (the same hardening batch before its conflict-free rebase)
- The active branch deliberately tracked `origin/main` and was ahead locally. It had not been pushed to an origin branch at closeout.
- Use `origin/main`, not the potentially stale local `main`, when checking or rebasing.

## Already shipped and live

### Homepage conversion and motion refresh

- Pull request: [#4](https://github.com/rachelgergely96-netizen/mylivingpage/pull/4)
- Main commit: `1ba4208f854d5e5c4b653a58ed82ae5469915f5a`
- The post-merge GitHub Actions run passed, including quality, database-schema readiness, integration readiness, and all 16 visual tests.
- The Vercel GitHub deployment reported success in Production.
- `https://www.mylivingpage.com` was checked after deployment and served the new headline, “Your résumé, alive on the web.”

### Living Page themes and HD render pass

- Pull request: [#3](https://github.com/rachelgergely96-netizen/mylivingpage/pull/3)
- Main commit: `a19b573` (`Redesign all Living Page theme renderers + HD render pass (#3)`)
- This is already part of the current main history beneath the homepage commit.

## Paused local hardening batch

The original 72 working-tree entries were audited as one coherent unfinished batch, not random files. They are preserved in commit `4de914f` on `agent/security-ci-seo-hardening`.

Major contents:

- CI now has unconditional credential-free Playwright coverage, and main-branch pushes fail instead of silently skipping missing staging database or authenticated-browser gates.
- Tests directly cover every API route plus middleware, profile provisioning, account-deletion ordering, analytics retention, crawler filtering, and HMAC identifier hashing.
- Unreachable paid-hosting shutdown/offline-page code and feeder queries were removed; touched owner-scoped paths consistently use `owner_id`.
- SEO and accessibility work includes root social-preview art, auth metadata, noindex behavior for unavailable/recovery pages, focus/error improvements, admin unpublish, public reporting, and user-generated-content link attributes.
- An additive analytics index/retention migration and backup/restore runbook were added.
- Dependency/tooling cleanup includes Node type definitions 22, Tailwind 3.4.19, `pg` as a development dependency, unused environment-variable cleanup, and documented Playwright browser-channel behavior.

The implementation plan and its paused-gate checklist are in `docs/improvement-plan-2.md`, especially the “Local follow-up status” and “Paused external-completion checklist” sections.

## Validation already completed

On the equivalent current main base, before the final conflict-free rebase, this batch passed:

- `npm run typecheck`
- `npm run lint`
- `npm test`: 464 passed, 1 skipped
- `npm run check:client-security`
- `npm run check:signal-frame`: 70 components and 3 stylesheets checked
- `npm run build`: 53 pages
- 34 credential-free Playwright tests, as recorded in the implementation plan

The rebase from the old base to `origin/main` completed without conflicts. Re-run the full gate after any new edits and before publishing the branch.

## External blockers — do not merge yet

Complete all of these before treating the hardening branch as production-ready:

1. Configure the server-only `SECURITY_HASH_PEPPER` in preview and production deployment environments. Never commit the value.
2. Configure GitHub Actions secret `STAGING_SCHEMA_CHECK_DATABASE_URL` for an isolated, runner-reachable staging database.
3. Configure staging Supabase values and a dedicated Playwright test account for the authenticated CI lane. Add Stripe/Google staging credentials only if those optional flows are exercised.
4. Review and apply `supabase/migrations/20260720193000_analytics_retention_and_abuse_indexes.sql` to a Supabase preview branch first.
5. Run database security/schema checks and authenticated Playwright against staging, then review the results before promotion.
6. Finish external operational setup noted in the plan, including a Vercel alert/log drain and admin MFA enrollment.

Never point destructive account tests at production. Keep every staging and production secret out of source control and chat.

## Exact resume sequence

Start by confirming that the checkout still matches this checkpoint:

```bash
cd /Users/rachelgergely/Documents/mylivingpage
git status --short --branch
git log -5 --oneline --decorate
git fetch origin
git rebase origin/main
```

If the rebase introduces conflicts, stop and resolve them narrowly; the safety branch above preserves the pre-rebase batch. Then run the local gate:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run check:client-security
npm run check:signal-frame
npm run build
npm run test:e2e
```

After staging values are configured, run these against the isolated staging database—not production:

```bash
npm run check:single-page-schema
npm run check:analytics-schema
npm run check:database-security
npm run test:e2e
```

Confirm the target environment variables before each staging command. Some checks are intentionally destructive or stateful.

## Safe publishing path for the hardening batch

Only after every external blocker and validation gate is complete:

```bash
git status --short --branch
git diff --check origin/main...HEAD
git push -u origin agent/security-ci-seo-hardening
```

Open a **draft** pull request into `main`, summarize the external configuration and migration evidence, and wait for all required GitHub checks. Review the diff once more before marking the PR ready. Do not merge merely because credential-free local checks pass.

## Closeout boundaries

- The homepage and theme PRs are complete; do not recreate or re-merge them.
- The hardening branch is preserved local work, not a live release.
- Do not squash away or delete the safety branch until the hardening PR is safely merged.
- Do not edit, revert, or reformat unrelated work while resuming this batch.
- Temporary homepage worktrees may be removed because their branches and merged commits remain recoverable through Git.
