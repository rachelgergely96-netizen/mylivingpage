"use client";

import type {
  AtsIssue,
  AtsReviewSnapshot,
  AtsSuggestion,
  AtsTargeting,
  ResumeData,
} from "@/types/resume";

interface AtsReviewPanelProps {
  data: ResumeData;
  review: AtsReviewSnapshot | null;
  targeting: AtsTargeting;
  reviewing: boolean;
  onTargetingChange: (next: AtsTargeting) => void;
  onRunReview: () => void;
  onApplySuggestion: (suggestion: AtsSuggestion) => void;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  backLabel?: string;
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

export default function AtsReviewPanel({
  data,
  review,
  targeting,
  reviewing,
  onTargetingChange,
  onRunReview,
  onApplySuggestion,
  onBack,
  onContinue,
  continueLabel = "Continue",
  backLabel = "Back",
  stepLabel = "ATS Review",
  heading,
  body,
}: AtsReviewPanelProps) {
  const applied = new Set(review?.appliedSuggestionIds ?? []);
  const canContinue = Boolean(review) && !reviewing;

  return (
    <section data-testid="ats-review-panel" className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">{stepLabel}</p>
        <h2 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">{heading}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.62)]">{body}</p>
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
                {reviewing ? "Reviewing..." : "Run ATS Review"}
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
                    {review.suggestions.length ? (
                      review.suggestions.map((suggestion) => {
                        const alreadyApplied = applied.has(suggestion.id);

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
                            <div className="mt-3 flex items-center gap-3">
                              <button
                                type="button"
                                disabled={alreadyApplied}
                                onClick={() => onApplySuggestion(suggestion)}
                                className="rounded-full border border-[rgba(59,130,246,0.26)] bg-[rgba(59,130,246,0.1)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#93C5FD] transition-colors hover:border-[rgba(59,130,246,0.42)] hover:text-[#BFDBFE] disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                {alreadyApplied ? "Applied" : suggestion.applyLabel}
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
