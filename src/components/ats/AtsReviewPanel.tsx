"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AtsIssue,
  AtsProposalDecision,
  AtsProposalSection,
  AtsReviewSnapshot,
  AtsTargeting,
  ResumeData,
} from "@/types/resume";

interface AtsReviewPanelProps {
  data: ResumeData;
  review: AtsReviewSnapshot | null;
  targeting: AtsTargeting;
  reviewing: boolean;
  actionBusy?: boolean;
  onTargetingChange: (next: AtsTargeting) => void;
  onRunReview: () => void;
  onPrimaryAction?: (decision: AtsProposalDecision) => void | Promise<void>;
  onSecondaryAction?: (decision: AtsProposalDecision) => void | Promise<void>;
  onBack?: () => void;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
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

function formatSource(source: AtsProposalSection["source"]) {
  return source === "ai" ? "AI draft" : "ATS rule";
}

export default function AtsReviewPanel({
  data,
  review,
  targeting,
  reviewing,
  actionBusy = false,
  onTargetingChange,
  onRunReview,
  onPrimaryAction,
  onSecondaryAction,
  onBack,
  primaryActionLabel = "Apply selected changes",
  secondaryActionLabel = "Keep current version",
  backLabel = "Back",
  runReviewLabel = "Run Full ATS Review",
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
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const proposals = useMemo(() => review?.proposals ?? [], [review]);

  useEffect(() => {
    if (!review) {
      setSelectedProposalIds([]);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = null;
      setPreviewUrl(null);
      setPreviewLoading(false);
      setPreviewError(null);
      setPreviewSnapshotHash(null);
      return;
    }

    setSelectedProposalIds(proposals.map((proposal) => proposal.id));
  }, [proposals, review]);

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
      : previewSnapshotHash === review.contentHash
        ? "Preview up to date"
        : "Preview is stale";

  const reviewStatus = reviewing
    ? "Running full ATS review..."
    : actionBusy
      ? "Applying ATS changes..."
      : review
        ? review.mode === "fast"
          ? "Fast recheck complete."
          : "Full review complete."
        : null;

  const selectedCount = selectedProposalIds.length;
  const decision = useMemo<AtsProposalDecision>(() => {
    const proposalIds = proposals.map((proposal) => proposal.id);
    const selected = proposalIds.filter((proposalId) => selectedProposalIds.includes(proposalId));
    return {
      acceptedProposalIds: selected,
      declinedProposalIds: proposalIds.filter((proposalId) => !selected.includes(proposalId)),
      lastDecisionAt: review ? new Date().toISOString() : null,
    };
  }, [proposals, review, selectedProposalIds]);

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

      setPreviewError(error instanceof Error ? error.message : "Unable to load the ATS PDF preview.");
    } finally {
      setPreviewLoading(false);
      previewAbortRef.current = null;
    }
  };

  const toggleProposal = (proposalId: string, nextSelected: boolean) => {
    setSelectedProposalIds((current) => {
      if (nextSelected) {
        return Array.from(new Set([...current, proposalId]));
      }
      return current.filter((id) => id !== proposalId);
    });
  };

