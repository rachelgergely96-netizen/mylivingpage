"use client";

import { useState } from "react";
import { buildResumePdfFileName } from "@/lib/resume-export";
import type { ResumeData } from "@/types/resume";

interface DownloadResumeButtonProps {
  data: ResumeData;
  pageId: string;
  variantId?: string | null;
  className?: string;
  onErrorChange?: (message: string | null) => void;
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
    return "Unable to export the Resume PDF right now. Please try again.";
  }

  return message;
}

export default function DownloadResumeButton({
  data,
  pageId,
  variantId = null,
  className,
  onErrorChange,
}: DownloadResumeButtonProps) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    onErrorChange?.(null);
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
      onErrorChange?.(
        downloadError instanceof Error
          ? sanitizeDownloadErrorMessage(downloadError.message)
          : "PDF generation failed. Try again.",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={generating}
      className={`profile-action flex items-center gap-2 px-4 py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm ${className ?? ""}`}
    >
      {generating ? (
        <svg
          className="h-4 w-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
      )}
      <span>{generating ? "Preparing..." : "Download Resume PDF"}</span>
    </button>
  );
}
