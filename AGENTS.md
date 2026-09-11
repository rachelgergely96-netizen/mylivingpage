# MyLivingPage agent instructions

## Cloud work and branch ownership

- Work from GitHub in the assigned cloud environment. Do not install dependencies on the owner's laptop or ask the owner to run npm locally.
- Codex owns code edits, reviews, and static/unit checks in Codex cloud. Cursor Cloud Agents own app execution, Playwright, and browser checks in the configured Cursor VM.
- Use one writer per branch/task. Use a unique `codex/<task>` or `cursor/<task>` branch. Before handing a branch to the other tool, stop the first writer and record the commit SHA. Browser verification can use a separate branch at that SHA.
- Shared instructions must allow both cloud tools. Any local-editor refusal rule belongs only in local editor settings, never in this file.
- If the cloud checkout/runtime is unavailable, report that limitation; use the GitHub connector for reviewable changes when available. Do not silently switch to a laptop checkout.

## Setup and validation

Read [docs/cloud-development.md](docs/cloud-development.md) for setup, secret placement, and handoff instructions. Node 22 is the cloud baseline.

In the cloud, run `sh scripts/cloud-setup.sh codex` for dependencies or `sh scripts/cloud-setup.sh cursor` for dependencies and Chromium. These commands require `MLP_CLOUD_ENVIRONMENT` to match the argument.

Code checks: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run check:client-security`, and `npm run check:signal-frame`. Build configuration is documented in the cloud guide.

Cursor browser checks: `npm run test:e2e:visual` for credential-free fixtures; `npm run test:e2e` for the wider suite with staging credentials. Report skipped cases explicitly. A passing visual suite does not verify signup/login.

## Secret handling

- Use provider dashboards for credentials. Never request secret values in chat, print environment dumps, read credential files for discovery, or commit secrets.
- Keep production credentials out of development agents. Use isolated staging Supabase, disposable test accounts, and Stripe test mode.
- Never copy Codex setup-only secrets into files or shell profiles to retain them in the agent phase.
- Public `NEXT_PUBLIC_*` variables are browser-visible. Server keys, database URLs, passwords, and `SECURITY_HASH_PEPPER` must remain server-only.
- Keep test output, browser storage state, traces, and screenshots out of commits. Inspect diagnostics for personal data before sharing.

## Closeout

Report branch and commit SHA, checks actually run, failures/skips, and external configuration still needed. A commit, green unit tests, or a skipped staging lane does not establish production readiness.
