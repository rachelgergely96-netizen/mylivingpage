"use client";

import {
  doesAtsExportFitOnOnePage,
  getAtsExportPageCount,
  getAtsRenderFailureReason,
  getRecommendedOnePageCuts,
  isAtsExportRenderable,
} from "@/lib/ats-review";
import type {
  AtsIssue,
  AtsReviewSnapshot,
  AtsTargeting,
  ResumeData,
} from "@/types/resume";

interface AtsReviewSummaryProps {
  data: ResumeData;
  review: AtsReviewSnapshot | null;
  reviewing: boolean;
  actionBusy?: boolean;
  reviewError?: string | null;
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

interface AtsReviewAdvancedPanelProps {
  data: ResumeData;
  review: AtsReviewSnapshot | null;
  targeting: AtsTargeting;
  reviewing: boolean;
  actionBusy?: boolean;
  onTargetingChange: (next: AtsTargeting) => void;
  onRunReview: () => void;
  runReviewLabel?: string;
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

  const currentExportCheck = review.candidateExportCheck ?? review.exportCheck;
  if (!isAtsExportRenderable(currentExportCheck)) {
    return getAtsRenderFailureReason(currentExportCheck);
  }

  return (
    review.candidateExportCheck?.recommendedFixes?.[0] ??
    review.candidateExportCheck?.overflowReasons?.[0] ??
    review.exportCheck.recommendedFixes?.[0] ??
    review.exportCheck.overflowReasons?.[0] ??
    "Shorten the source content and rerun ATS review."
  );
}

function getStatusTitle(review: AtsReviewSnapshot | null) {
  if (!review) {
    return null;
  }

  return review.status === "ready"
    ? "Recommended ATS draft ready to use"
    : "Recommended ATS draft needs attention";
}

function getStatusBody(review: AtsReviewSnapshot | null) {
  if (!review) {
    return null;
  }

  const currentExportCheck = review.candidateExportCheck ?? review.exportCheck;
  return review.status === "ready"
    ? doesAtsExportFitOnOnePage(currentExportCheck)
      ? "We built a recommended ATS draft and kept it separate from your public page."
      : "This ATS draft is usable now. We also surfaced optional cuts if you want to tighten it into a one-page version."
    : "This ATS draft still needs a clean PDF render before preview and download can work.";
}

export function AtsReviewAdvancedPanel({
  data,
  review,
  targeting,
  reviewing,
  actionBusy = false,
  onTargetingChange,
  onRunReview,
  runReviewLabel = "Run ATS Review",
}: AtsReviewAdvancedPanelProps) {
  if (!review) {
    return null;
  }

  const currentExportCheck = review.candidateExportCheck ?? review.exportCheck;
  const currentPageCount = getAtsExportPageCount(currentExportCheck);
  const currentRenderable = isAtsExportRenderable(currentExportCheck);
  const currentOnePage = doesAtsExportFitOnOnePage(currentExportCheck);

  return (
    <details className="glass-card rounded-2xl p-4 sm:p-5">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Advanced options</p>
            <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
              Override the target role, rebuild the recommendation, and inspect remaining ATS issues.
            </p>
          </div>
          <div className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.62)]">
            {!currentRenderable ? "Preview unavailable" : currentOnePage ? "ATS PDF ready" : `${currentPageCount ?? "?"} pages`}
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

        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
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
      </div>
    </details>
  );
}

export default function AtsReviewPanel({
  data,
  review,
  reviewing,
  actionBusy = false,
  reviewError = null,
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
}: AtsReviewSummaryProps) {
  const reviewStatus = reviewing
    ? "Running ATS review..."
    : actionBusy
      ? "Saving changes..."
      : null;

  const blockingReason = getBlockingReason(review);
  const recommendedCuts = getRecommendedOnePageCuts(review?.candidateExportCheck ?? review?.exportCheck);
  const statusTitle = getStatusTitle(review);
  const statusBody = getStatusBody(review);
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
                  Run the review once and we will generate the strongest ATS draft we can from your current content.
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
                <p className="font-semibold text-[#FFF1F1]">This draft needs a render fix before preview and download can work.</p>
                <p className="mt-2">{blockingReason}</p>
              </div>
            ) : null}

            {review.status === "ready" && !doesAtsExportFitOnOnePage(review.candidateExportCheck ?? review.exportCheck) ? (
              <div className="rounded-2xl border border-[rgba(245,195,107,0.24)] bg-[rgba(245,195,107,0.08)] p-4 text-sm leading-6 text-[#FDE7BA]">
                <p className="font-semibold text-[#FFF7E5]">This recommended draft is usable now.</p>
                <p className="mt-2">
                  Use the cut suggestions below if you want to bring it down to one page.
                </p>
                {recommendedCuts.length ? (
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#FFF7E5]">
                    {recommendedCuts.map((cut) => (
                      <li key={cut}>{cut}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

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
