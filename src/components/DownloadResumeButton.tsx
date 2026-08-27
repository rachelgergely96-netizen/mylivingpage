"use client";

import React, { useState } from "react";
import ModeAwareLoadingIndicator from "@/components/motion/ModeAwareLoadingIndicator";
import { buildResumePdfFileName } from "@/lib/resume-export";
import type { ResumeData } from "@/types/resume";

interface DownloadResumeButtonProps {
  data: ResumeData;
  pageId: string;
  variantId?: string | null;
  className?: string;
  compactLabel?: string;
  onErrorChange?: (message: string | null) => void;
  appearance?: "site" | "theme";
}

function sanitizeDownloadErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("minified react error") ||
    normalized.includes("invariant violation") ||
    normalized.includes("objects are not valid as a react child") ||
    normalized.includes("resume pdf could not") ||
    normalized.includes("current content")
  ) {
    return "Unable to export the Résumé PDF right now. Please try again.";
  }

  return message;
}

export default function DownloadResumeButton({
  data,
  pageId,
  variantId = null,
  className,
  compactLabel,
  onErrorChange,
  appearance = "theme",
}: DownloadResumeButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  const reportError = (message: string | null) => {
    if (onErrorChange) {
      onErrorChange(message);
      return;
    }
    setFallbackError(message);
  };

  const handleDownload = async () => {
    setGenerating(true);
    reportError(null);
    try {
      const response = await fetch("/api/resume/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, variantId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "PDF generation failed. Try again.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildResumePdfFileName(data.name);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      reportError(
        downloadError instanceof Error
          ? sanitizeDownloadErrorMessage(downloadError.message)
          : "PDF generation failed. Try again.",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={generating}
        aria-busy={generating || undefined}
        aria-label={
          compactLabel
            ? generating
              ? "Preparing Résumé PDF"
              : "Download Résumé PDF"
            : undefined
        }
        className={`${appearance === "site"
          ? "site-button site-button-secondary"
          : "motion-responsive-control flex min-h-12 items-center gap-2 rounded-none border border-[var(--theme-accent-border)] bg-[var(--theme-accent-soft)] px-4 py-2.5 text-[13px] font-semibold text-[var(--theme-accent-bright)] transition-transform duration-300 ease-soft hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-bright)] disabled:hover:translate-y-0 sm:text-sm"
        } disabled:opacity-60 ${className ?? ""}`}
      >
        {generating ? (
          <ModeAwareLoadingIndicator appearance="current" size="sm" />
        ) : (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
        )}
        <span className="grid">
          <span
            aria-hidden={generating || undefined}
            className={`col-start-1 row-start-1 ${generating ? "invisible" : ""} ${compactLabel ? "md:hidden" : ""}`}
          >
            Download Résumé PDF
          </span>
          {compactLabel ? (
            <span
              aria-hidden={generating || undefined}
              className={`col-start-1 row-start-1 hidden md:inline ${generating ? "invisible" : ""}`}
            >
              {compactLabel}
            </span>
          ) : null}
          <span
            aria-hidden={!generating || undefined}
            className={`col-start-1 row-start-1 ${generating ? "" : "invisible"} ${compactLabel ? "md:hidden" : ""}`}
          >
            Preparing PDF…
          </span>
          {compactLabel ? (
            <span
              aria-hidden={!generating || undefined}
              className={`col-start-1 row-start-1 hidden md:inline ${generating ? "" : "invisible"}`}
            >
              Preparing…
            </span>
          ) : null}
        </span>
      </button>
      {fallbackError ? (
        <p
          role="alert"
          className={`mt-2 flex w-full items-start gap-2 px-3 py-2 text-xs leading-5 ${
            appearance === "site"
              ? "site-alert-danger"
              : "rounded-none border border-current"
          }`}
        >
          <svg
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.75v3.75" strokeLinecap="square" />
            <path d="M8 11.25h.01" strokeLinecap="round" />
          </svg>
          <span>{fallbackError}</span>
        </p>
      ) : null}
    </>
  );
}
