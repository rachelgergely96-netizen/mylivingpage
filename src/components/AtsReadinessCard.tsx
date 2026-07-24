"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildAtsReadinessFingerprint,
  type AtsReadinessCheck,
  type AtsReadinessResult,
} from "@/lib/ats-readiness";
import type { ResumeData } from "@/types/resume";

interface AtsReadinessCardProps {
  resumeData: ResumeData;
}

interface CompletedCheck {
  comparisonKey: string;
  fingerprint: string;
  readiness: AtsReadinessResult;
}

const CATEGORY_LABELS: Array<{
  id: keyof AtsReadinessResult["categoryScores"];
  label: string;
}> = [
  { id: "essentials", label: "Essentials" },
  { id: "content", label: "Content" },
  { id: "searchability", label: "Searchability" },
  { id: "pdf", label: "PDF structure" },
];

const STATUS_CONTENT: Record<
  AtsReadinessResult["status"],
  { badge: string; heading: string; styles: string }
> = {
  ready: {
    badge: "Ready",
    heading: "Your resume passes the current checks",
    styles: "site-status-success",
  },
  needs_attention: {
    badge: "Needs attention",
    heading: "A few changes could make this easier to process",
    styles: "site-status-warning",
  },
  not_ready: {
    badge: "Not ready yet",
    heading: "Fix the essentials before relying on this PDF",
    styles: "site-status-danger",
  },
};

