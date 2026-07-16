"use client";

import { useMemo, useState } from "react";
import {
  getAtsFixFieldKey,
  resolveAtsFixTarget,
  type AtsFixTarget,
} from "@/lib/ats-fix-target";
import {
  buildAtsReadinessFingerprint,
  type AtsReadinessCheck,
  type AtsReadinessResult,
} from "@/lib/ats-readiness";
import type { ResumeData } from "@/types/resume";

export interface AtsReadinessCompletedCheck {
  comparisonKey: string;
  fingerprint: string;
  readiness: AtsReadinessResult;
}

export interface AtsReadinessReviewState {
  targetTitle: string;
  jobDescription: string;
  completedCheck: AtsReadinessCompletedCheck | null;
}

interface AtsReadinessCardProps {
  resumeData: ResumeData;
  reviewState?: AtsReadinessReviewState;
  onReviewStateChange?: (next: AtsReadinessReviewState) => void;
  onFixRequested?: (target: AtsFixTarget, check: AtsReadinessCheck) => void;
}

interface IssueListProps {
  checks: AtsReadinessCheck[];
  resumeData: ResumeData;
  onFixRequested?: AtsReadinessCardProps["onFixRequested"];
  startAt?: number;
  tone: "required" | "recommended";
}

const EMPTY_REVIEW_STATE: AtsReadinessReviewState = {
  targetTitle: "",
  jobDescription: "",
  completedCheck: null,
};

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function describePdf(readiness: AtsReadinessResult) {
  if (!readiness.pdf.renderable) {
    return "The PDF could not be created during this check. Your resume information is still safe.";
  }

  if (readiness.pdf.pageCount === null) {
    return "The PDF was created, but its page count was unavailable.";
  }

  const pageLabel = `${readiness.pdf.pageCount} ${
    readiness.pdf.pageCount === 1 ? "page" : "pages"
  }`;

  return readiness.pdf.fitsOnOnePage
    ? `The PDF was created successfully and fits on ${pageLabel}.`
    : `The PDF was created successfully and is ${pageLabel}. Multiple pages can still be ATS-readable.`;
}

