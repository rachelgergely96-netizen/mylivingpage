"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AtsIssue,
  AtsReviewSnapshot,
  AtsSuggestion,
  AtsSuggestionFeedback,
  AtsTargeting,
  AtsScoreDimension,
  ResumeData,
} from "@/types/resume";

interface AtsReviewPanelProps {
  data: ResumeData;
  review: AtsReviewSnapshot | null;
  targeting: AtsTargeting;
  reviewing: boolean;
  suggestionFeedback: Record<string, AtsSuggestionFeedback>;
  onTargetingChange: (next: AtsTargeting) => void;
  onRunReview: () => void;
  onApplySuggestion: (suggestion: AtsSuggestion) => void | Promise<void>;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
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

function updateVariant(targeting: AtsTargeting, index: number, value: string) {
  const titleVariants = [...targeting.titleVariants];
  titleVariants[index] = value;
  return {
    ...targeting,
    titleVariants: titleVariants.map((item) => item.trim()).filter(Boolean).slice(0, 2),
  };
}

function formatScoreDimension(dimension: AtsScoreDimension) {
  if (dimension === "machineReadability") {
    return "Machine Readability";
  }
  if (dimension === "recruiterSearchability") {
    return "Recruiter Search";
  }
  return "One-Page PDF";
}

export default function AtsReviewPanel({
  data,
  review,
  targeting,
  reviewing,
  suggestionFeedback,
  onTargetingChange,
  onRunReview,
  onApplySuggestion,
  onBack,
  onContinue,
  continueLabel = "Continue",
  backLabel = "Back",
  runReviewLabel = "Run Full ATS Review",
  stepLabel = "ATS Review",
  heading,
  body,
}: AtsReviewPanelProps) {
  const applied = new Set(review?.appliedSuggestionIds ?? []);
  const canContinue = Boolean(review) && !reviewing;
  const previewUrlRef = useRef<string | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewSnapshotHash, setPreviewSnapshotHash] = useState<string | null>(null);
  const feedbackEntries = Object.values(suggestionFeedback);
  const activeFeedbackCount = feedbackEntries.filter((feedback) => feedback.state === "applying").length;
  const suggestionCards = [...(review?.suggestions ?? [])];

  feedbackEntries.forEach((feedback) => {
    if (!suggestionCards.some((suggestion) => suggestion.id === feedback.suggestion.id)) {
      suggestionCards.push(feedback.suggestion);
    }
  });

  const previewStatus = !review
    ? null
    : !previewSnapshotHash
      ? "Preview not generated yet"
      : previewSnapshotHash === review.contentHash
        ? "Preview up to date"
        : "Preview is stale";
  const reviewStatus = reviewing
    ? "Running full ATS review..."
    : activeFeedbackCount > 0
      ? "Applying fix and rechecking one-page fit..."
      : review
        ? review.mode === "fast"
          ? "Fast recheck complete."
          : "Full review complete."
        : null;