  const canAct = Boolean(review) && !reviewing && !actionBusy;

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

      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Targeting</p>
              <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.56)]">
                Set the title and keyword context you want the ATS review to optimize around.
              </p>
            </div>

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
                rows={6}
                className={`${inputClass} min-h-[150px] resize-y leading-6`}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">Review Summary</p>
            {review ? (
              <>
                <p className="mt-3 font-heading text-3xl text-[#F0F4FF]">
                  {proposals.length ? `${selectedCount}/${proposals.length}` : "Ready"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
                  {proposals.length
                    ? `${selectedCount} ATS-ready section changes selected. You can keep any part of your original wording and still continue.`
                    : "No section edits are being suggested right now. You can keep your current wording or rerun the review with different targeting."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.68)]">
                    Search {review.score.recruiterSearchability}
                  </span>
                  <span className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.68)]">
                    Readability {review.score.machineReadability}
                  </span>
                  <span className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.68)]">
                    {review.exportCheck.fitsOnOnePage ? "One-page fit" : `${review.exportCheck.pageCount} pages`}
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
                Run the review to see the before and after for any ATS-safe changes we recommend.
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onRunReview}
                disabled={reviewing || actionBusy || !data.name.trim()}
                className="gold-pill px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reviewing ? "Reviewing..." : runReviewLabel}
              </button>
              <p className="self-center text-xs text-[rgba(240,244,255,0.48)]">
                More searchable when exact titles and skills are explicit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {review ? (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Before / After</p>
                <h3 className="mt-2 font-heading text-xl font-semibold text-[#F0F4FF]">
                  {proposals.length ? "Review the ATS-ready edits before you continue" : "No ATS edits are being proposed"}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgba(240,244,255,0.58)]">
                  {proposals.length
                    ? "Each card shows one section we can tighten for machine visibility, recruiter search, or one-page fit. Keep anything that still feels like you."
                    : "This version is already in solid shape for the current targeting. You can keep it as is or rerun the review after changing the target role."}
                </p>
              </div>
              {proposals.length ? (
                <div className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.62)]">
                  {selectedCount} selected
                </div>
              ) : null}
            </div>

            {proposals.length ? (
              <div className="mt-5 grid gap-4">
                {proposals.map((proposal) => {
                  const selected = selectedProposalIds.includes(proposal.id);
                  return (
                    <article
                      key={proposal.id}
                      data-testid="ats-proposal-card"
                      className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-heading text-xl font-semibold text-[#F0F4FF]">{proposal.title}</p>
                            <span className="rounded-full border border-[rgba(255,255,255,0.12)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.56)]">
                              {formatSource(proposal.source)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.6)]">{proposal.reason}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => toggleProposal(proposal.id, true)}
                            className={`rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                              selected
                                ? "border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.12)] text-[#93C5FD]"
                                : "border border-[rgba(255,255,255,0.12)] text-[rgba(240,244,255,0.45)] hover:text-[#F0F4FF]"
                            }`}
                          >
                            Use This
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleProposal(proposal.id, false)}
                            className={`rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                              !selected
                                ? "border border-[rgba(245,195,107,0.25)] bg-[rgba(245,195,107,0.08)] text-[#F5D7A2]"
                                : "border border-[rgba(255,255,255,0.12)] text-[rgba(240,244,255,0.45)] hover:text-[#F0F4FF]"
                            }`}
                          >
                            Keep Mine
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(5,10,20,0.3)] p-4">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.42)]">Before</p>
                          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-6 text-[rgba(240,244,255,0.72)]">
                            {proposal.beforeText}
                          </pre>
                        </div>
                        <div className="rounded-xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] p-4">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-[#93C5FD]">After</p>
                          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-6 text-[#E8F2FF]">
                            {proposal.afterText}
                          </pre>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {proposal.expectedIssueIds.map((issueId) => (
                          <span
                            key={issueId}
                            className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.56)]"
                          >
                            {issueId.replaceAll("-", " ")}
                          </span>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-[rgba(100,220,100,0.24)] bg-[rgba(100,220,100,0.08)] p-4 text-sm leading-6 text-[#CFFFD7]">
                No before/after edits are being suggested right now. The ATS-safe export and searchability checks can stay behind Details whenever you want to inspect them.
              </div>
            )}
          </div>

          <details className="glass-card rounded-2xl p-4 sm:p-5">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Details</p>
                  <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
                    Review scores, remaining issues, one-page status, and the manual ATS PDF preview.
                  </p>
                </div>
                <div className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.62)]">
                  {review.issues.length} issues
                </div>
              </div>
            </summary>

            <div className="mt-5 space-y-4">
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
                      This is the plain one-column resume recruiters and systems see, separate from your public page.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.62)]">
                      {review.exportCheck.fitsOnOnePage ? "Fits one page" : `${review.exportCheck.pageCount} pages right now`}
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
                  {previewStatus}. Use this preview to confirm the ATS PDF stays clean, direct, and one-page ready before you download it.
                </p>
              </div>

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
            </div>
          </details>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-4 sm:p-5 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
          Run the review to see a simple before and after for any ATS-safe edits we recommend.
        </div>
      )}

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
        {onSecondaryAction ? (
          <button
            type="button"
            onClick={() => void onSecondaryAction(decision)}
            disabled={!canAct}
            className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {secondaryActionLabel}
          </button>
        ) : null}
        {onPrimaryAction ? (
          <button
            type="button"
            onClick={() => void onPrimaryAction(decision)}
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
