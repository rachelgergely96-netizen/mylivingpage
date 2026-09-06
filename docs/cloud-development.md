# Cloud development and secrets

Use GitHub as the shared source for `rachelgergely96-netizen/mylivingpage`. Codex works in its cloud; Cursor runs the app and browser checks in its existing cloud VM. Nothing here requires installing Node, npm, or browsers on the owner's laptop.

## What belongs where

| Place | Role | Credentials |
| --- | --- | --- |
| GitHub repository | Source, instructions, scripts, blank example variables | No secret values |
| Codex cloud environment | Edits, reviews, lint, typecheck, unit tests, build checks | Public configuration/placeholders; setup secrets only when setup needs them |
| Cursor Cloud environment | App, signup/login, Playwright, browser QA | Staging runtime secrets |
| GitHub Actions | Automated quality and staging gates | Existing workflow's named staging secrets |
| Deployment provider | Deployed application | Separate Preview/staging and Production configuration |

Each platform has its own settings. A secret saved in GitHub Actions is not automatically available in Codex, Cursor, or the deployed app. This repository does not synchronize secret values.

## Codex cloud setup

In Codex settings, create/select the environment for this repository, choose Node 22, and add the non-secret environment variable `MLP_CLOUD_ENVIRONMENT=codex`.

After this branch is available to the environment, set both the setup and maintenance commands to:

```sh
sh scripts/cloud-setup.sh codex
```

A setup cache may initially use the default branch. Until the helper is merged there, use `npm ci` directly as the setup/maintenance command, or initialize the environment from a branch that contains it.

Run lint, typecheck, unit tests, client-security and Signal Frame checks using the commands in AGENTS.md. For build checks, use the non-secret placeholder configuration already defined under `jobs.quality.env` in [.github/workflows/ci.yml](../.github/workflows/ci.yml). Those placeholders establish buildability, not backend connectivity.

**Codex secrets are setup-only.** Official documentation says they are removed before the agent phase. Regular environment variables persist through both phases. Do not put runtime passwords in regular variables or write setup secrets into `.env.local`/`~/.bashrc` to work around that boundary. Run authenticated app checks in Cursor under this division of work.

Source: [OpenAI cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environment).

## Cursor cloud setup

Keep the existing configured VM/snapshot. This change deliberately does not invent a snapshot ID or replace `.cursor/environment.json`.

In the cloud environment settings:

1. Select this repository and a branch containing these helpers; configure Node 22.
2. Set the non-secret variable `MLP_CLOUD_ENVIRONMENT=cursor`.
3. Set the install command to `sh scripts/cloud-setup.sh cursor`. It installs the lockfile dependencies and Chromium/system dependencies inside the VM.
4. Add app secrets with type **Runtime Secret**, scoped to this environment where possible.
5. For manual app work, start `ENABLE_EDITOR_PREVIEW=1 npm run dev -- --hostname 127.0.0.1 --port 3000` inside the VM. Leave `PLAYWRIGHT_BASE_URL` unset so credential-free Playwright can boot its own server.

The setup script is finite and does not start the app or copy secrets into snapshot files. Its Linux/provider checks help prevent accidental laptop installs; the provider variable is not an authentication mechanism.