  useEffect(() => {
    if (!review) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = null;
      setPreviewUrl(null);
      setPreviewLoading(false);
      setPreviewError(null);
      setPreviewSnapshotHash(null);
    }
  }, [review]);

  useEffect(() => {
    return () => {
      previewAbortRef.current?.abort();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const refreshPreview = async () => {
    if (!review) {
      return;
    }

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
        body: JSON.stringify({ resumeData: data }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Unable to load the ATS PDF preview.");
      }

      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = nextUrl;
      setPreviewUrl(nextUrl);
      setPreviewSnapshotHash(review.contentHash);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setPreviewError(
        error instanceof Error ? error.message : "Unable to load the ATS PDF preview.",
      );
    } finally {
      setPreviewLoading(false);
      previewAbortRef.current = null;
    }
  };

  return (
    <section data-testid="ats-review-panel" className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">{stepLabel}</p>
        <h2 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">{heading}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.62)]">{body}</p>
        {reviewStatus ? (
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.52)]">
            {reviewStatus}
            {previewStatus ? ` · ${previewStatus}` : ""}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Targeting</p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.42)]">Primary Target Title</span>
              <input
                type="text"
                value={targeting.primaryTitle}
                onChange={(event) => onTargetingChange({ ...targeting, primaryTitle: event.target.value })}
                placeholder="Product Manager"
                className={inputClass}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1].map((index) => (
                <label key={index} className="block">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.42)]">
                    {`Title Variant ${index + 1}`}
                  </span>
                  <input
                    type="text"
                    value={targeting.titleVariants[index] ?? ""}
                    onChange={(event) => onTargetingChange(updateVariant(targeting, index, event.target.value))}
                    placeholder={index === 0 ? "Product Owner" : "PM"}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.42)]">
                Job Description Overlay
              </span>
              <textarea
                value={targeting.jobDescription}
                onChange={(event) => onTargetingChange({ ...targeting, jobDescription: event.target.value })}
                placeholder="Optional: paste a job description to compare exact keywords."
                rows={8}
                className={`${inputClass} min-h-[180px] resize-y leading-6`}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onRunReview}
                disabled={reviewing || !data.name.trim()}
                className="gold-pill px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reviewing ? "Reviewing..." : runReviewLabel}
              </button>
              <p className="self-center text-xs text-[rgba(240,244,255,0.42)]">
                More searchable when exact titles and skills are explicit.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Current status</p>
          {review ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <article className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">Machine Readability</p>
                  <p className="mt-2 font-heading text-3xl text-[#F0F4FF]">{review.score.machineReadability}</p>
                  <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.52)]">Visible to systems with cleaner export-safe structure.</p>
                </article>
                <article className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">Recruiter Search</p>
                  <p className="mt-2 font-heading text-3xl text-[#F0F4FF]">{review.score.recruiterSearchability}</p>
                  <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.52)]">Easier to find when titles and skills are explicit.</p>
                </article>
                <article className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">One-Page PDF</p>
                  <p className="mt-2 font-heading text-3xl text-[#F0F4FF]">{review.score.onePagePdf}</p>
                  <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.52)]">
                    {review.exportCheck.fitsOnOnePage
                      ? "Fits a one-page ATS-safe resume."
                      : `Still ${review.exportCheck.pageCount} pages right now.`}
                  </p>
                </article>
              </div>

              <div className="rounded-xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">Overall</p>
                <p className="mt-2 font-heading text-4xl text-[#F0F4FF]">{review.score.overall}</p>
                <p className="mt-2 text-xs leading-6 text-[rgba(240,244,255,0.56)]">
                  {review.exportCheck.fitsOnOnePage
                    ? "Your current content is export-safe and fits the ATS PDF."
                    : "Tighten the flagged sections before the ATS PDF can download."}
                </p>
              </div>

              <div
                data-testid="ats-pdf-preview"
                className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">
                      ATS PDF Preview
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
                      This is the plain one-column resume recruiters and systems see, separate from
                      your public page.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.62)]">
                      {review.exportCheck.fitsOnOnePage
                        ? "Fits one page"
                        : `${review.exportCheck.pageCount} pages right now`}
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
                          ? "Refresh ATS PDF Preview"
                          : "Generate ATS PDF Preview"}
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
                  {previewStatus}. Use this preview to catch overflow and confirm the ATS PDF stays
                  clean, direct, and easy to scan before you download it.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">Issues to fix</p>
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
                        No blocking issues right now. This version looks visible to systems and ready for one-page export.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">Suggested fixes you can apply</p>
                  <div className="mt-3 space-y-3">
                    {suggestionCards.length ? (
                      suggestionCards.map((suggestion) => {
                        const alreadyApplied = applied.has(suggestion.id);
                        const feedback = suggestionFeedback[suggestion.id];
                        const isApplying = feedback?.state === "applying";

                        return (
                          <article
                            key={suggestion.id}
                            className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
                          >
                            <p className="font-semibold text-[#F0F4FF]">{suggestion.title}</p>
                            <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.62)]">{suggestion.description}</p>
                            {suggestion.preview ? (
                              <div className="mt-3 rounded-lg border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] px-3 py-2 text-xs leading-5 text-[#BFDBFE]">
                                {suggestion.preview}
                              </div>
                            ) : null}
                            {feedback?.state === "applying" ? (
                              <div className="mt-3 rounded-lg border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] px-3 py-2 text-xs leading-5 text-[#BFDBFE]">
                                {feedback.expectedIssueLabels.length ? (
                                  <p>{`Expected to address: ${feedback.expectedIssueLabels.join(", ")}`}</p>
                                ) : null}
                                {feedback.suggestion.expectedScoreDimensions.length ? (
                                  <p>{`Expected to improve: ${feedback.suggestion.expectedScoreDimensions.map(formatScoreDimension).join(", ")}`}</p>
                                ) : null}
                              </div>
                            ) : null}
                            {feedback?.state === "confirmed" ? (
                              <div className="mt-3 rounded-lg border border-[rgba(100,220,100,0.24)] bg-[rgba(100,220,100,0.08)] px-3 py-2 text-xs leading-5 text-[#CFFFD7]">
                                <p>Confirmed after fast recheck.</p>
                                {feedback.confirmedIssueLabels.length ? (
                                  <p>{`Resolved: ${feedback.confirmedIssueLabels.join(", ")}`}</p>
                                ) : null}
                                {feedback.improvedScoreDimensions.length ? (
                                  <p>{`Improved: ${feedback.improvedScoreDimensions.map(formatScoreDimension).join(", ")}`}</p>
                                ) : null}
                              </div>
                            ) : null}
                            {feedback?.state === "still_needs_work" ? (
                              <div className="mt-3 rounded-lg border border-[rgba(245,195,107,0.25)] bg-[rgba(245,195,107,0.08)] px-3 py-2 text-xs leading-5 text-[#F5D7A2]">
                                <p>Applied, still needs work after recheck.</p>
                                {feedback.remainingIssueLabels.length ? (
                                  <p>{`Still open: ${feedback.remainingIssueLabels.join(", ")}`}</p>
                                ) : (
                                  <p>Run a full review if you want a fresh round of broader suggestions.</p>
                                )}
                              </div>
                            ) : null}
                            <div className="mt-3 flex items-center gap-3">
                              <button
                                type="button"
                                disabled={alreadyApplied || isApplying}
                                onClick={() => void onApplySuggestion(suggestion)}
                                className="rounded-full border border-[rgba(59,130,246,0.26)] bg-[rgba(59,130,246,0.1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#93C5FD] transition-colors hover:border-[rgba(59,130,246,0.42)] hover:text-[#BFDBFE] disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                {isApplying ? "Applying..." : alreadyApplied ? "Applied" : suggestion.applyLabel}
                              </button>
                              <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">
                                {suggestion.category.replaceAll("_", " ")}
                              </span>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[rgba(240,244,255,0.6)]">
                        No rewrite suggestions right now. Keep the explicit title and skills coverage you already have.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
              Run the review to see where your page and ATS PDF are already strong, where searchability is thin, and whether the exported resume fits one page.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
          >
            {backLabel}
          </button>
        ) : null}
        {onContinue ? (
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className="gold-pill px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {continueLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
