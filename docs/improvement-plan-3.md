# MyLivingPage — Improvement Plan 3: User Functionality

Audit date: 2026-08-10. Baseline: `main` @ `0e54e76`, clean tree.

> **Execution update — 2026-08-10.** All five stages are implemented on branch
> `user-functionality-plan-3`. See [Execution record](#execution-record) at the end for
> what shipped, where the implementation departed from this plan and why, and what remains
> for Rachel or ops.

Plans 1 and 2 were engineering plans — security, architecture, dead code, CI, perf. This
one asks a different question: **what can a user actually do, and where does the product
stop short of its own promise?** Findings are ordered by user impact, not by effort.

Everything below was verified by reading the code, not inferred from the docs.

---

## The through-line

Three of the four largest gaps share one shape: **a feature was built as a type system and
an onboarding step, then never given a place to live in the product.** Variants, the ATS
review workflow, and the hosting/offline state each have complete data models, working
render paths, and no way for a user to reach or reverse them after their first session.

The fourth gap is simpler: the core promise — *"send it, know when they open it"* — has no
delivery mechanism at all.

---

## Tier 1 — The product doesn't do what it says

### 1.1 "Know when they open it" is not implemented · **L**

The create-success screen tells the user **"When someone opens this, you'll know."**
([create/page.tsx:921](../src/app/(app)/create/page.tsx#L921)) The `<h1>` on the same page
is *"Build your page, send it, know when they open it."*

There is no notification path of any kind:

- No email provider in `package.json` — no Resend, Postmark, nodemailer, SendGrid.
- No email/webhook variables in `.env.example`.
- No cron: `vercel.json` is `{ $schema, framework }` and nothing else.
- No Supabase Edge Functions — `supabase/` contains `migrations/` only.
- No push, no in-app notification store, no unread state.

The only way a user learns their page was opened is to log in and read the dashboard. The
tracking itself is good (`page_views` with `engaged_seconds`, referrer, device, per-variant
attribution, repeat-visitor detection in `pageAnalytics.ts`) — it is all pull-only.

This is the single highest-value gap in the codebase. Everything needed to *compute* the
notification already exists; only delivery is missing.

**Do:**
1. Add a transactional email provider and a `notification_preferences` table.
2. Ship the two events that carry the promise: **first view of a page** and **a repeat
   visitor returning** (`followUp.repeatViewAlert` already computes this —
   [pageAnalytics.ts:102](../src/lib/analytics/pageAnalytics.ts#L102)).
3. Add a weekly digest for everyone else, defaulting on, one-click unsubscribe.
4. Until email ships, **change the copy.** "When someone opens this, you'll know" should not
   be on screen while the answer is "if you remember to check."

#### 1.1a — Fire notifications from engagement, not from the view insert

The view pipeline is in better shape for this than expected, and one design choice decides
whether these notifications are trusted or muted.

**Already working in your favour** ([view/route.ts](../src/app/api/pages/view/route.ts)):

- **Owner views are excluded** — `if (user?.id && pageOwnerId === user.id)` returns
  `{ ignored: true }` without recording.
- **24-hour dedupe per hashed IP per page** — a viewer who opens the link five times in a day
  produces one row. Notification volume is naturally bounded to one per viewer per page per day.
- **JavaScript is required.** `ViewTracker` is a client component that fires on mount, so
  plain-HTML crawlers and the common OG/link-preview fetchers (Slack, LinkedIn, iMessage)
  never register a view at all.

**The two false-positive sources:**

- **No bot or user-agent filtering exists anywhere.** `user_agent` is stored and used only by
  `detectDeviceLabel` ([pageAnalytics.ts:455](../src/lib/analytics/pageAnalytics.ts#L455)).
  Headless link scanners that *do* execute JS — Microsoft Defender Safe Links, Proofpoint URL
  Defense, corporate mail gateways — will record a view. The failure mode is specific and
  costly: the user gets "someone opened your page" ninety seconds after emailing a recruiter,
  and it was the recruiter's mail server. One of those teaches the user to distrust every
  future notification.
- **Owner-while-signed-out counts.** The exclusion needs an authenticated session, so the
  owner checking their own link on their phone or in incognito notifies themselves.

**The fix costs nothing to build.** `/api/pages/engagement` already receives `engagedSeconds`,
`maxScrollDepthPct`, and `primarySection` by `sendBeacon` from a real browser session
([engagement/route.ts:76-96](../src/app/api/pages/engagement/route.ts#L76)). Scanners fetch,
execute, and leave — they don't dwell or scroll. So:

- Trigger the notification off the **engagement update**, not the `page_views` insert, gated
  on a threshold (engaged seconds ≥ ~10, or scroll depth > 25%).
- Add a short delay (~2 min) so engagement lands before the email sends.
- Store the notified state on the view row so a later engagement update can't re-fire it.

This also gives the email something worth reading — "they spent 40 seconds, mostly on Proof"
rather than "someone loaded your page."

Bot user-agent filtering is worth adding regardless, but as a second line of defence. Dwell
time is the stronger signal and it's already being collected.

### 1.2 Targeted versions become permanently uneditable after the first publish · **M**

`VariantPlanner` is imported by exactly one file: `/create`
([create/page.tsx:11,746](../src/app/(app)/create/page.tsx#L746)).

`MAX_PAGES_PER_ACCOUNT = 1` ([plans.ts:16](../src/lib/plans.ts#L16)), and `/create`
short-circuits to a "Page limit reached" panel when `pageCount >= 1`
([create/page.tsx:602-632](../src/app/(app)/create/page.tsx#L602)).

So: a user builds targeted versions during onboarding, publishes, and **can never reach that
UI again.** `PageEditorClient` has no variant surface. The variants keep working publicly —
`?v=` resolves through `getPageVariant` → `applyPageVariant`, `RecruiterSkimPanel` renders,
analytics attributes views per variant — but they cannot be created, renamed, retargeted, or
deleted for the life of the account.

A user who skipped variants in onboarding can never add one. A user who made one for a role
they no longer want is stuck with it.

**Do:** move `VariantPlanner` into the editor as section 12.5, between Design and ATS. This
is close to a lift-and-shift — the planner takes `baseData`/`variants`/`onChange` and the
editor already owns both. Persist through the existing `PATCH /api/pages/[pageId]`
`page_config.variants` path that publish already writes.

### 1.3 The ATS review system is ~1,300 lines of dead code, and what ships forgets everything · **M**

[`src/lib/ats-review.ts`](../src/lib/ats-review.ts) is the largest file in the repo (1,507
lines). It implements per-role targeting, rule-generated proposals, accept/decline decisions,
before/after diffs, approval status, `out_of_sync` detection, and candidate export checks.

**4 of its 38 exports are used** — all four by `ats-readiness.ts`, and all four are
normalizers ([ats-readiness.ts:1-6](../src/lib/ats-readiness.ts#L1)):

```
buildAtsRelevantFingerprint, normalizeAtsExportCheck, normalizeAtsText, normalizeResumeDataForAts
```

`AtsReviewSnapshot` and `PageConfig.ats` are referenced only by `ats-review.ts` itself and
`types/resume.ts`. **No route writes them. No component reads them.**

What actually ships is `AtsReadinessCard` → `POST /api/resume/readiness`, which computes and
returns a score with **zero persistence** ([readiness/route.ts:152](../src/app/api/resume/readiness/route.ts#L152)
returns `{ readiness }` and touches no table). The job description lives in React state.

The user-visible consequence: **re-paste the job description on every visit.** No history, no
saved target roles, no way to check the same résumé against three roles you're applying to,
no record of what you already fixed. For a job seeker running 20 applications, this is the
feature they'd use most and it has no memory.

**Decided 2026-08-10 (Rachel): finish the engine.**

Persist `page_config.ats`, and surface the proposal accept/decline UI the library already
supports. The hard logic is written and unit-tested (`ats-review.test.ts`); the work is
persistence plus UI.

One shape change is required before anything is written to the database:
`AtsTargeting.jobDescription` is a single string ([types/resume.ts:151-156](../src/types/resume.ts#L151)),
so the model only holds one target role. A job seeker checking the same résumé against three
open roles is the main use case. Migrate to an array of saved target roles *first* — changing
it after rows exist means a data migration for no reason.

### 1.4 Testimonials have a workflow that doesn't exist · **S (copy) / L (real)**

`TestimonialStatus = "draft" | "requested" | "approved"` with a `requested_at` timestamp
([types/resume.ts:18-30](../src/types/resume.ts#L18)), exposed in the editor as a `<select>`
with an option literally labelled **"Requested · hidden"** and a date picker
([ResumeEditorFields.tsx:904-915](../src/components/resume/ResumeEditorFields.tsx#L904)).

There is no request mechanism. No email to the referee, no approval link, no token, no
verification. The public page renders only `status === "approved"`
([living-page-sections.ts:31-40](../src/lib/living-page-sections.ts#L31)) — so the user types
someone else's quote, attributes it to them by name, role, and company, and marks it approved
themselves.

Beyond being a hollow feature, this is the one place in the product that invites a user to
publish an attributed statement no one made. On a page whose entire value is credibility with
recruiters, that's worth taking seriously.

**Decided 2026-08-10 (Rachel): drop the verification framing.**

Reduce testimonials to a plain quote + attribution field. Concretely:

- Remove the `status` / `requested_at` / `approved_at` controls and the "Collect and approve
  quotes here" framing from the editor
  ([ResumeEditorFields.tsx:795-930](../src/components/resume/ResumeEditorFields.tsx#L795)).
- **Keep `status === "approved"` as the render gate**
  ([living-page-sections.ts:31-40](../src/lib/living-page-sections.ts#L31)), and re-frame it
  in the UI as a plain "show this on my page" switch.

  An earlier draft of this plan had the migration risk backwards. Loosening the gate to
  "has a name and a quote" does not hide anything — it **publishes every quote an owner had
  deliberately kept as draft or requested**, without them touching a thing. Keeping the gate
  and re-labelling the control means zero behaviour change for existing pages and no
  production data check needed.
- New testimonials default to shown: adding a quote in the editor *is* the act of choosing to
  publish it. The old `draft` default belonged to the workflow being removed.
- `requested` becomes legacy-only — still reads as hidden, nothing writes it.
- Say plainly at the point of entry that nothing is verified with the person quoted, so the
  responsibility sits where it belongs.

This unblocks 1.4 from the email work entirely; it ships in Stage 2.

---

## Tier 2 — Controls the user needs and doesn't have

### 2.1 There is no way to unpublish · **M**

`PageRecord` supports `status: draft | live | archived` and
`visibility: private | link | public` ([types/resume.ts:289-290](../src/types/resume.ts#L289)).

The only writer is `PublishPageButton`, which sets `status: "live", visibility: "public"`
([PublishPageButton.tsx:38-39](../src/components/PublishPageButton.tsx#L38)). **Nothing sets
them back.** `PATCH /api/pages/[pageId]` isn't wired to it from any UI; settings has Profile,
Change password, Access, and Danger zone → *delete account* — no page visibility control.

To take a page down, the user must **delete it** (`DeletePageButton` →
`DELETE /api/pages/[pageId]`), destroying the content and the analytics history.

This is worse than it looks, because the offline state is already built and unreachable:

`getAccountAccessState` has three return paths and **all three** end in
`grantUniversalFreeAccess`, which hardcodes `publicHostingAllowed: true`
([account-access.ts:67,117,158,200](../src/lib/account-access.ts#L55)). So
`isPubliclyAvailablePage`, `syncPageHostingState`, `getOfflinePageContext`, the
`page.offline_view_attempted` event, the dashboard's offline-attempt surfacing, and the whole
"This page is offline right now" branch on `/[username]`
([[username]/page.tsx:161-214](../src/app/[username]/page.tsx#L161)) are **dead paths**. Its
CTA — *"Turn hosting back on from your settings"* — links to a settings page with no such
control.

**Do:** repoint that machinery at user intent instead of billing state. A "Page visibility"
control in settings with three states — **Public** (indexed), **Link only** (live, not
indexed, not in sitemap), **Offline** (reserved URL, offline screen) — reuses the offline
render, the reserved-slug promise, and `syncPageHostingState` almost as written. The copy
already says the right thing: *"The URL stays reserved so the page can come back without
changing the link."*

### 2.2 No opt-out of search indexing · **S**

Every `status = "live"` page with public-or-null visibility is pushed to `sitemap.xml`
([living-page-sitemap.ts:41-43](../src/lib/seo/living-page-sitemap.ts#L41)) and carries
`ProfilePage` + `Person` JSON-LD. There is no per-page `noindex`.

For the core persona — someone employed, quietly looking — the product publishes their job
search to Google by default with no switch. Right now there is no quiet mode at all: you are
indexed, or you are deleted.

**Do:** fold into 2.1 as the "Link only" state. Small work once visibility exists: exclude
from the sitemap query, emit `robots: { index: false }` in `generateMetadata`.

### 2.3 The PDF cannot be previewed before download · **S**

`DownloadResumeButton` posts to `/api/resume/export` and triggers a file download. There is
no `PDFViewer` anywhere in the codebase.

The user is told their PDF is ATS-safe and one page, and the readiness card scores exactly
that (`AtsExportCheck` carries `pageCount`, `fitsOnOnePage`, `overflowReasons`) — but they
can never see the artifact a recruiter receives without downloading it and opening it
outside the app. The overflow reasons the engine computes stay invisible.

**Do:** render the export in a preview panel in the ATS section, with the page-count and
overflow findings shown against it.

### 2.4 No contact action on the public page · **S**

`PublicPageActionDock` offers two things: Download Résumé PDF and Share Card
([PublicPageActionDock.tsx:80-104](../src/components/PublicPageActionDock.tsx#L80)). Contact
details are passive chips in the résumé header — a `mailto:` and link icons
([ResumeLayout.tsx:123-199](../src/components/ResumeLayout.tsx#L123)).

A recruiter who reaches the bottom of a page they like has no action to take. The dock — the
one element pinned in view the entire scroll — never offers "get in touch."

**Do:** add a contact action to the dock when `data.email` exists. It also closes an analytics
loop: `data-analytics-target-key="email"` is already tracked, so contact intent becomes
measurable per variant.

---

## Tier 3 — Friction that costs completion

### 3.1 The editor has no server-side autosave · **M**

`PageEditorClient` saves only on an explicit "Save changes" click
([PageEditorClient.tsx:369-375](../src/components/edit/PageEditorClient.tsx#L369)).
`useLocalDraft` writes to localStorage; `useUnsavedChanges` warns on navigation.

The form is 13 numbered sections. Work survives a refresh on the same browser and is lost on
a different device, a cleared profile, or a closed-tab-past-the-warning. Two paths are gated
behind saving first — *"Save your changes to copy the live link"* — so the user hits the
friction at exactly the moment they want to share.

The building blocks are there (`persistPage` takes explicit args, `latestEditorSnapshotRef`
already handles the save-raced-an-edit case). This is a debounce and a status line, not a
rewrite.

### 3.2 Résumé import has no correction loop · **M**

[`resume-import.ts`](../src/lib/resume-import.ts) (571 lines) is a hand-rolled line parser:
`looksLikeName`, `looksLikeContact`, `splitHeaderParts`, `assignTitleAndCompany`,
`headerCandidatesBefore`. Reasonable heuristics — and they will misfire on two-column PDFs,
unusual date formats, and non-US résumé conventions.

When they misfire, the recovery is: the raw text is parked in a `<details>` and the user
compares it against a 6-step form by eye
([create/page.tsx:670-693](../src/app/(app)/create/page.tsx#L670)). `ParsedResumeImport`
already carries a `detectedFields` list, but there's no per-field confidence, no "re-parse
this section," no field-mapping step.

First impression of the product is this parse. When it's wrong, the user's conclusion is
"this thing doesn't understand my résumé," and the fix is a scavenger hunt.

**Do:** a post-import confirmation step that shows each detected field next to the source
line it came from, with per-field accept/edit. Reuse `detectedFields`; no new parsing.

### 3.3 First value requires signup, email confirmation, and a 6-step form · **Rachel's call**

The path to seeing your own content on a page is: signup → confirm email → 6 guided steps
(`TOTAL_STEPS = 6`, [GuidedFlow.tsx:51](../src/components/create/GuidedFlow.tsx#L51)) →
review → publish. `/examples` shows other people's canned demos.

The one moment that sells this product — *your* résumé rendered in a live theme — sits behind
the longest part of the funnel.

**The decision splits cleanly in two, and the halves have very different risk.**

#### Paste-only, rendered client-side · **S, near-zero risk**

`parseResumeText` ([resume-import.ts:519](../src/lib/resume-import.ts#L519)) is pure
TypeScript — string and regex work, no Node built-ins, no I/O. It can run in the browser
unchanged. `ThemeCanvas` + `ResumeLayout` already render entirely client-side from a
`ResumeData` object.

So a paste-only preview needs **no endpoint, no rate limit, no CAPTCHA, and no new abuse
surface.** Nothing leaves the browser until the user signs up — which is also a genuinely
strong privacy claim to put on the page, and consistent with the existing "no AI service
reads your résumé" promise.

Only two small things are needed to hand the result off through signup:

1. The create draft key is user-scoped and null until the user loads —
   `mlp-draft-create-${currentUserId}` ([create/page.tsx:148](../src/app/(app)/create/page.tsx#L148)).
   An anonymous key plus a claim-on-first-load step is required.
2. A post-signup restore path. One already exists and is close in shape: the
   returned-from-checkout branch that waits for both `createDraftKey` and `draftHydrated`
   before restoring ([create/page.tsx:342-376](../src/app/(app)/create/page.tsx#L342)).

#### File upload (PDF/DOCX) unauthenticated · **M, real exposure**

This is the half that carries risk, because extraction is Node-only and server-side:

- **Synchronous CPU on the request thread.** `extractResumeFileText` uses `inflateSync` /
  `inflateRawSync` plus regex-heavy PDF stream decoding
  ([resume-file.ts:281-343](../src/lib/resume-file.ts#L281)). Every concurrent request blocks
  a Node worker. It is *well* hardened against zip bombs —
  `MAX_EXPANDED_DOCUMENT_BYTES = 12MB`, `MAX_PDF_STREAMS = 256`, `maxOutputLength` on every
  inflate — but the shape is still small-upload-to-large-CPU amplification.
- **The rate limit doesn't apply.** `resume_import` is `scope: "user"`
  ([rate-limit.ts:76-81](../src/lib/security/rate-limit.ts#L76)); anonymous callers have no
  user. A new IP-scoped policy is required, and IP scoping is much weaker.
- **Turnstile isn't wired outside Supabase Auth.** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` feeds
  Supabase's CAPTCHA config for signup. Challenging a public parse endpoint means integrating
  Turnstile directly for the first time.

**Recommendation:** ship the paste-only preview, keep file upload behind signup. It captures
most of the value at a fraction of the risk, and the upload path stays available immediately
after signup where it's already rate-limited correctly.

#### One sequencing constraint

A pre-signup preview puts the **least reliable** part of the product in the **first**
impression. The parser is heuristic (3.2), and when it misreads a two-column PDF the visitor's
conclusion is "this doesn't understand my résumé" — with no account, no investment, and no
reason to stay and fix it. Land 3.2's correction loop before or alongside this, not after.

---

## Tier 4 — Speed, where users feel it

### 4.1 The public page is fully dynamic on every view · **M**

`/[username]` sets `export const dynamic = "force-dynamic"` and calls `noStore()` in both
`generateMetadata` and the page body ([[username]/page.tsx:42,107,155](../src/app/[username]/page.tsx#L42)).
Each recruiter visit does a cold server render with sequential Supabase round trips:
`getPublicPage` → `auth.getUser()` → `fetchProfileWithHostingAccess`.

This is the page the product is judged on, rendered the slowest way available. Plan 2's Phase
2 raised this and it hasn't landed.

Note that `fetchProfileWithHostingAccess` here exists **only** to compute
`ownerAccess.publicHostingAllowed` / `analyticsTier` / `shareCardAllowed` — and per 2.1,
`publicHostingAllowed` is now unconditionally `true`. Resolving the dead hosting state removes
a blocking query from the hot path.

**Do:** cache-tag the page and revalidate on publish/save; drop the owner-access query.

### 4.2 The dashboard reads every view row ever recorded · **S**

[dashboard/page.tsx:91-108](../src/app/(app)/dashboard/page.tsx#L91) selects **all**
`page_views` for the user's pages — no date filter, no limit — plus all matching `events`,
then reduces them in JS.

Dashboard TTFB degrades linearly with how successful the user is. The users it slows down
first are the ones the product is working for.

**Do:** bound the query to the widest range the UI renders and aggregate the rest in SQL.

---

## Smaller items

- **Export is PDF-only.** No DOCX or plain text; some ATS portals require one of them.
- **Dates render in the viewer's locale**, not the owner's — ~12 unparameterized
  `toLocaleDateString`/`Intl` call sites. A recruiter in Berlin and the owner in Boston see
  different dates for the same event.
- **No optimistic concurrency on save.** `PATCH /api/pages/[pageId]` is a full-object write;
  two tabs means last-writer-wins silently. `latestEditorSnapshotRef` catches this within one
  tab only.
- **`AtsTargeting.jobDescription` is a single string.** Even with 1.3(a) persistence, the
  shape only holds one target role — it should be an array before it's written to the DB.

---

## Sequencing

Ordered so each stage unblocks the next, not by tier.

**Stage 1 — Make the promise true (~1.5 weeks)**
1. Email provider + notification preferences (1.1)
2. First-view and repeat-visitor emails (1.1)
3. Interim: fix the create-success copy today, before the rest lands

**Stage 2 — Give back the controls (~1 week)**
4. Page visibility: Public / Link only / Offline (2.1 + 2.2) — reuses the dead hosting path
5. Variant management in the editor (1.2)
6. Testimonials reduced to quote + attribution (1.4) — **check production data first**, the
   render gate changes
7. Contact action in the public dock (2.4)

**Stage 3 — Finish the ATS engine (~1 week)**
8. Migrate `AtsTargeting` to an array of saved target roles — **before** any persistence
9. Persist `page_config.ats` through the existing PATCH path
10. Surface the proposal accept/decline UI `ats-review.ts` already supports
11. PDF preview in the ATS section (2.3)

**Stage 4 — Reduce the friction (~1 week)**
12. Editor autosave (3.1)
13. Import confirmation step (3.2)
14. Public-page caching + dashboard query bounds (4.1, 4.2) — 4.1 gets easier after step 4

**Stage 5 — Optional, gated on 3.2 landing**
15. Paste-only pre-signup preview (3.3), if Rachel wants it

---

## Decisions

**Settled 2026-08-10:**

1. **ATS: finish the engine.** (1.3) → Stage 3.
2. **Testimonials: drop the verification framing.** (1.4) → Stage 2.

**Still open:**

3. **Pre-signup preview?** (3.3) — recommendation is paste-only, client-side, gated on 3.2
   landing first. File upload stays behind signup.
4. **Notification defaults** (1.1) — recommendation below.

### Recommended notification defaults

| Notification | Default | Why |
|---|---|---|
| First qualified view of a page | **On** | This is the promise. Fire from the engagement threshold (1.1a), not the view insert. |
| Repeat visitor returns | **On** | Highest-signal event in the product — a recruiter coming back is the real buying signal, and `repeatViewAlert` already computes it. |
| Every view | **Not offered** | The 24h dedupe bounds volume, but per-view mail trains people to filter the sender. |
| Weekly digest | **On** | Safety net. Carries the value even for users who mute the per-event mail. |

Sizing the commitment: with owner-exclusion, 24h dedupe, and first-view-only, a job seeker
running 20 applications lands somewhere around 5–15 emails a week. Volume isn't the real
commitment here — **accuracy and latency are.** A digest-only default is the safe-looking
choice that quietly breaks the promise the homepage makes.

Two operational prerequisites, neither of them optional:

- **DNS and sending reputation.** `mylivingpage.com` has no transactional sender today.
  SPF/DKIM/DMARC need setting up, ideally on a dedicated subdomain, and Supabase Auth is
  already sending from the domain — the two must be coordinated so auth mail doesn't get
  caught in a new sender's cold-start reputation.
- **Preference centre + one-click unsubscribe.** These are arguably transactional (user's own
  data, user-initiated), but a first-view alert sits close enough to the line that the
  unsubscribe path and a privacy-policy update should ship with it rather than after.

---

## What this plan deliberately excludes

- The design-system consistency batch from the Aug 3–8 audit (label tracking, container
  widths, two footers, eyebrow drift). Real, but presentation, not functionality — raise as
  one pass per the existing note.
- Plan 1 and Plan 2 items that remain open on their own merits (RLS staging, billing
  excision, dependency ladder).
- Theme and share-card art direction.
- The three known screenshot artifacts — homepage-blank-below-hero, fixed-chrome overlap,
  truncated mobile rail. Verified non-bugs; do not re-investigate.

---

## Execution record

Branch `user-functionality-plan-3`, twelve commits off `main` @ `0e54e76`. Typecheck, ESLint
(`--max-warnings=0`), 975 unit tests, the client-security and Signal Frame checks, a
production build, and 24 Playwright specs all pass.

Two reviews by Grok ran against the work. Both found real defects; the fixes are recorded
below rather than folded silently into the feature commits.

### What shipped

| Plan item | Commit | Note |
| --- | --- | --- |
| 1.1 Notifications | `fbaaf22`, `6f40a5c` | Engagement-triggered, per-owner cap, digest cron |
| 1.2 Variants in the editor | `9f02fb3` | Planner moved out of `create/` unchanged |
| 1.3 ATS engine | `4061b51` | Saved roles + proposal accept/decline |
| 1.4 Testimonials | `2c569b5` | Display switch, render gate unchanged |
| 2.1 / 2.2 Visibility | `0ec603c`, `2eed702` | Public / Link only / Offline |
| 2.3 PDF preview | `d49ec0d` | New `/api/resume/preview` |
| 2.4 Contact action | `df0cf1d` | Reuses existing analytics target key |
| 3.1 Autosave | `f5b5e63` | 2.5s debounce, e2e-verified |
| 3.2 Import provenance | `1e4dc78` | Value shown beside its source line |
| 3.3 Pre-signup preview | `64cd786` | Paste-only, client-side |
| 4.1 / 4.2 Performance | `43121d9` | Bounded dashboard reads, one query removed |

### Where the implementation departed from this plan

**Link-only does not use `visibility = 'link'`.** The plan assumed that enum value was free.
It is not: `pages_link_requires_share_token_chk` requires a `share_token_hash` alongside it, a
trigger raises without one, and a token-matching RPC reads it back. Writing `'link'` would
have failed at the database in production while passing every test that never touched the
constraint. Indexability is now its own column, `search_indexable`, so link-only pages stay
`visibility = 'public'` and every existing RLS and storage policy is untouched. Caught in
review (`2eed702`).

**`page_config.ats` stores targeting, not `AtsReviewSnapshot`.** The snapshot type carries
`candidateResumeData` and `approvedResumeData`, so persisting it literally would copy the
whole résumé into `page_config` two or three times against a 256 KB ceiling. The review is
deterministic and cheap to recompute, so only what the owner typed and chose is stored.
Legacy snapshots are read for their single job description, which becomes the first saved
role.

**Notifications fire from engagement, with no artificial delay.** The plan proposed a ~2
minute delay so engagement could land before sending. Triggering from the engagement beacon
itself makes that unnecessary — the dwell data already exists at that point.

**The testimonial render gate did not change.** The plan had the migration risk backwards; see
1.4 above. Loosening the gate would have published quotes owners had deliberately hidden.

### Fixed after review

Six on the notification system (`6f40a5c`): scroll depth alone qualified a view, and a page
whose content fits the viewport reports 100% depth on load — so the scanner filter had a hole
the size of every short page. Also: a claimed row was never released on provider failure; the
digest could double-send on a retried cron; Resend was awaited with no timeout inside a public
beacon; there was no per-owner ceiling against forged engagement; and GET unsubscribe muted on
sight, which link scanners would trip.

Four on stages 2–3 (`2eed702`): the visibility collision above, a draft restore that read
"absent" as "empty" and wiped saved versions and target roles, an ATS write-back that
clobbered role edits made during a check, and a PDF preview that could reattach a render
finished after the résumé changed.

Two on stages 4–5 (`b0f3fa8`): the dashboard row cap I added to fix 4.2 introduced its own
reporting bugs — a shared 2000-row budget let one busy page starve a quieter one of its rows
entirely, undercounted any page with more views in the window than the cap, and truncated the
scan that finds the first view after a share. Bounding by time per page, with an exact
last-viewed lookup, keeps the speed win without the truncation. And the pre-signup draft key
cannot be account-scoped — no account exists yet — so on a shared machine the next person to
sign in would have inherited the previous visitor's résumé; it now expires after two hours.

### Still outstanding

**Ops, before notifications can send:**
- `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`, `CRON_SECRET` in Vercel Production. Without the
  key the pipeline runs end to end and skips delivery, so preview and CI never mail anyone.
- SPF/DKIM/DMARC for the sending domain, ideally a dedicated subdomain, coordinated with the
  Supabase Auth sender already on `mylivingpage.com`.
- Apply `20260810120000_view_notifications.sql` and `20260810130000_page_search_indexable.sql`.

**Rachel's call:**
- Where `/try` belongs in the homepage and nav. It is currently reachable from the sitemap and
  a link on `/signup` only — placement is art direction, and the homepage was deliberately cut
  to four chapters in `850c02f`.
- Whether the privacy policy needs a notifications clause before the first email sends.

**Known gap, not addressed:** the résumé parser does not handle title, company, and dates on a
single line — a common layout. 3.2 makes the gap visible rather than closing it; the section
is simply absent from "What we read" instead of being silently wrong.