Sources: [Cursor environment setup](https://cursor.com/docs/cloud-agent/setup), [Cursor secrets](https://cursor.com/docs/cloud-agent/security-network).

## Two browser modes

### Credential-free fixtures

Use a separate environment/profile with no real service credentials. In the VM:

```sh
npm run test:e2e:visual
```

With `PLAYWRIGHT_BASE_URL` unset, Playwright starts the app and supplies the editor-preview flag and dummy public Supabase configuration. It targets fixture routes. Do not set `PLAYWRIGHT_BASE_URL` for this mode: doing so disables the managed server and its injected configuration.

For manual fixture viewing, configure these non-secret environment variables and run the dev server:

```dotenv
ENABLE_EDITOR_PREVIEW=1
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=playwright-public-key
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

These values do not start Supabase or provide working authentication. Keep preview flags out of Production.

### Authenticated staging

Use an isolated staging Supabase project with the required migrations and disposable users. In Cursor, configure the following names directly; enter actual values only in the dashboard.

| Runtime name | Type and purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public staging project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public staging key; legacy alternative is `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SECRET_KEY` | Runtime Secret, staging server key; legacy alternative is `SUPABASE_SERVICE_ROLE_KEY` |
| `SECURITY_HASH_PEPPER` | Runtime Secret, independently generated for staging |
| `NEXT_PUBLIC_APP_URL` | Non-secret origin actually used by the browser |
| `PLAYWRIGHT_TEST_EMAIL`, `PLAYWRIGHT_TEST_PASSWORD` | Runtime Secrets for a disposable, confirmed staging user |
| `PLAYWRIGHT_SIGNUP_EMAIL_DOMAIN` | Controlled test-email domain for signup tests |
| `PLAYWRIGHT_EXPECT_SIGNUP_CONFIRMATION` | Set to `1` only when staging requires email confirmation |
| `ADMIN_EMAIL` | Staging administrator email, only for admin work |

Set one public-key name and one server-key name. Leave unused aliases absent, rather than present with empty strings: the app resolves them with nullish coalescing.

For a VM-hosted Playwright server, use `http://127.0.0.1:3000` as the app origin. For manual OAuth through a forwarded preview, use that HTTPS origin instead. Register each exact allowed callback origin plus `/callback` in the staging Supabase Auth redirect configuration. Keep the staging Site URL and provider configuration aligned; do not change production auth settings for VM testing.

If CAPTCHA is enabled, configure the matching staging Turnstile site key and Supabase CAPTCHA secret in their respective dashboards. The signup suite can skip CAPTCHA-protected automation; report that skip and verify the protected flow separately. Google login requires configured Supabase Google auth and dedicated `PLAYWRIGHT_GOOGLE_EMAIL`/`PLAYWRIGHT_GOOGLE_PASSWORD` credentials; interactive provider challenges can still require manual verification.

Then, with no stale preview server already occupying port 3000:

```sh
npm run test:e2e
```

The suite can create, publish, edit, and delete data. Use disposable staging data only. The test helper can reuse the app's Supabase URL/server key; explicit `PLAYWRIGHT_SUPABASE_URL` and `PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY` overrides must point to the same staging project. Never mix backend targets.

For tests against an already deployed staging app, set `PLAYWRIGHT_BASE_URL` to its origin. App variables/secrets then belong on that deployment; Playwright does not inject them into the remote server.

## Additional integrations

- **Database gates:** `DATABASE_URL` is a Runtime Secret used by the schema/security scripts, not a requirement for ordinary UI work. Use a staging connection reachable from the cloud runner. Setup never applies migrations automatically.
- **Legacy Stripe:** use test-mode `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as Runtime Secrets. Public configuration includes `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and the two `STRIPE_*_MONTHLY_PRICE_ID` names from .env.example. Test helpers can inherit app Stripe credentials. Only enable live configuration checks for a deliberate staging task. New checkout is disabled in the current app.
- **Failure injection:** `ENABLE_E2E_FAILURE_INJECTION=1` belongs only in an isolated staging test run.
- **Legal information:** populate the public legal/contact names in .env.example for deployed pages. Those are intentionally public, not private credentials.

## GitHub Actions mapping

The existing workflow reads these GitHub secret names. Configure them in repository Actions secrets (or deliberately update jobs to use a protected GitHub Environment). Cloud agent secrets do not populate this store.

```text
STAGING_SCHEMA_CHECK_DATABASE_URL
STAGING_SUPABASE_URL
STAGING_SUPABASE_PUBLISHABLE_KEY
STAGING_SUPABASE_ANON_KEY
STAGING_SUPABASE_SECRET_KEY
STAGING_SUPABASE_SERVICE_ROLE_KEY
STAGING_SECURITY_HASH_PEPPER
STAGING_STRIPE_PUBLISHABLE_KEY
STAGING_STRIPE_SECRET_KEY
STAGING_STRIPE_WEBHOOK_SECRET
STAGING_STRIPE_STARTER_MONTHLY_PRICE_ID
STAGING_STRIPE_PRO_MONTHLY_PRICE_ID
NEXT_PUBLIC_LEGAL_COMPANY_NAME
NEXT_PUBLIC_LEGAL_CONTACT_EMAIL
NEXT_PUBLIC_LEGAL_MAILING_ADDRESS
NEXT_PUBLIC_DMCA_AGENT_NAME
NEXT_PUBLIC_DMCA_AGENT_EMAIL
NEXT_PUBLIC_DMCA_AGENT_ADDRESS
NEXT_PUBLIC_DMCA_AGENT_PHONE
NEXT_PUBLIC_SECURITY_EMAIL
STAGING_PLAYWRIGHT_TEST_EMAIL
STAGING_PLAYWRIGHT_TEST_PASSWORD
STAGING_PLAYWRIGHT_SIGNUP_EMAIL_DOMAIN
STAGING_PLAYWRIGHT_EXPECT_SIGNUP_CONFIRMATION
STAGING_PLAYWRIGHT_GOOGLE_EMAIL
STAGING_PLAYWRIGHT_GOOGLE_PASSWORD
```

The integration readiness step currently requires `STAGING_SUPABASE_SECRET_KEY` specifically, even though the app accepts a legacy server-key alias. Configure that name for this workflow; a legacy service-role value can be supplied under it. Configure a public key too. A missing-secret warning means the staging gate did not run, even if the overall workflow is green.

## Secret entry and rotation

Copy values directly from the relevant provider into the receiving provider's secret form. Do not paste values into chat, committed files, issue/PR text, or command arguments. Public configuration can be ordinary environment variables; server credentials and account passwords belong in secret fields.

Create a new staging pepper using a trusted password/secret generator and store it directly in the staging secret stores that need it. Do not reuse the production pepper. When rotating a credential, update each authorized consumer, restart/rebuild as needed, verify its flow, then revoke the old credential. Rebuild when browser-visible `NEXT_PUBLIC_*` configuration changes.

## Branch handoff and completion

Codex writes to `codex/<task>`; Cursor browser verification uses a separate `cursor/<task>-qa` branch from the exact Codex commit, or takes ownership only after the Codex writer stops. Return the tested SHA, command results, skipped test names, and browser findings. Do not run two writers on the same branch.

Setup is complete only after the cloud install succeeds, credential-free checks pass, and the requested staging flows run without configuration-related skips. Dashboard secret entry, staging schema/auth settings, and a real VM run are separate from merging these instructions.
