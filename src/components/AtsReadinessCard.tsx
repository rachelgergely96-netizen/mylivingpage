"use client";

import { useMemo, useState } from "react";
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

export default function AtsReadinessCard({ resumeData }: AtsReadinessCardProps) {
  const [targetTitle, setTargetTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [completedCheck, setCompletedCheck] = useState<CompletedCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <section
      id="ats-readiness"
      aria-labelledby="ats-readiness-title"
      className="site-panel scroll-mt-24 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="site-eyebrow">
            ATS readiness
          </p>
          <h3
            id="ats-readiness-title"
            className="site-panel-title mt-2 text-2xl"
          >
            Check the structure before you download
          </h3>
          <p className="site-muted mt-3 text-sm leading-7">
            Run a deterministic check for readable contact details, complete work history,
            searchable content, and a text-based PDF. It uses rules, not a paid AI service.
          </p>
        </div>

        <button
          type="button"
          disabled={checking}
          onClick={() => void runCheck()}
          className="site-button site-button-primary min-w-48 disabled:cursor-wait disabled:opacity-60"
        >
          {checking ? "Checking..." : "Check ATS readiness"}
        </button>
      </div>

      <details className="mt-5 border border-site-border bg-site-canvas-alt p-4">
        <summary className="cursor-pointer text-sm font-medium text-site-action-hover">
          Compare with a job description (optional)
        </summary>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-site-secondary">
            Target job title
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
            Job description
            <textarea
              value={jobDescription}
              maxLength={20_000}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the role description to compare its important terms with your resume."
              rows={6}
              className="site-field w-full resize-y px-4 py-3 font-normal"
            />
          </label>
          <p className="text-xs leading-5 text-site-muted">
            Your comparison text is used only for this check and is not stored. Leave these
            fields blank for a general resume check.
          </p>
        </div>
      </details>

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
            Building and checking your PDF...
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
        <div className="mt-5 space-y-5">
          <div
            role="status"
            aria-live="polite"
            className={`rounded-none border p-4 sm:p-5 ${statusContent.styles}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold">
                  {statusContent.badge}
                </p>
                <h4 className="mt-2 font-site text-xl font-semibold text-site-text">
                  {statusContent.heading}
                </h4>
              </div>
              <div className="w-fit border border-site-border-strong bg-site-canvas-alt px-4 py-3 text-site-text">
                <p className="text-xs font-semibold text-site-muted">
                  Readiness score
                </p>
                <p className="mt-1 font-site text-2xl font-semibold tabular-nums">{Math.round(readiness.score)}/100</p>
              </div>
            </div>
          </div>

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
              {readiness.improvements.length > 0 ? (
                <CheckList checks={readiness.improvements} />
              ) : (
                <p className="mt-3 text-sm leading-6 text-site-secondary">
                  No material improvements were flagged by the current rules.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
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

            {readiness.keywordCoverage ? (
              <div className="site-callout p-4">
                <p className="site-eyebrow">
                  Job comparison
                </p>
                <p className="mt-2 text-sm text-site-secondary">
                  {readiness.keywordCoverage.keywords.length === 0
                    ? "No specific role terms were found to compare. Try including the responsibilities and qualifications from the posting."
                    : `${readiness.keywordCoverage.matchedKeywords.length} of ${readiness.keywordCoverage.keywords.length} important terms found (${readiness.keywordCoverage.coveragePercent}%).`}
                </p>
                {readiness.keywordCoverage.missingKeywords.length > 0 ? (
                  <p className="mt-2 text-xs leading-5 text-site-muted">
                    Missing terms: {readiness.keywordCoverage.missingKeywords.join(", ")}. Only
                    add terms that honestly describe your experience.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="border border-site-border bg-site-canvas-alt p-4">
                <p className="site-eyebrow text-site-muted">
                  General check
                </p>
                <p className="mt-2 text-sm leading-6 text-site-secondary">
                  Add an optional job description above when you want to compare role-specific
                  terms.
                </p>
              </div>
            )}
          </div>

          {readiness.passedChecks.length > 0 ? (
            <details className="site-status-success border p-4">
              <summary className="cursor-pointer text-sm font-medium text-site-success">
                See {readiness.passedChecks.length} checks that passed
              </summary>
              <CheckList checks={readiness.passedChecks} />
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
