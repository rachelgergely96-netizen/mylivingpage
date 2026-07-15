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
| `/api/generate/parse` | `POST` | `authenticated_user` | Create Flow | Low | Authenticated user session, permanently disabled response, no provider call |
| `/api/legal/accept` | `POST` | `authenticated_user` | Legal/Auth | Low | Authenticated user session |
| `/api/pages/[pageId]` | `GET`, `PATCH`, `DELETE` | `authenticated_user` | Pages | High | Authenticated user session, page ownership check |
| `/api/pages/engagement` | `POST` | `public_write` | Public Analytics | Medium | Shared rate limit, normalized payload, existing page-view check |
| `/api/pages/publish` | `POST` | `authenticated_user` | Pages | High | Authenticated user session, theme and variant validation |
| `/api/pages/view` | `POST` | `public_write` | Public Analytics | Medium | Shared rate limit, public page check, owner ignore, IP dedupe |
| `/api/profile` | `GET`, `PATCH` | `authenticated_user` | Profile | Medium | Authenticated user session |
| `/api/resume/export` | `POST` | `public_read` | Public ATS Export | High | Shared rate limit, page-bound request, server-fetched saved page data |
| `/api/resume/readiness` | `POST` | `authenticated_user` | Resume Builder | Medium | Authenticated user session, user rate limit, bounded request text, deterministic checks only, no persistence |
| `/api/stripe/checkout` | `POST` | `authenticated_user` | Billing | Low | Authenticated user session, permanently disabled response, no checkout creation |
| `/api/stripe/portal` | `POST` | `authenticated_user` | Billing | Medium | Authenticated user session |
| `/api/username` | `GET`, `PATCH` | `GET public_read`, `PATCH authenticated_user` | Username/Pages | Medium | Shared rate limit on `GET`, authenticated user on `PATCH` |
| `/api/waitlist` | `POST` | `public_write` | Marketing | Medium | Shared rate limit, email validation |
| `/api/webhooks/stripe` | `POST` | `signed_webhook` | Billing | High | Verified Stripe signature before service-role actions |

## High-Priority Public Compute Paths

- `/api/resume/export`
- `/api/username`
- `/api/waitlist`
- `/api/pages/view`
- `/api/pages/engagement`

These routes must keep shared rate limits and should be reviewed first during any release touching public traffic or bot behavior.
