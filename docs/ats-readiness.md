# Deterministic ATS Readiness

MyLivingPage's ATS readiness check is a local, rule-based review. It does not call an AI or resume-scoring provider, rewrite a user's content, or decide whether a resume may be published or downloaded.

## Product boundary

The check supports the product promise by verifying practical, observable qualities:

- the production PDF renderer can build the resume;
- essential identity, contact, and experience information is present;
- common resume-writing problems are surfaced with specific fixes;
- role-specific terms can be compared when a user optionally supplies a job description.

It cannot predict an employer's ranking model, guarantee that every ATS will parse a file identically, or promise an interview. That limitation is shown in the product UI and public product copy.

## Data flow and privacy

1. The user explicitly selects **Check ATS readiness**. The check does not run automatically.
2. The authenticated client sends the current resume and any optional comparison text to `/api/resume/readiness`.
3. The endpoint normalizes the resume, runs the same primary PDF export check used by the resume renderer, and evaluates deterministic rules in `src/lib/ats-readiness.ts`.
4. The result is returned to the browser. The resume, target title, job description, and result are not written to the database or application logs by this flow.

The endpoint uses a user-scoped rate limit, accepts no more than 200 KB per request, and limits optional job descriptions to 20,000 characters. These controls bound server work without creating a third-party per-check charge.

## Statuses and scoring

- `not_ready`: at least one critical structural requirement failed.
- `needs_attention`: no critical failure exists, but one or more warnings remain.
- `ready`: all critical and warning checks pass. Informational guidance, such as a multi-page PDF notice, may still appear.

Category scores begin at 100 and subtract the points shown on failed checks. The overall score uses these fixed weights:

- Essentials: 35%
- Content: 30%
- Searchability: 20%
- PDF structure: 15%

Multiple pages alone never make a resume fail. Optional job-description checks affect the score only when the user supplies comparison text.

## Safe maintenance

When changing a rule:

1. Keep it observable and deterministic.
2. Give every deduction a visible failed check and a practical suggested fix.
3. Do not infer protected characteristics or invent experience, skills, keywords, or outcomes.
4. Add or update focused tests in `src/lib/ats-readiness.test.ts`.
5. Keep the API authenticated, bounded, rate-limited, and provider-free.

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` before release.
