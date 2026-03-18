"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AtsIssue,
  AtsReviewSnapshot,
  AtsTargeting,
  ResumeData,
} from "@/types/resume";

interface AtsReviewPanelProps {
  data: ResumeData;
  review: AtsReviewSnapshot | null;
  targeting: AtsTargeting;
  reviewing: boolean;
  previewResumeData?: ResumeData;
  previewContentHash?: string | null;
  actionBusy?: boolean;
  reviewError?: string | null;
  onTargetingChange: (next: AtsTargeting) => void;
  onRunReview: () => void;
  onPrimaryAction?: () => void | Promise<void>;
  onSecondaryAction?: () => void | Promise<void>;
  onContinueWithoutReview?: () => void | Promise<void>;
  onBack?: () => void;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  continueWithoutReviewLabel?: string;
  backLabel?: string;
  runReviewLabel?: string;
  stepLabel?: string;
  heading: string;
  body: string;
}

const inputClass =
  "mt-1 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.3)] focus:border-[#3B82F6] focus:outline-none";

function getSeverityTone(issue: AtsIssue) {
  if (issue.severity === "critical") {
    return "border-[rgba(255,120,120,0.28)] bg-[rgba(255,120,120,0.08)] text-[#FFD5D5]";
  }

  if (issue.severity === "warning") {
    return "border-[rgba(245,195,107,0.25)] bg-[rgba(245,195,107,0.08)] text-[#F5D7A2]";
  }

  return "border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] text-[#BFDBFE]";
}

function getBlockingReason(review: AtsReviewSnapshot | null) {
  if (!review) {
    return null;
  }

  return (
    review.candidateExportCheck?.recommendedFixes?.[0] ??
    review.candidateExportCheck?.overflowReasons?.[0] ??
    review.exportCheck.recommendedFixes?.[0] ??
    review.exportCheck.overflowReasons?.[0] ??
    "Shorten the source content and rerun ATS review."
  );
}