function CheckList({ checks }: { checks: AtsReadinessCheck[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {checks.map((check) => (
        <li
          key={check.id}
          className="border border-site-border bg-site-canvas-alt p-3.5"
        >
          <p className="font-medium text-site-text">{check.title}</p>
          <p className="mt-1.5 text-sm leading-6 text-site-secondary">
            {check.detail}
          </p>
          {check.suggestedFix ? (
            <p className="mt-2 text-sm leading-6 text-site-action-hover">
              <span className="font-semibold">Next step:</span> {check.suggestedFix}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function describePdf(readiness: AtsReadinessResult) {
  if (!readiness.pdf.renderable) {
    return "The PDF could not be rendered.";
  }

  if (readiness.pdf.pageCount === null) {
    return "The PDF rendered, but its page count was unavailable.";
  }

  const pageLabel = `${readiness.pdf.pageCount} ${
    readiness.pdf.pageCount === 1 ? "page" : "pages"
  }`;

  return readiness.pdf.fitsOnOnePage
    ? `${pageLabel} and fits on one page.`
    : `${pageLabel}. A multi-page resume is not automatically an ATS problem.`;
}

const JOB_COMPARISON_CHECK_IDS = new Set([
  "job-keyword-coverage",
  "target-title-present",
]);

function JobComparisonResult({
  jobDescription,
  readiness,
  targetTitle,
}: {
  jobDescription: string;
  readiness: AtsReadinessResult;
  targetTitle: string;
}) {
  const keywordCoverage = readiness.keywordCoverage;
  const targetTitleCheck = readiness.checks.searchability.find(
    (check) => check.id === "target-title-present",
  );
  const hasJobContext = Boolean(targetTitle || jobDescription);

  if (!hasJobContext) {
    return null;
  }

  return (
    <section
      aria-labelledby="ats-job-match-title"
      className="editor-signal-frame relative overflow-hidden border border-site-action bg-[color-mix(in_srgb,var(--site-action)_7%,var(--site-surface))] p-4 sm:p-5"
      data-ats-job-match
    >
      <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-nw" />
      <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-se" />

      <div className="relative">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div>
            <p className="site-eyebrow">Job word match</p>
            <h5
              id="ats-job-match-title"
              className="mt-2 font-site text-xl font-semibold tracking-[-0.03em] text-site-text sm:text-2xl"
            >
              {keywordCoverage
                ? keywordCoverage.keywords.length === 0
                  ? "No specific job terms were found"
                  : `${keywordCoverage.matchedKeywords.length} of ${keywordCoverage.keywords.length} important terms appear in your resume`
                : "Target-title wording checked"}
            </h5>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-site-secondary">
              This is an exact-word comparison, not a prediction of whether an employer will rank or select you.
            </p>
          </div>

          {keywordCoverage && keywordCoverage.keywords.length > 0 ? (
            <div className="border-l border-site-border pl-4 sm:min-w-32 sm:text-right">
              <p className="site-eyebrow text-[9px] text-site-muted">Exact words found</p>
              <p className="editor-signal-count mt-1 font-mono text-3xl font-semibold text-site-action-hover">
                {keywordCoverage.coveragePercent}%
              </p>
              <p className="site-eyebrow mt-1 text-[9px] text-site-muted">
                Not an ATS score
              </p>
            </div>
          ) : null}
        </div>

        {targetTitleCheck ? (
          <div
            className={`mt-5 border px-3 py-3 text-sm ${
              targetTitleCheck.passed
                ? "site-status-success"
                : "site-status-warning text-site-warning"
            }`}
          >
            <p className="font-semibold text-site-text">
              Target title · {targetTitleCheck.passed ? "Exact phrase found" : "Exact phrase not found"}
            </p>
            <p className="mt-1 text-xs leading-5 text-site-secondary">
              {targetTitleCheck.detail}
            </p>
            {!targetTitleCheck.passed && targetTitleCheck.suggestedFix ? (
              <p className="mt-2 text-xs leading-5 text-site-warning">
                {targetTitleCheck.suggestedFix}
              </p>
            ) : null}
          </div>
        ) : null}

        {keywordCoverage ? (
          keywordCoverage.keywords.length > 0 ? (
            <div className="mt-5 space-y-5">
              <div>
                <div
                  role="progressbar"
                  aria-label={`${keywordCoverage.coveragePercent}% of selected job-description terms appear in the resume`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={keywordCoverage.coveragePercent}
                  className="h-2 border border-site-border-strong bg-site-canvas"
                >
                  <div
                    aria-hidden="true"
                    className="h-full bg-site-action"
                    style={{ width: `${keywordCoverage.coveragePercent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-site-secondary">
                  Only add a missing term when it truthfully describes work you have done. Do not paste job-ad wording into your resume just to raise this number.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="border border-site-border bg-site-canvas-alt p-3.5">
                  <p className="text-xs font-semibold text-site-success">
                    Found in your resume · {keywordCoverage.matchedKeywords.length}
                  </p>
                  {keywordCoverage.matchedKeywords.length > 0 ? (
                    <ul
                      aria-label="Job terms found in your resume"
                      className="mt-3 flex flex-wrap gap-2"
                    >
                      {keywordCoverage.matchedKeywords.map((keyword) => (
                        <li key={keyword} className="site-badge site-badge-success font-mono">
                          {keyword}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-site-muted">
                      None of the selected terms appear as exact wording yet.
                    </p>
                  )}
                </div>

                <div className="border border-site-border bg-site-canvas-alt p-3.5">
                  <p className="text-xs font-semibold text-site-warning">
                    Not found in your resume · {keywordCoverage.missingKeywords.length}
                  </p>
                  {keywordCoverage.missingKeywords.length > 0 ? (
                    <ul
                      aria-label="Job terms not found in your resume"
                      className="mt-3 flex flex-wrap gap-2"
                    >
                      {keywordCoverage.missingKeywords.map((keyword) => (
                        <li key={keyword} className="site-badge site-badge-warning font-mono">
                          {keyword}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-site-success">
                      Every selected job term appears in the resume.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="site-callout mt-5 px-4 py-3 text-sm leading-6">
              Include the responsibilities and qualifications from the posting so the check can identify role-specific terms.
            </p>
          )
        ) : (
          <p className="site-callout mt-5 px-4 py-3 text-sm leading-6">
            Add the job description as well if you want to see the important words found and not found in your resume.
          </p>
        )}
      </div>
    </section>
  );
}

export default function AtsReadinessCard({ resumeData }: AtsReadinessCardProps) {
  const [targetTitle, setTargetTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [completedCheck, setCompletedCheck] = useState<CompletedCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const fingerprint = useMemo(
    () => buildAtsReadinessFingerprint(resumeData),
    [resumeData],
  );
  const comparisonKey = useMemo(
    () => JSON.stringify([targetTitle.trim(), jobDescription.trim()]),
    [jobDescription, targetTitle],
  );
  const resultIsCurrent =
    completedCheck?.fingerprint === fingerprint &&
    completedCheck.comparisonKey === comparisonKey;
  const readiness = resultIsCurrent ? completedCheck.readiness : null;
  const hasStaleResult = Boolean(completedCheck && !resultIsCurrent);
  const normalizedTargetTitle = targetTitle.trim();
  const normalizedJobDescription = jobDescription.trim();
  const hasJobComparison = Boolean(normalizedTargetTitle || normalizedJobDescription);

  const runCheck = async () => {
    if (checking) {
      return;
    }

    const requestedFingerprint = fingerprint;
    const requestedComparisonKey = comparisonKey;
    const trimmedTargetTitle = targetTitle.trim();
    const trimmedJobDescription = jobDescription.trim();

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

      if (!response.ok || !body?.readiness) {
        throw new Error(body?.error ?? "The readiness check could not be completed.");
      }

      setCompletedCheck({
        comparisonKey: requestedComparisonKey,
        fingerprint: requestedFingerprint,
        readiness: body.readiness,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The readiness check could not be completed.",
      );
    } finally {
      setChecking(false);
    }
  };

  const statusContent = readiness ? STATUS_CONTENT[readiness.status] : null;
  const generalImprovements = readiness?.improvements.filter(
    (check) => !JOB_COMPARISON_CHECK_IDS.has(check.id),
  ) ?? [];
  const generalPassedChecks = readiness?.passedChecks.filter(
    (check) => !JOB_COMPARISON_CHECK_IDS.has(check.id),
  ) ?? [];

  useEffect(() => {
    if (!readiness) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      resultsRef.current?.focus({ preventScroll: true });
      resultsRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [readiness]);

  return (
    <section
      id="ats-readiness"
      aria-labelledby="ats-readiness-title"
      className="site-panel scroll-mt-24 p-5 sm:p-6"
    >
      <div className="max-w-3xl">
        <p className="site-eyebrow">ATS &amp; job check</p>
        <h3
          id="ats-readiness-title"
          className="site-panel-title mt-2 text-2xl"
        >
          Check your resume—and compare one specific job
        </h3>
        <p className="site-muted mt-3 text-sm leading-7">
          Run a rules-based check for readable contact details, complete work history,
          searchable content, and a text-based PDF. Add a job description to see which
          important words already appear in your resume.
        </p>
      </div>

      <fieldset
        className="editor-signal-frame relative mt-5 overflow-hidden border border-site-border-strong bg-site-canvas-alt p-4 sm:p-5"
        data-ats-job-setup
      >
        <legend className="sr-only">Job comparison details</legend>
        <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-nw" />
        <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-se" />

        <div className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="site-eyebrow">
                <span className="mr-2 font-mono text-site-muted">01</span>
                Job context · Optional
              </p>
              <h4 className="mt-2 font-site text-lg font-semibold text-site-text">
                Paste the role you are applying for
              </h4>
              <p className="mt-1 text-xs leading-5 text-site-muted">
                Leave both fields blank when you only want the general PDF and structure check.
              </p>
            </div>
            <span
              role="status"
              aria-live="polite"
              className={`site-eyebrow w-fit border px-2.5 py-1 font-mono text-[9px] ${
                hasJobComparison
                  ? "border-site-action text-site-action-hover"
                  : "border-site-border text-site-muted"
              }`}
              data-ats-check-mode
            >
              {hasJobComparison ? "Job-specific check" : "General ATS check"}
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-site-secondary">
              <span className="flex items-baseline justify-between gap-3">
                Target job title
                <span className="text-xs font-normal text-site-muted">Optional</span>
              </span>
              <input
                type="text"
                value={targetTitle}
                maxLength={160}
                onChange={(event) => setTargetTitle(event.target.value)}
                placeholder="Example: Product Marketing Manager"
                className="site-field w-full px-4 py-3 font-normal"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-site-secondary">
              <span className="flex items-baseline justify-between gap-3">
                Job description
                <span className="text-xs font-normal text-site-muted">Optional</span>
              </span>
              <textarea
                value={jobDescription}
                maxLength={20_000}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the responsibilities and qualifications from the job posting."
                rows={7}
                aria-describedby="ats-job-description-help ats-job-description-count"
                className="site-field w-full resize-y px-4 py-3 font-normal"
              />
            </label>
            <div className="flex flex-col gap-2 border-l-2 border-site-action px-3 sm:flex-row sm:items-start sm:justify-between">
              <p id="ats-job-description-help" className="text-xs leading-5 text-site-secondary">
                Used only for this check and not stored. The comparison looks for exact terms;
                it does not send your resume or the posting to an AI service.
              </p>
              <p
                id="ats-job-description-count"
                className="shrink-0 font-mono text-[10px] text-site-muted"
              >
                {jobDescription.length.toLocaleString()}/20,000
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-site-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-site-muted">
              {hasJobComparison
                ? "The result will separate your overall ATS readiness from the job-word comparison."
                : "You are running the general resume structure and PDF check."}
            </p>
            <button
              type="button"
              disabled={checking}
              onClick={() => void runCheck()}
              className="site-button site-button-primary w-full shrink-0 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-56"
            >
              {checking
                ? "Checking resume..."
                : hasJobComparison
                  ? "Check against this job"
                  : "Run general ATS check"}
            </button>
          </div>
        </div>
      </fieldset>

      <div aria-live="polite" className="mt-5">
        {checking ? (
          <div
            role="status"
            className="site-callout flex items-center gap-3 px-4 py-3 text-sm text-site-action-hover"
          >
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-site-border border-t-site-action"
            />
            Checking the resume structure, PDF, and selected job context...
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="site-alert-danger px-4 py-3 text-sm"
          >
            {error}
          </p>
        ) : null}

        {hasStaleResult && !checking ? (
          <p className="site-callout site-callout-warning px-4 py-3 text-sm text-site-warning">
            Your resume or comparison changed since the last check. Run the check again for an
            up-to-date result.
          </p>
        ) : null}
      </div>

      {readiness && statusContent ? (
        <div
          ref={resultsRef}
          role="region"
          aria-label="ATS check results"
          tabIndex={-1}
          className="mt-5 scroll-mt-24 space-y-5 outline-none"
          data-ats-readiness-results
        >
          <div
            role="status"
            aria-live="polite"
            className={`rounded-none border p-4 sm:p-5 ${statusContent.styles}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="site-eyebrow text-[10px] text-current">
                    {statusContent.badge}
                  </p>
                  <span className="site-eyebrow border border-current px-2 py-1 font-mono text-[9px] text-current opacity-80">
                    {hasJobComparison ? "Includes job comparison" : "General ATS check"}
                  </span>
                </div>
                <h4 className="mt-2 font-site text-xl font-semibold text-site-text">
                  {statusContent.heading}
                </h4>
                {hasJobComparison ? (
                  <p className="mt-2 text-xs leading-5 text-site-secondary">
                    The overall score includes the current title and job-word checks. The word match is separated below so you can see what changed.
                  </p>
                ) : null}
              </div>
              <div className="w-fit border border-site-border-strong bg-site-canvas-alt px-4 py-3 text-site-text">
                <p className="text-xs font-semibold text-site-muted">
                  ATS readiness
                </p>
                <p className="mt-1 font-site text-2xl font-semibold tabular-nums">{Math.round(readiness.score)}/100</p>
              </div>
            </div>
          </div>

          <JobComparisonResult
            jobDescription={normalizedJobDescription}
            readiness={readiness}
            targetTitle={normalizedTargetTitle}
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CATEGORY_LABELS.map((category) => (
              <div
                key={category.id}
                className="border border-site-border bg-site-canvas-alt p-3.5"
              >
                <p className="text-xs text-site-muted">{category.label}</p>
                <p className="mt-1.5 font-site text-xl font-semibold tabular-nums text-site-text">
                  {Math.round(readiness.categoryScores[category.id])}
                  <span className="text-xs text-site-muted">/100</span>
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="border border-site-border bg-site-canvas-alt p-4">
              <p className="site-eyebrow text-site-danger">Fix first</p>
              {readiness.criticalFixes.length > 0 ? (
                <CheckList checks={readiness.criticalFixes} />
              ) : (
                <p className="mt-3 text-sm leading-6 text-site-secondary">
                  No critical structural problems were found.
                </p>
              )}
            </div>

            <div className="border border-site-border bg-site-canvas-alt p-4">
              <p className="site-eyebrow text-site-warning">
                Worth improving
              </p>
              {generalImprovements.length > 0 ? (
                <CheckList checks={generalImprovements} />
              ) : (
                <p className="mt-3 text-sm leading-6 text-site-secondary">
                  No other material improvements were flagged by the current rules.
                </p>
              )}
            </div>
          </div>

          <div className="site-callout p-4">
            <p className="site-eyebrow">PDF check</p>
            <p className="mt-2 text-sm leading-6 text-site-secondary">
              {describePdf(readiness)}
            </p>
            {readiness.pdf.renderFailureReason ? (
              <p className="mt-2 text-sm leading-6 text-site-danger">
                {readiness.pdf.renderFailureReason}
              </p>
            ) : null}
          </div>

          {generalPassedChecks.length > 0 ? (
            <details className="site-status-success border p-4">
              <summary className="cursor-pointer text-sm font-medium text-site-success">
                See {generalPassedChecks.length} other checks that passed
              </summary>
              <CheckList checks={generalPassedChecks} />
            </details>
          ) : null}

          <p className="text-xs leading-5 text-site-muted">
            {readiness.disclaimer ||
              "This rule-based check cannot predict how every ATS, recruiter, or hiring team will evaluate a resume."}
          </p>
        </div>
      ) : (
        !checking &&
        !hasStaleResult && (
          <p className="mt-5 text-xs leading-5 text-site-muted">
            This rule-based check cannot predict how every ATS, recruiter, or hiring team will
            evaluate a resume.
          </p>
        )
      )}
    </section>
  );
}
