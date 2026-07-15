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
    styles: "border-[rgba(91,214,124,0.28)] bg-[rgba(91,214,124,0.09)] text-[#9BEDAF]",
  },
  needs_attention: {
    badge: "Needs attention",
    heading: "A few changes could make this easier to process",
    styles: "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.09)] text-[#FDE68A]",
  },
  not_ready: {
    badge: "Not ready yet",
    heading: "Fix the essentials before relying on this PDF",
    styles: "border-[rgba(255,120,120,0.3)] bg-[rgba(255,120,120,0.09)] text-[#FFB4B4]",
  },
};

function CheckList({ checks }: { checks: AtsReadinessCheck[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {checks.map((check) => (
        <li
          key={check.id}
          className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(6,14,28,0.34)] p-3.5"
        >
          <p className="font-medium text-[#F0F4FF]">{check.title}</p>
          <p className="mt-1.5 text-sm leading-6 text-[rgba(240,244,255,0.64)]">
            {check.detail}
          </p>
          {check.suggestedFix ? (
            <p className="mt-2 text-sm leading-6 text-[#BFDBFE]">
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
      className="scroll-mt-24 rounded-2xl border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.07)] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#93C5FD]">
            ATS readiness
          </p>
          <h3
            id="ats-readiness-title"
            className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]"
          >
            Check the structure before you download
          </h3>
          <p className="mt-3 text-sm leading-7 text-[rgba(232,242,255,0.76)]">
            Run a deterministic check for readable contact details, complete work history,
            searchable content, and a text-based PDF. It uses rules, not a paid AI service.
          </p>
        </div>

        <button
          type="button"
          disabled={checking}
          onClick={() => void runCheck()}
          className="gold-pill min-w-48 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all hover:shadow-[0_10px_36px_rgba(59,130,246,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07101e] disabled:cursor-wait disabled:opacity-60"
        >
          {checking ? "Checking..." : "Check ATS readiness"}
        </button>
      </div>

      <details className="mt-5 rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.03)] p-4">
        <summary className="cursor-pointer text-sm font-medium text-[#BFDBFE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]">
          Compare with a job description (optional)
        </summary>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm text-[rgba(240,244,255,0.72)]">
            Target job title
            <input
              type="text"
              value={targetTitle}
              maxLength={160}
              onChange={(event) => setTargetTitle(event.target.value)}
              placeholder="Example: Product Marketing Manager"
              className="w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(3,10,22,0.7)] px-4 py-3 text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.3)] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            />
          </label>
          <label className="grid gap-2 text-sm text-[rgba(240,244,255,0.72)]">
            Job description
            <textarea
              value={jobDescription}
              maxLength={20_000}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the role description to compare its important terms with your resume."
              rows={6}
              className="w-full resize-y rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(3,10,22,0.7)] px-4 py-3 text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.3)] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            />
          </label>
          <p className="text-xs leading-5 text-[rgba(240,244,255,0.5)]">
            Your comparison text is used only for this check and is not stored. Leave these
            fields blank for a general resume check.
          </p>
        </div>
      </details>

      <div aria-live="polite" className="mt-5">
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
          <p className="rounded-xl border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.07)] px-4 py-3 text-sm text-[#FDE68A]">
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
            className={`rounded-2xl border p-4 sm:p-5 ${statusContent.styles}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                  {statusContent.badge}
                </p>
                <h4 className="mt-2 font-heading text-xl font-semibold text-[#F0F4FF]">
                  {statusContent.heading}
                </h4>
              </div>
              <div className="w-fit rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(6,14,28,0.34)] px-4 py-3 text-[#F0F4FF]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.48)]">
                  Readiness score
                </p>
                <p className="mt-1 font-mono text-2xl">{Math.round(readiness.score)}/100</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CATEGORY_LABELS.map((category) => (
              <div
                key={category.id}
                className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(6,14,28,0.34)] p-3.5"
              >
                <p className="text-xs text-[rgba(240,244,255,0.54)]">{category.label}</p>
                <p className="mt-1.5 font-mono text-xl text-[#F0F4FF]">
                  {Math.round(readiness.categoryScores[category.id])}
                  <span className="text-xs text-[rgba(240,244,255,0.4)]">/100</span>
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#FFB4B4]">Fix first</p>
              {readiness.criticalFixes.length > 0 ? (
                <CheckList checks={readiness.criticalFixes} />
              ) : (
                <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.64)]">
                  No critical structural problems were found.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#FDE68A]">
                Worth improving
              </p>
              {readiness.improvements.length > 0 ? (
                <CheckList checks={readiness.improvements} />
              ) : (
                <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.64)]">
                  No material improvements were flagged by the current rules.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.06)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">PDF check</p>
              <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.72)]">
                {describePdf(readiness)}
              </p>
              {readiness.pdf.renderFailureReason ? (
                <p className="mt-2 text-sm leading-6 text-[#FFB4B4]">
                  {readiness.pdf.renderFailureReason}
                </p>
              ) : null}
            </div>

            {readiness.keywordCoverage ? (
              <div className="rounded-xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.06)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">
                  Job comparison
                </p>
                <p className="mt-2 text-sm text-[rgba(240,244,255,0.72)]">
                  {readiness.keywordCoverage.keywords.length === 0
                    ? "No specific role terms were found to compare. Try including the responsibilities and qualifications from the posting."
                    : `${readiness.keywordCoverage.matchedKeywords.length} of ${readiness.keywordCoverage.keywords.length} important terms found (${readiness.keywordCoverage.coveragePercent}%).`}
                </p>
                {readiness.keywordCoverage.missingKeywords.length > 0 ? (
                  <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.52)]">
                    Missing terms: {readiness.keywordCoverage.missingKeywords.join(", ")}. Only
                    add terms that honestly describe your experience.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.46)]">
                  General check
                </p>
                <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.64)]">
                  Add an optional job description above when you want to compare role-specific
                  terms.
                </p>
              </div>
            )}
          </div>

          {readiness.passedChecks.length > 0 ? (
            <details className="rounded-xl border border-[rgba(91,214,124,0.18)] bg-[rgba(91,214,124,0.05)] p-4">
              <summary className="cursor-pointer text-sm font-medium text-[#9BEDAF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9BEDAF]">
                See {readiness.passedChecks.length} checks that passed
              </summary>
              <CheckList checks={readiness.passedChecks} />
            </details>
          ) : null}

          <p className="text-xs leading-5 text-[rgba(240,244,255,0.45)]">
            {readiness.disclaimer ||
              "This rule-based check cannot predict how every ATS, recruiter, or hiring team will evaluate a resume."}
          </p>
        </div>
      ) : (
        !checking &&
        !hasStaleResult && (
          <p className="mt-5 text-xs leading-5 text-[rgba(240,244,255,0.45)]">
            This rule-based check cannot predict how every ATS, recruiter, or hiring team will
            evaluate a resume.
          </p>
        )
      )}
    </section>
  );
}
