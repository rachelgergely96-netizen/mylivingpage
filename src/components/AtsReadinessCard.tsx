"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildAtsReadinessFingerprint,
  type AtsReadinessCheck,
  type AtsReadinessResult,
} from "@/lib/ats-readiness";
import {
  createTargetRole,
  getActiveTargetRole,
  removeTargetRole,
  selectTargetRole,
  upsertTargetRole,
  MAX_SAVED_TARGET_ROLES,
} from "@/lib/ats-target-roles";
import type {
  AtsPersistedTargeting,
  AtsTargetRole,
  ResumeData,
} from "@/types/resume";

export interface AtsProposal {
  id: string;
  group: string;
  title: string;
  reason: string;
  beforeText: string;
  afterText: string;
  applyData: Partial<ResumeData>;
}

interface AtsReadinessCardProps {
  resumeData: ResumeData;
  /** Hide the card's standalone header when a surrounding section already introduces it. */
  showHeader?: boolean;
  /**
   * Saved target roles. Supplied by the editor, which persists them; omitted in
   * the create flow, where the card stays a one-off check.
   */
  targeting?: AtsPersistedTargeting;
  onTargetingChange?: (targeting: AtsPersistedTargeting) => void;
  /** Applies an accepted rewrite to the résumé being edited. */
  onApplyProposal?: (patch: Partial<ResumeData>) => void;
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
    heading: "Your résumé passes the current checks",
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
    <ul className="mt-3 divide-y divide-site-border border-t border-site-border">
      {checks.map((check) => (
        <li key={check.id} className="py-3">
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
    : `${pageLabel}. A multi-page résumé is not automatically an ATS problem.`;
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
                  : `${keywordCoverage.matchedKeywords.length} of ${keywordCoverage.keywords.length} important terms appear in your résumé`
                : "Target-title wording checked"}
            </h5>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-site-secondary">
              This is an exact-word comparison, not a prediction of whether an employer will rank or select you.
            </p>
          </div>

          {keywordCoverage && keywordCoverage.keywords.length > 0 ? (
            <div className="border-l border-site-border pl-4 sm:min-w-32 sm:text-right">
              <p className="site-eyebrow text-site-muted">Exact words found</p>
              <p className="editor-signal-count mt-1 font-site text-3xl font-semibold tabular-nums text-site-action-hover">
                {keywordCoverage.coveragePercent}%
              </p>
              <p className="site-eyebrow mt-1 text-site-muted">
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
                  aria-label={`${keywordCoverage.coveragePercent}% of selected job-description terms appear in the résumé`}
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
                  Only add a missing term when it truthfully describes work you have done. Do not paste job-ad wording into your résumé just to raise this number.
                </p>
              </div>

              <div className="grid items-start gap-4 lg:grid-cols-2">
                <div className="border border-site-border bg-site-canvas-alt p-4">
                  <p className="text-xs font-semibold text-site-success">
                    Found in your résumé · {keywordCoverage.matchedKeywords.length}
                  </p>
                  {keywordCoverage.matchedKeywords.length > 0 ? (
                    <ul
                      aria-label="Job terms found in your résumé"
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

                <div className="border border-site-border bg-site-canvas-alt p-4">
                  <p className="text-xs font-semibold text-site-warning">
                    Not found in your résumé · {keywordCoverage.missingKeywords.length}
                  </p>
                  {keywordCoverage.missingKeywords.length > 0 ? (
                    <ul
                      aria-label="Job terms not found in your résumé"
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
                      Every selected job term appears in the résumé.
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
            Add the job description as well if you want to see the important words found and not found in your résumé.
          </p>
        )}
      </div>
    </section>
  );
}

export default function AtsReadinessCard({
  resumeData,
  showHeader = true,
  targeting,
  onTargetingChange,
  onApplyProposal,
}: AtsReadinessCardProps) {
  const activeRole = targeting ? getActiveTargetRole(targeting) : null;
  const [targetTitle, setTargetTitle] = useState(activeRole?.title ?? "");
  const [jobDescription, setJobDescription] = useState(
    activeRole?.jobDescription ?? "",
  );
  const [completedCheck, setCompletedCheck] = useState<CompletedCheck | null>(null);
  const [proposals, setProposals] = useState<AtsProposal[]>([]);
  const [dismissedProposalIds, setDismissedProposalIds] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const rolesSupported = Boolean(targeting && onTargetingChange);
  const latestTargetingRef = useRef(targeting);

  useEffect(() => {
    latestTargetingRef.current = targeting;
  }, [targeting]);

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
  const readiness = completedCheck?.readiness ?? null;
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
    setCompletedCheck(null);
    setProposals([]);

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
        proposals?: AtsProposal[];
      } | null;

      if (!response.ok || !body?.readiness) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Your session has expired. Sign in again to run the check.",
          );
        }
        const serverError = body?.error;
        throw new Error(
          serverError && (serverError.includes(" ") || serverError.length > 20)
            ? serverError
            : "The readiness check could not be completed.",
        );
      }

      setCompletedCheck({
        comparisonKey: requestedComparisonKey,
        fingerprint: requestedFingerprint,
        readiness: body.readiness,
      });
      setProposals(Array.isArray(body.proposals) ? body.proposals : []);
      setDismissedProposalIds([]);

      // `targeting` here is the value captured when the request started. Roles
      // can be saved or removed while a check runs, so stamp through the ref
      // rather than writing a pre-await snapshot back over newer edits.
      const latestTargeting = latestTargetingRef.current;
      if (latestTargeting && onTargetingChange) {
        onTargetingChange({
          ...latestTargeting,
          lastReviewedAt: new Date().toISOString(),
        });
      }
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

  const applyRole = (role: AtsTargetRole | null) => {
    if (!targeting || !onTargetingChange) return;
    onTargetingChange(selectTargetRole(targeting, role?.id ?? null));
    setTargetTitle(role?.title ?? "");
    setJobDescription(role?.jobDescription ?? "");
  };

  const saveCurrentRole = () => {
    if (!targeting || !onTargetingChange) return;

    const title = targetTitle.trim();
    const description = jobDescription.trim();
    if (!title && !description) return;

    // Editing while a saved role is selected updates that role rather than
    // stacking a near-duplicate beside it.
    const existing = getActiveTargetRole(targeting);
    const role = existing
      ? { ...existing, title: title || existing.title, jobDescription: description }
      : createTargetRole({ title: title || "Saved role", jobDescription: description });

    onTargetingChange(upsertTargetRole(targeting, role));
  };

  const deleteRole = (roleId: string) => {
    if (!targeting || !onTargetingChange) return;
    const next = removeTargetRole(targeting, roleId);
    onTargetingChange(next);
    if (targeting.activeRoleId === roleId) {
      const fallback = getActiveTargetRole(next);
      setTargetTitle(fallback?.title ?? "");
      setJobDescription(fallback?.jobDescription ?? "");
    }
  };

  const visibleProposals = proposals.filter(
    (proposal) => !dismissedProposalIds.includes(proposal.id),
  );
  const canSaveRole =
    rolesSupported &&
    Boolean(targetTitle.trim() || jobDescription.trim()) &&
    (targeting!.savedRoles.length < MAX_SAVED_TARGET_ROLES ||
      Boolean(getActiveTargetRole(targeting!)));

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
      aria-labelledby={showHeader ? "ats-readiness-title" : undefined}
      aria-label={showHeader ? undefined : "ATS and job check"}
      className="site-panel scroll-mt-24 p-4 sm:p-6 xl:scroll-mt-72"
    >
      {showHeader ? (
        <div className="max-w-3xl">
          <p className="site-eyebrow">ATS &amp; job check</p>
          <h3
            id="ats-readiness-title"
            className="site-panel-title mt-2 text-2xl"
          >
            Check your résumé—and compare one specific job
          </h3>
          <p className="site-muted mt-3 text-sm leading-7">
            Run a rules-based check for readable contact details, complete work history,
            searchable content, and a text-based PDF. Add a job description to see which
            important words already appear in your résumé.
          </p>
        </div>
      ) : null}

      <fieldset
        className={`editor-signal-frame relative overflow-hidden border border-site-border-strong bg-site-canvas-alt p-4 sm:p-6 ${
          showHeader ? "mt-5" : ""
        }`}
        data-ats-job-setup
      >
        <legend className="sr-only">Job comparison details</legend>
        <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-nw" />
        <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-se" />

        <div className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="site-eyebrow">Job context · Optional</p>
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
              className={`site-eyebrow w-fit border px-2 py-0.5 ${
                hasJobComparison
                  ? "border-site-action text-site-action-hover"
                  : "border-site-border text-site-muted"
              }`}
              data-ats-check-mode
            >
              {hasJobComparison ? "Job-specific check" : "General ATS check"}
            </span>
          </div>

          {rolesSupported ? (
            <div className="mt-5 border-t border-site-border pt-4">
              <p className="site-eyebrow">Saved roles</p>
              <p className="mt-1.5 text-xs leading-5 text-site-muted">
                Keep the roles you are applying for and check the same résumé against each
                one, without pasting the posting again.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyRole(null)}
                  aria-pressed={targeting!.activeRoleId === null}
                  className={`site-button px-3 py-1.5 text-xs ${
                    targeting!.activeRoleId === null
                      ? "border-site-action bg-site-selected text-site-text"
                      : "site-button-secondary"
                  }`}
                >
                  General check
                </button>
                {targeting!.savedRoles.map((role) => {
                  const active = targeting!.activeRoleId === role.id;
                  return (
                    <span
                      key={role.id}
                      className={`inline-flex items-center border text-xs ${
                        active
                          ? "border-site-action bg-site-selected"
                          : "border-site-border bg-site-canvas-alt"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => applyRole(role)}
                        aria-pressed={active}
                        className="max-w-48 truncate px-3 py-1.5 text-site-text"
                      >
                        {role.title || "Saved role"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRole(role.id)}
                        aria-label={`Remove saved role ${role.title || "Saved role"}`}
                        className="border-l border-site-border px-2 py-1.5 text-site-muted transition-colors hover:text-site-danger"
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

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
                {rolesSupported
                  ? "Saved roles are stored with your page so you do not have to paste the posting again. The comparison looks for exact terms; it does not send your résumé or the posting to an AI service."
                  : "Used only for this check and not stored. The comparison looks for exact terms; it does not send your résumé or the posting to an AI service."}
              </p>
              <p
                id="ats-job-description-count"
                className="shrink-0 font-mono text-xs text-site-muted"
              >
                {jobDescription.length.toLocaleString()}/20,000
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-site-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-site-muted">
              {hasJobComparison
                ? "The result will separate your overall ATS readiness from the job-word comparison."
                : "You are running the general résumé structure and PDF check."}
            </p>
            {rolesSupported ? (
              <button
                type="button"
                disabled={!canSaveRole}
                onClick={saveCurrentRole}
                className="site-button site-button-secondary disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto"
              >
                {getActiveTargetRole(targeting!) ? "Update saved role" : "Save this role"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={checking}
              onClick={() => void runCheck()}
              className="site-button site-button-primary w-full shrink-0 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-56"
            >
              {checking
                ? "Checking résumé…"
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
            Checking the résumé structure, PDF, and selected job context…
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="site-alert-danger flex items-start gap-2 px-4 py-3 text-sm"
          >
            <svg
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 4.75v3.75" strokeLinecap="square" />
              <path d="M8 11.25h.01" strokeLinecap="round" />
            </svg>
            <span>{error}</span>
          </p>
        ) : null}

        {hasStaleResult && !checking ? (
          <p
            id="ats-stale-notice"
            className="site-callout site-callout-warning px-4 py-3 text-sm text-site-warning"
          >
            Your résumé or comparison changed since the last check. Run the check again for an
            up-to-date result.
          </p>
        ) : null}
      </div>

      {readiness && statusContent ? (
        <div
          ref={resultsRef}
          role="region"
          aria-label="ATS check results"
          aria-describedby={hasStaleResult ? "ats-stale-notice" : undefined}
          data-stale={hasStaleResult ? "true" : undefined}
          tabIndex={-1}
          className={`mt-5 scroll-mt-24 space-y-5 outline-none xl:scroll-mt-72 ${
            hasStaleResult ? "opacity-60" : ""
          }`}
          data-ats-readiness-results
        >
          {onApplyProposal && visibleProposals.length > 0 && resultIsCurrent ? (
            <section
              aria-labelledby="ats-proposals-title"
              data-ats-proposals
              className="border border-site-action bg-[color-mix(in_srgb,var(--site-action)_6%,var(--site-surface))] p-4 sm:p-5"
            >
              <p className="site-eyebrow">Suggested rewrites</p>
              <h4 id="ats-proposals-title" className="site-panel-title mt-2">
                {visibleProposals.length} change{visibleProposals.length === 1 ? "" : "s"} you
                can accept
              </h4>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-site-secondary">
                Each one edits the fields in this editor. Accepting is not saving — review the
                result and save when you are happy with it.
              </p>
              <ul className="mt-4 space-y-3">
                {visibleProposals.map((proposal) => (
                  <li
                    key={proposal.id}
                    className="border border-site-border bg-site-surface p-4"
                  >
                    <p className="text-sm font-semibold text-site-text">{proposal.title}</p>
                    <p className="mt-1 text-xs leading-5 text-site-muted">{proposal.reason}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="border-l-2 border-site-border bg-site-canvas-alt p-3">
                        <p className="site-eyebrow text-site-muted">Now</p>
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-site-secondary">
                          {proposal.beforeText || "—"}
                        </p>
                      </div>
                      <div className="border-l-2 border-site-action bg-site-canvas-alt p-3">
                        <p className="site-eyebrow text-site-action-hover">After</p>
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-site-text">
                          {proposal.afterText || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyProposal(proposal.applyData);
                          setDismissedProposalIds((ids) => [...ids, proposal.id]);
                        }}
                        className="site-button site-button-primary px-3 py-1.5 text-xs"
                      >
                        Accept this change
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDismissedProposalIds((ids) => [...ids, proposal.id])
                        }
                        className="site-button site-button-secondary px-3 py-1.5 text-xs"
                      >
                        Not this one
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div
            role="status"
            aria-live="polite"
            className={`rounded-none border p-4 sm:p-5 ${statusContent.styles}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="site-eyebrow text-current">
                    {statusContent.badge}
                  </p>
                  <span className="site-eyebrow border border-current px-2 py-0.5 text-current opacity-80">
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
                className="border border-site-border bg-site-canvas-alt p-4"
              >
                <p className="text-xs text-site-muted">{category.label}</p>
                <p className="mt-1.5 font-site text-xl font-semibold tabular-nums text-site-text">
                  {Math.round(readiness.categoryScores[category.id])}
                  <span className="text-xs text-site-muted">/100</span>
                </p>
              </div>
            ))}
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-2">
            <div className="border border-site-border bg-site-canvas-alt p-4">
              <p className="site-eyebrow text-site-danger">Fix first</p>
              {readiness.criticalFixes.length > 0 ? (
                <CheckList checks={readiness.criticalFixes} />
              ) : (
                <p className="mt-3 text-sm leading-6 text-site-secondary">
                  No critical fixes were found.
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
              "This rule-based check cannot predict how every ATS, recruiter, or hiring team will evaluate a résumé."}
          </p>
        </div>
      ) : (
        !checking && (
          <p className="mt-5 text-xs leading-5 text-site-muted">
            This rule-based check cannot predict how every ATS, recruiter, or hiring team will
            evaluate a résumé.
          </p>
        )
      )}
    </section>
  );
}