function IssueList({
  checks,
  resumeData,
  onFixRequested,
  startAt = 1,
  tone,
}: IssueListProps) {
  return (
    <ol start={startAt} className="mt-4 space-y-3">
      {checks.map((check, index) => {
        const target = resolveAtsFixTarget(check, resumeData);
        const required = tone === "required";

        return (
          <li
            key={check.id}
            className={`rounded-2xl border p-4 sm:p-5 ${
              required
                ? "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.06)]"
                : "border-[rgba(59,130,246,0.16)] bg-[rgba(59,130,246,0.05)]"
            }`}
          >
            <div className="flex gap-3">
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  required
                    ? "bg-[rgba(245,158,11,0.15)] text-[#FDE68A]"
                    : "bg-[rgba(59,130,246,0.14)] text-[#BFDBFE]"
                }`}
              >
                {startAt + index}
              </span>
              <div className="min-w-0 flex-1">
                <h5 className="font-medium text-[#F0F4FF]">{check.title}</h5>
                <p className="mt-1.5 text-sm leading-6 text-[rgba(240,244,255,0.64)]">
                  {check.detail}
                </p>
                {check.suggestedFix ? (
                  <div className="mt-3 rounded-xl bg-[rgba(6,14,28,0.34)] px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#93C5FD]">
                      How to improve it
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-[rgba(232,242,255,0.76)]">
                      {check.suggestedFix}
                    </p>
                    {check.example ? (
                      <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.5)]">
                        <span className="font-semibold text-[rgba(240,244,255,0.68)]">Example:</span>{" "}
                        {check.example}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {target && onFixRequested ? (
                  <button
                    type="button"
                    onClick={() => onFixRequested(target, check)}
                    data-ats-fix-target={getAtsFixFieldKey(target)}
                    className="mt-3 rounded-full border border-[rgba(96,165,250,0.32)] bg-[rgba(59,130,246,0.1)] px-4 py-2 text-xs font-semibold text-[#BFDBFE] transition-colors hover:border-[rgba(147,197,253,0.52)] hover:bg-[rgba(59,130,246,0.16)]"
                  >
                    {target.actionLabel}
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function AtsReadinessCard({
  resumeData,
  reviewState,
  onReviewStateChange,
  onFixRequested,
}: AtsReadinessCardProps) {
  const [localReviewState, setLocalReviewState] = useState<AtsReadinessReviewState>(
    EMPTY_REVIEW_STATE,
  );
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const activeReviewState = reviewState ?? localReviewState;

  const updateReviewState = (next: AtsReadinessReviewState) => {
    if (onReviewStateChange) {
      onReviewStateChange(next);
      return;
    }
    setLocalReviewState(next);
  };

  const fingerprint = useMemo(
    () => buildAtsReadinessFingerprint(resumeData),
    [resumeData],
  );
  const comparisonKey = useMemo(
    () =>
      JSON.stringify([
        activeReviewState.targetTitle.trim(),
        activeReviewState.jobDescription.trim(),
      ]),
    [activeReviewState.jobDescription, activeReviewState.targetTitle],
  );
  const completedCheck = activeReviewState.completedCheck;
  const resultIsCurrent =
    completedCheck?.fingerprint === fingerprint &&
    completedCheck.comparisonKey === comparisonKey;
  const readiness = completedCheck?.readiness ?? null;
  const hasStaleResult = Boolean(completedCheck && !resultIsCurrent);

  const orderedImprovements = useMemo(
    () =>
      readiness
        ? [...readiness.improvements].sort(
            (left, right) => right.pointsDeducted - left.pointsDeducted,
          )
        : [],
    [readiness],
  );
  const visibleImprovements = readiness?.criticalFixes.length
    ? []
    : orderedImprovements.slice(0, 3);
  const deferredImprovements = readiness?.criticalFixes.length
    ? orderedImprovements.slice(0, 3)
    : orderedImprovements.slice(3);
  const remainingDeferredImprovements = readiness?.criticalFixes.length
    ? orderedImprovements.slice(3)
    : [];

  const runCheck = async () => {
    if (checking) {
      return;
    }

    const requestedFingerprint = fingerprint;
    const requestedComparisonKey = comparisonKey;
    const trimmedTargetTitle = activeReviewState.targetTitle.trim();
    const trimmedJobDescription = activeReviewState.jobDescription.trim();

    setChecking(true);
    setError("");

    try {
      const response = await fetch("/api/resume/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData,
          ...(trimmedTargetTitle ? { targetTitle: trimmedTargetTitle } : {}),
          ...(trimmedJobDescription ? { jobDescription: trimmedJobDescription } : {}),
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        readiness?: AtsReadinessResult;
      } | null;

      if (response.status === 401) {
        throw new Error(
          "Your session expired. Sign in again, then rerun the check. Your resume changes are still safe.",
        );
      }

      if (!response.ok || !body?.readiness) {
        throw new Error(body?.error ?? "The resume check could not be completed.");
      }

      updateReviewState({
        ...activeReviewState,
        completedCheck: {
          comparisonKey: requestedComparisonKey,
          fingerprint: requestedFingerprint,
          readiness: body.readiness,
        },
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The resume check could not be completed.",
      );
    } finally {
      setChecking(false);
    }
  };

  const requiredCount = readiness?.summary?.requiredFixCount ?? readiness?.criticalFixes.length ?? 0;
  const recommendationCount =
    readiness?.summary?.recommendationCount ?? readiness?.improvements.length ?? 0;
  const passedCount = readiness?.summary?.passedCount ?? readiness?.passedChecks.length ?? 0;
  const tailoringChecks = readiness?.tailoringChecks ?? [];
  const keywordCoverageCheck = tailoringChecks.find(
    (check) => check.id === "job-keyword-coverage",
  );
  const hasComparison = Boolean(
    activeReviewState.targetTitle.trim() || activeReviewState.jobDescription.trim(),
  );

  const statusContent = readiness
    ? requiredCount > 0
      ? {
          badge: "Start here",
          heading: `${requiredCount} ${pluralize(requiredCount, "essential")} to finish`,
          body: "Your work is saved. Fix one item at a time, then recheck when you are ready.",
          styles: "border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.08)] text-[#FDE68A]",
        }
      : recommendationCount > 0
        ? {
            badge: "PDF usable",
            heading: `Your essentials are complete`,
            body: `${recommendationCount} optional ${pluralize(recommendationCount, "improvement")} could make the resume clearer or easier to search.`,
            styles: "border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.07)] text-[#BFDBFE]",
          }
        : {
            badge: "Ready to download",
            heading: "No essential issues were found",
            body: "Your contact details, experience structure, searchable content, and PDF passed the current checks.",
            styles: "border-[rgba(91,214,124,0.28)] bg-[rgba(91,214,124,0.08)] text-[#9BEDAF]",
          }
    : null;

  return (
    <section
      id="ats-readiness"
      aria-labelledby="ats-readiness-title"
      className="scroll-mt-24 rounded-2xl border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.07)] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">
            Resume check
          </p>
          <h3
            id="ats-readiness-title"
            className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]"
          >
            Make your resume easier to scan
          </h3>
          <p className="mt-3 text-sm leading-7 text-[rgba(232,242,255,0.76)]">
            We’ll check for missing essentials, clearer experience writing, useful role language,
            and a readable PDF. No AI is used, and nothing from this check is saved.
          </p>
        </div>

        <button
          type="button"
          disabled={checking}
          onClick={() => void runCheck()}
          className="gold-pill min-w-48 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all hover:shadow-[0_10px_36px_rgba(59,130,246,0.3)] disabled:cursor-wait disabled:opacity-60"
        >
          {checking
            ? "Checking..."
            : hasStaleResult
              ? "Recheck my changes"
              : readiness
                ? "Check again"
                : "Check my resume"}
        </button>
      </div>

      <details className="mt-5 rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.03)] p-4">
        <summary className="cursor-pointer text-sm font-medium text-[#BFDBFE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]">
          Tailoring this for a job? Compare a posting
        </summary>
        <div className="mt-4 grid gap-4">
          <p className="text-xs leading-5 text-[rgba(240,244,255,0.52)]">
            This optional writing aid finds frequently repeated terms. It does not change your
            general readiness result or predict whether an employer will consider you a match.
          </p>
          <label className="grid gap-2 text-sm text-[rgba(240,244,255,0.72)]">
            Target job title
            <input
              type="text"
              disabled={checking}
              value={activeReviewState.targetTitle}
              maxLength={160}
              onChange={(event) =>
                updateReviewState({ ...activeReviewState, targetTitle: event.target.value })
              }
              placeholder="Example: Product Marketing Manager"
              className="w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(3,10,22,0.7)] px-4 py-3 text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.3)] focus:border-[#3B82F6] focus:outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[rgba(240,244,255,0.72)]">
            Job posting
            <textarea
              disabled={checking}
              value={activeReviewState.jobDescription}
              maxLength={20_000}
              onChange={(event) =>
                updateReviewState({ ...activeReviewState, jobDescription: event.target.value })
              }
              placeholder="Paste the responsibilities and qualifications you want to compare."
              rows={5}
              className="w-full resize-y rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(3,10,22,0.7)] px-4 py-3 text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.3)] focus:border-[#3B82F6] focus:outline-none"
            />
          </label>
          <p className="text-xs leading-5 text-[rgba(240,244,255,0.5)]">
            The posting is used only for this check and is not stored.
          </p>
        </div>
      </details>

      <div aria-live="polite" className="mt-5 space-y-3">
        {checking ? (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-[rgba(59,130,246,0.18)] bg-[rgba(6,14,28,0.3)] px-4 py-3 text-sm text-[#BFDBFE]"
          >
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(147,197,253,0.24)] border-t-[#93C5FD]"
            />
            Building and checking your PDF...
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-[rgba(255,120,120,0.3)] bg-[rgba(255,120,120,0.08)] px-4 py-3 text-sm text-[#FFB4B4]"
          >
            {error}
          </p>
        ) : null}

        {hasStaleResult && !checking ? (
          <p className="rounded-xl border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.07)] px-4 py-3 text-sm leading-6 text-[#FDE68A]">
            You’ve made changes. Keep using the checklist below, then recheck when you’re ready.
          </p>
        ) : null}
      </div>

      {readiness && statusContent ? (
        <div className="mt-5 space-y-5" data-ats-result-stale={hasStaleResult ? "true" : "false"}>
          <div role="status" className={`rounded-2xl border p-4 sm:p-5 ${statusContent.styles}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">
              {statusContent.badge}
            </p>
            <h4 className="mt-2 font-heading text-xl font-semibold text-[#F0F4FF]">
              {statusContent.heading}
            </h4>
            <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.7)]">
              {statusContent.body}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[rgba(240,244,255,0.66)]">
              {passedCount > 0 ? (
                <span className="rounded-full border border-[rgba(91,214,124,0.2)] bg-[rgba(91,214,124,0.07)] px-3 py-1.5 text-[#B7F4C4]">
                  {passedCount} {pluralize(passedCount, "check")} look good
                </span>
              ) : null}
              {recommendationCount > 0 ? (
                <span className="rounded-full border border-[rgba(147,197,253,0.18)] bg-[rgba(59,130,246,0.06)] px-3 py-1.5 text-[#BFDBFE]">
                  {recommendationCount} optional {pluralize(recommendationCount, "suggestion")}
                </span>
              ) : null}
            </div>
          </div>

          {readiness.criticalFixes.length > 0 ? (
            <section aria-labelledby="ats-required-fixes">
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#FDE68A]">
                Do these before sending
              </p>
              <h4 id="ats-required-fixes" className="mt-1 font-heading text-xl text-[#F0F4FF]">
                Start with the essentials
              </h4>
              <IssueList
                checks={readiness.criticalFixes}
                resumeData={resumeData}
                onFixRequested={onFixRequested}
                tone="required"
              />
            </section>
          ) : null}

          {visibleImprovements.length > 0 ? (
            <section aria-labelledby="ats-optional-polish">
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#93C5FD]">
                Optional polish
              </p>
              <h4 id="ats-optional-polish" className="mt-1 font-heading text-xl text-[#F0F4FF]">
                Choose the improvements that help you
              </h4>
              <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
                These are writing suggestions, not requirements. Never add a claim, number, or
                skill that is not accurate.
              </p>
              <IssueList
                checks={visibleImprovements}
                resumeData={resumeData}
                onFixRequested={onFixRequested}
                tone="recommended"
              />
            </section>
          ) : null}

          {deferredImprovements.length > 0 ? (
            <details className="rounded-xl border border-[rgba(59,130,246,0.16)] bg-[rgba(59,130,246,0.04)] p-4">
              <summary className="cursor-pointer text-sm font-medium text-[#BFDBFE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]">
                See {orderedImprovements.length - visibleImprovements.length} optional {pluralize(orderedImprovements.length - visibleImprovements.length, "improvement")}
              </summary>
              <IssueList
                checks={deferredImprovements}
                resumeData={resumeData}
                onFixRequested={onFixRequested}
                startAt={readiness.criticalFixes.length + visibleImprovements.length + 1}
                tone="recommended"
              />
              {remainingDeferredImprovements.length > 0 ? (
                <details className="mt-4 rounded-xl border border-[rgba(147,197,253,0.16)] bg-[rgba(6,14,28,0.24)] p-3.5">
                  <summary className="cursor-pointer text-sm font-medium text-[rgba(191,219,254,0.82)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]">
                    See {remainingDeferredImprovements.length} more optional {pluralize(remainingDeferredImprovements.length, "suggestion")}
                  </summary>
                  <IssueList
                    checks={remainingDeferredImprovements}
                    resumeData={resumeData}
                    onFixRequested={onFixRequested}
                    startAt={readiness.criticalFixes.length + deferredImprovements.length + 1}
                    tone="recommended"
                  />
                </details>
              ) : null}
            </details>
          ) : null}

          {hasComparison && tailoringChecks.length > 0 ? (
            <section className="rounded-2xl border border-[rgba(147,197,253,0.2)] bg-[rgba(147,197,253,0.05)] p-4 sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#93C5FD]">
                Role language check
              </p>
              <h4 className="mt-1 font-heading text-xl text-[#F0F4FF]">
                Compare language without chasing a match score
              </h4>
              <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.6)]">
                Review the terms below. Add one only where it accurately describes your work.
              </p>
              <div className="mt-4 space-y-3">
                {tailoringChecks.map((check) => {
                  const target = resolveAtsFixTarget(check, resumeData);
                  return (
                    <div key={check.id} className="rounded-xl bg-[rgba(6,14,28,0.3)] p-3.5">
                      <p className="font-medium text-[#F0F4FF]">{check.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[rgba(240,244,255,0.6)]">{check.detail}</p>
                      {check.suggestedFix ? (
                        <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.52)]">
                          {check.suggestedFix}
                        </p>
                      ) : null}
                      {target && onFixRequested && !check.passed ? (
                        <button
                          type="button"
                          onClick={() => onFixRequested(target, check)}
                          className="mt-3 rounded-full border border-[rgba(96,165,250,0.3)] px-4 py-2 text-xs font-semibold text-[#BFDBFE]"
                        >
                          {target.actionLabel}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {readiness.keywordCoverage?.missingKeywords.length ? (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2" aria-label="Terms to review">
                    {readiness.keywordCoverage.missingKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full border border-[rgba(147,197,253,0.18)] bg-[rgba(147,197,253,0.08)] px-3 py-1.5 text-xs text-[#BFDBFE]"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                  {onFixRequested && keywordCoverageCheck ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onFixRequested(
                            {
                              section: "skills",
                              field: resumeData.skills.length ? "skills-items" : "skills-add",
                              ...(resumeData.skills.length ? { entryIndex: 0 } : {}),
                              actionLabel: "Review my skills",
                            },
                            keywordCoverageCheck,
                          );
                        }}
                        className="rounded-full border border-[rgba(96,165,250,0.3)] px-4 py-2 text-xs font-semibold text-[#BFDBFE]"
                      >
                        Review my skills
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onFixRequested(
                            {
                              section: "experience",
                              field: resumeData.experience.length
                                ? "experience-highlights"
                                : "experience-add",
                              ...(resumeData.experience.length ? { entryIndex: 0 } : {}),
                              actionLabel: "Review my experience",
                            },
                            keywordCoverageCheck,
                          );
                        }}
                        className="rounded-full border border-[rgba(96,165,250,0.3)] px-4 py-2 text-xs font-semibold text-[#BFDBFE]"
                      >
                        Review my experience
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <details className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
            <summary className="cursor-pointer text-sm font-medium text-[rgba(240,244,255,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]">
              Check details and what already looks good
            </summary>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-[rgba(59,130,246,0.14)] bg-[rgba(59,130,246,0.04)] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#93C5FD]">
                  PDF result
                </p>
                <p className="mt-1.5 text-sm leading-6 text-[rgba(240,244,255,0.68)]">
                  {describePdf(readiness)}
                </p>
              </div>
              {readiness.passedChecks.length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {readiness.passedChecks.map((check) => (
                    <li
                      key={check.id}
                      className="rounded-xl border border-[rgba(91,214,124,0.14)] bg-[rgba(91,214,124,0.04)] px-3.5 py-3 text-sm text-[rgba(224,255,232,0.72)]"
                    >
                      <span aria-hidden="true" className="mr-2 text-[#9BEDAF]">✓</span>
                      {check.title}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </details>

          <p className="text-xs leading-5 text-[rgba(240,244,255,0.45)]">
            {readiness.disclaimer ||
              "This rule-based check cannot predict how every ATS, recruiter, or hiring team will evaluate a resume."}
          </p>
        </div>
      ) : (
        !checking && (
          <p className="mt-5 text-xs leading-5 text-[rgba(240,244,255,0.45)]">
            This check gives practical guidance, not a guarantee about any employer’s system or
            hiring decision.
          </p>
        )
      )}
    </section>
  );
}
