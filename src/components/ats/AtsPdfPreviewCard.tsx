"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRecommendedOnePageCuts } from "@/lib/ats-review";
import type { AtsExportCheck, ResumeData } from "@/types/resume";

interface AtsPdfPreviewCardProps {
  resumeData: ResumeData;
  contentHash: string | null;
  exportCheck?: AtsExportCheck | null;
  title?: string;
  body?: string;
  autoGenerate?: boolean;
}

export default function AtsPdfPreviewCard({
  resumeData,
  contentHash,
  exportCheck = null,
  title = "Recommended ATS PDF preview",
  body = "This previews the current recommended one-column ATS version, not your public page.",
  autoGenerate = false,
}: AtsPdfPreviewCardProps) {
  const previewUrlRef = useRef<string | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewSnapshotHash, setPreviewSnapshotHash] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [fitsOnOnePage, setFitsOnOnePage] = useState<boolean | null>(null);

  useEffect(() => {
    return () => {
      previewAbortRef.current?.abort();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const refreshPreview = useCallback(async () => {
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
        body: JSON.stringify({ resumeData }),
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
      setPreviewSnapshotHash(contentHash);
      const nextPageCount = Number(response.headers.get("x-ats-page-count"));
      setPageCount(Number.isFinite(nextPageCount) ? nextPageCount : null);
      const headerFits = response.headers.get("x-ats-fits-one-page");
      setFitsOnOnePage(headerFits === null ? null : headerFits === "true");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setPreviewError(error instanceof Error ? error.message : "Unable to load the ATS PDF preview.");
    } finally {
      setPreviewLoading(false);
      previewAbortRef.current = null;
    }
  }, [contentHash, resumeData]);

  useEffect(() => {
    if (!autoGenerate || !contentHash) {
      return;
    }

    if (previewSnapshotHash === contentHash && previewUrl) {
      return;
    }

    void refreshPreview();
  }, [autoGenerate, contentHash, previewSnapshotHash, previewUrl, refreshPreview]);

  const displayPageCount = pageCount ?? exportCheck?.pageCount ?? null;
  const displayFitsOnOnePage = fitsOnOnePage ?? exportCheck?.fitsOnOnePage ?? null;
  const recommendedCuts = getRecommendedOnePageCuts(exportCheck);
  const previewStatus = !previewSnapshotHash
    ? "Preview not generated yet"
    : previewSnapshotHash === contentHash
      ? "Preview up to date"
      : "Preview is stale";

  return (
    <section className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">{title}</p>
          <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.62)]">{body}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {displayFitsOnOnePage !== null || displayPageCount !== null ? (
            <div className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.62)]">
              {displayFitsOnOnePage ? "Fits one page" : `${displayPageCount ?? "?"} pages`}
            </div>
          ) : null}
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
        {previewStatus}. {autoGenerate ? "Preview refreshes automatically when the draft changes, and you can refresh it manually anytime." : "Preview only refreshes when you ask for it."}
      </p>
      {displayFitsOnOnePage === false ? (
        <div className="mt-2 rounded-xl border border-[rgba(245,195,107,0.2)] bg-[rgba(245,195,107,0.08)] p-4">
          <p className="text-xs leading-6 text-[rgba(245,195,107,0.92)]">
            This ATS preview is usable now, even though it currently spans {displayPageCount ?? "multiple"} pages. We recommend these cuts if you want a one-page version.
          </p>
          {recommendedCuts.length ? (
            <ul className="mt-3 space-y-2 text-xs leading-6 text-[rgba(255,245,220,0.9)]">
              {recommendedCuts.map((cut) => (
                <li key={cut}>{cut}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
