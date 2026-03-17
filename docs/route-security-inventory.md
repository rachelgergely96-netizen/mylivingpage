# Route Security Inventory

This file is the repo's route trust source of truth. Update it whenever a route, auth contract, public compute path, or secret usage changes.

| Route | Methods | Trust | Owner | Abuse Cost | Required Controls |
| --- | --- | --- | --- | --- | --- |
| `/api/account/change-password` | `POST` | `authenticated_user` | Account | Medium | Authenticated user session |
| `/api/account/delete` | `POST` | `authenticated_user` | Account | High | Authenticated user session, billing-safe delete flow |
| `/api/admin/users/[userId]` | `DELETE` | `admin_only` | Admin Ops | High | Admin auth, protected account check |
| `/api/auth/track-login` | `POST` | `authenticated_user` | Auth | Low | Authenticated user session |
| `/api/avatar` | `POST`, `DELETE` | `authenticated_user` | Profile | Medium | Authenticated user session, file validation |
| `/api/events` | `POST` | `authenticated_user` | Product Analytics | Low | Authenticated user session |
| `/api/feedback` | `POST` | `authenticated_user` | Product | Low | Authenticated user session |
| `/api/generate/ats-review` | `POST` | `authenticated_user` | Create/Edit | High | Authenticated user session |
| `/api/generate/parse` | `POST` | `authenticated_user` | Create Flow | High | Authenticated user session, parse-specific rate limit |
| `/api/legal/accept` | `POST` | `authenticated_user` | Legal/Auth | Low | Authenticated user session |
| `/api/pages/[pageId]` | `GET`, `PATCH`, `DELETE` | `authenticated_user` | Pages | High | Authenticated user session, page ownership check |
| `/api/pages/engagement` | `POST` | `public_write` | Public Analytics | Medium | Shared rate limit, normalized payload, existing page-view check |
| `/api/pages/publish` | `POST` | `authenticated_user` | Pages | High | Authenticated user session, plan/theme enforcement |
| `/api/pages/view` | `POST` | `public_write` | Public Analytics | Medium | Shared rate limit, public page check, owner ignore, IP dedupe |
| `/api/profile` | `GET`, `PATCH` | `authenticated_user` | Profile | Medium | Authenticated user session |
| `/api/resume/export` | `POST` | `public_read` | Public ATS Export | High | Shared rate limit, page-bound request, approved ATS data only |
| `/api/resume/export/check` | `POST` | `authenticated_user` | ATS Export | High | Authenticated user session, shared rate limit |
| `/api/resume/export/preview` | `POST` | `authenticated_user` | ATS Export | High | Authenticated user session, shared rate limit |
| `/api/stripe/checkout` | `POST` | `authenticated_user` | Billing | High | Authenticated user session |
| `/api/stripe/portal` | `POST` | `authenticated_user` | Billing | Medium | Authenticated user session |
| `/api/username` | `GET`, `PATCH` | `GET public_read`, `PATCH authenticated_user` | Username/Pages | Medium | Shared rate limit on `GET`, authenticated user on `PATCH` |
| `/api/waitlist` | `POST` | `public_write` | Marketing | Medium | Shared rate limit, email validation |
| `/api/webhooks/stripe` | `POST` | `signed_webhook` | Billing | High | Verified Stripe signature before service-role actions |

## High-Priority Public Compute Paths

- `/api/resume/export`
- `/api/resume/export/check`
- `/api/resume/export/preview`
- `/api/username`
- `/api/waitlist`
- `/api/pages/view`
- `/api/pages/engagement`

These routes must keep shared rate limits and should be reviewed first during any release touching public traffic or bot behavior.