export default function AtsReviewPanel({
  data,
  review,
  targeting,
  reviewing,
  previewResumeData,
  previewContentHash = null,
  actionBusy = false,
  reviewError = null,
  onTargetingChange,
  onRunReview,
  onPrimaryAction,
  onSecondaryAction,
  onContinueWithoutReview,
  onBack,
  primaryActionLabel = "Continue",
  secondaryActionLabel = "Keep my current wording",
  continueWithoutReviewLabel = "Continue without ATS Review",
  backLabel = "Back",
  runReviewLabel = "Run ATS Review",
  stepLabel = "ATS Review",
  heading,
  body,
}: AtsReviewPanelProps) {
  const previewUrlRef = useRef<string | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewSnapshotHash, setPreviewSnapshotHash] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      previewAbortRef.current?.abort();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const previewStatus = !review
    ? null
    : !previewSnapshotHash
      ? "Preview not generated yet"
      : previewSnapshotHash === (previewContentHash ?? review.contentHash)
        ? "Preview up to date"
        : "Preview is stale";

  const reviewStatus = reviewing
    ? "Running ATS review..."
    : actionBusy
      ? "Saving changes..."
      : null;

  const blockingReason = getBlockingReason(review);

  const statusTitle = review
    ? review.status === "ready"
      ? "Recommended ATS draft ready"
      : "Best condensed ATS draft still needs trimming"
    : null;

  const statusBody = review
    ? review.status === "ready"
      ? "We built a recommended one-page ATS version and kept it separate from your public page."
      : `${blockingReason} This is still the strongest condensed ATS draft we could build from your current information.`
    : null;

  const previewData = useMemo(
    () => previewResumeData ?? review?.candidateResumeData ?? data,
    [data, previewResumeData, review?.candidateResumeData],
  );

  const refreshPreview = async () => {
    previewAbortRef.current?.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const response = await fetch("/api/resume/export/preview", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeData: previewData }),
      });

      const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
      if (!response.ok || !contentType.startsWith("application/pdf")) {
        const payload = contentType.includes("application/json")
          ? ((await response.json().catch(() => null)) as
              | { error?: string; recommendedFixes?: string[]; overflowReasons?: string[] }
              | null)
          : null;
        throw new Error(
          payload?.error ??
            payload?.recommendedFixes?.[0] ??
            payload?.overflowReasons?.[0] ??
            "Unable to load the ATS PDF preview.",
        );
      }

      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = nextUrl;
      setPreviewUrl(nextUrl);
      setPreviewSnapshotHash(previewContentHash ?? review?.contentHash ?? null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setPreviewError(error instanceof Error ? error.message : "Unable to load the ATS PDF preview.");
    } finally {
      setPreviewLoading(false);
      previewAbortRef.current = null;
    }
  };

  const canAct = Boolean(review) && !reviewing && !actionBusy;

  return (
    <section data-testid="ats-review-panel" className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">{stepLabel}</p>
        <h2 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">{heading}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.62)]">{body}</p>
        {reviewStatus ? (
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.52)]">{reviewStatus}</p>
        ) : null}
      </div>

      {reviewError ? (
        <div className="rounded-2xl border border-[rgba(255,120,120,0.28)] bg-[rgba(255,120,120,0.08)] p-4">
          <p className="text-sm leading-6 text-[#FFD5D5]">{reviewError}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onRunReview}
              disabled={reviewing || actionBusy || !data.name.trim()}
              className="rounded-full border border-[rgba(59,130,246,0.26)] bg-[rgba(59,130,246,0.1)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93C5FD] transition-colors hover:border-[rgba(59,130,246,0.42)] hover:text-[#BFDBFE] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Retry ATS Review
            </button>
            {onContinueWithoutReview ? (
              <button
                type="button"
                onClick={() => void onContinueWithoutReview()}
                disabled={reviewing || actionBusy}
                className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {continueWithoutReviewLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Recommended ATS Draft</p>
            {review ? (
              <>
                <h3 data-testid="ats-status-card" className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
                  {statusTitle}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.62)]">{statusBody}</p>
              </>
            ) : (
              <>
                <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
                  We can build the ATS version for you
                </h3>
                <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
                  Run the review once and we will generate the best evidence-based one-page ATS draft we can from your current content.
                </p>
              </>
            )}
          </div>

          {!review ? (
            <button
              type="button"
              onClick={onRunReview}
              disabled={reviewing || actionBusy || !data.name.trim()}
              className="gold-pill px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reviewing ? "Reviewing..." : runReviewLabel}
            </button>
          ) : null}
        </div>

        {review ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">What we changed</p>
              {review.changeSummary.length ? (
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#E8F2FF]">
                  {review.changeSummary.map((item) => (
                    <li key={item.id}>
                      <span className="font-semibold">{item.title}.</span> {item.description}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[#E8F2FF]">
                  No automatic ATS edits were needed. Your current content already gave us a strong recommended export starting point.
                </p>
              )}
            </div>

            {review.status === "needs_attention" ? (
              <div className="rounded-2xl border border-[rgba(255,120,120,0.24)] bg-[rgba(255,120,120,0.08)] p-4 text-sm leading-6 text-[#FFD5D5]">
                <p className="font-semibold text-[#FFF0F0]">This recommended draft is not ready for approval yet.</p>
                <p className="mt-2">{blockingReason}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {review ? (
        <details className="glass-card rounded-2xl p-4 sm:p-5">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Advanced options</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
                  Override the target role, rebuild the recommendation, inspect issues, or refresh the ATS PDF preview.
                </p>
              </div>
              <div className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.62)]">
                {review.candidateExportCheck?.fitsOnOnePage ? "ATS PDF ready" : `${review.candidateExportCheck?.pageCount ?? review.exportCheck.pageCount} pages`}
              </div>
            </div>
          </summary>

          <div className="mt-5 space-y-4">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Target role override</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.56)]">
                  Only change this if you want the ATS version aimed at a different role or a specific job post.
                </p>
              </div>

              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.42)]">Target role</span>
                <input
                  type="text"
                  value={targeting.primaryTitle}
                  onChange={(event) => onTargetingChange({ ...targeting, primaryTitle: event.target.value })}
                  placeholder="Product Manager"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.42)]">
                  Job description
                </span>
                <textarea
                  value={targeting.jobDescription}
                  onChange={(event) => onTargetingChange({ ...targeting, jobDescription: event.target.value })}
                  placeholder="Optional: paste a job description to compare exact keywords."
                  rows={6}
                  className={`${inputClass} min-h-[150px] resize-y leading-6`}
                />
              </label>

              <button
                type="button"
                onClick={onRunReview}
                disabled={reviewing || actionBusy || !data.name.trim()}
                className="rounded-full border border-[rgba(59,130,246,0.26)] bg-[rgba(59,130,246,0.1)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93C5FD] transition-colors hover:border-[rgba(59,130,246,0.42)] hover:text-[#BFDBFE] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {reviewing ? "Reviewing..." : runReviewLabel}
              </button>
            </div>

            <div
              className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">Remaining issues</p>
              <div className="mt-3 space-y-3">
                {review.issues.length ? (
                  review.issues.map((issue) => (
                    <article
                      key={issue.id}
                      className={`rounded-xl border p-4 text-sm ${getSeverityTone(issue)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#F0F4FF]">{issue.title}</p>
                          <p className="mt-2 leading-6 text-[rgba(240,244,255,0.68)]">{issue.description}</p>
                          {issue.suggestedFix ? (
                            <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[rgba(240,244,255,0.5)]">
                              {issue.suggestedFix}
                            </p>
                          ) : null}
                        </div>
                        <span className="rounded-full border border-[rgba(255,255,255,0.14)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.7)]">
                          {issue.severity}
                        </span>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-xl border border-[rgba(100,220,100,0.24)] bg-[rgba(100,220,100,0.08)] p-4 text-sm text-[#CFFFD7]">
                    No other blocking issues right now.
                  </div>
                )}
              </div>
            </div>

            <div
              data-testid="ats-pdf-preview"
              className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                    Recommended ATS PDF preview
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
                    This previews the current recommended one-column ATS version, not your public page.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.62)]">
                    {review.candidateExportCheck?.fitsOnOnePage
                      ? "Fits one page"
                      : `${review.candidateExportCheck?.pageCount ?? review.exportCheck.pageCount} pages`}
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshPreview()}
                    disabled={previewLoading}
                    className="rounded-full border border-[rgba(59,130,246,0.26)] bg-[rgba(59,130,246,0.1)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93C5FD] transition-colors hover:border-[rgba(59,130,246,0.42)] hover:text-[#BFDBFE] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {previewLoading
                      ? "Refreshing..."
                      : previewUrl
                        ? "Refresh preview"
                        : "Generate preview"}
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
                {previewLoading ? (
                  <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm text-slate-500">
                    Generating the ATS PDF preview...
                  </div>
                ) : previewError ? (
                  <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm text-slate-500">
                    {previewError}
                  </div>
                ) : previewUrl ? (
                  <iframe
                    data-testid="ats-pdf-preview-frame"
                    title="ATS PDF Preview"
                    src={previewUrl}
                    className="min-h-[420px] w-full bg-white md:min-h-[540px]"
                  />
                ) : (
                  <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm text-slate-500">
                    Generate the ATS PDF preview when you want to verify the current export layout.
                  </div>
                )}
              </div>

              <p className="mt-3 text-xs leading-6 text-[rgba(240,244,255,0.48)]">
                {previewStatus}. Preview only refreshes when you ask for it.
              </p>
              {review.candidateExportCheck?.fitsOnOnePage === false ? (
                <p className="mt-2 text-xs leading-6 text-[rgba(245,195,107,0.88)]">
                  This recommended draft still runs long. Edit the ATS draft or rebuild the recommendation to reach one page before approval.
                </p>
              ) : null}
            </div>
          </div>
        </details>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
          >
            {backLabel}
          </button>
        ) : null}
        {onSecondaryAction ? (
          <button
            type="button"
            onClick={() => void onSecondaryAction()}
            disabled={!canAct}
            className="bg-transparent px-1 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.52)] underline-offset-4 transition-colors hover:text-[#93C5FD] hover:underline disabled:cursor-not-allowed disabled:opacity-45"
          >
            {secondaryActionLabel}
          </button>
        ) : null}
        {onPrimaryAction ? (
          <button
            type="button"
            onClick={() => void onPrimaryAction()}
            disabled={!canAct}
            className="gold-pill px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {primaryActionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
