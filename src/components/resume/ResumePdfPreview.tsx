"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ResumeData } from "@/types/resume";

interface ResumePdfPreviewProps {
  resumeData: ResumeData;
}

/**
 * Shows the actual PDF a recruiter receives.
 *
 * Owners were told their résumé is ATS-safe and fits one page, and scored on
 * exactly that, without ever being able to see the artifact — the only way to
 * look was to download it and open it outside the app.
 *
 * Rendered on demand rather than on mount: each preview is a real server-side
 * PDF render, and the editor should not spend one every time somebody scrolls
 * past this section.
 */
export default function ResumePdfPreview({ resumeData }: ResumePdfPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  // Bumped whenever the résumé changes or a new render starts, so a response
  // that arrives after its request went stale is dropped rather than shown.
  const renderGenerationRef = useRef(0);

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => releaseObjectUrl, [releaseObjectUrl]);

  // A stale PDF next to edited fields is worse than no PDF: it quietly
  // misrepresents what a recruiter would get.
  useEffect(() => {
    renderGenerationRef.current += 1;
    releaseObjectUrl();
    setPreviewUrl(null);
    setPageCount(null);
  }, [releaseObjectUrl, resumeData]);

  const renderPreview = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    renderGenerationRef.current += 1;
    const generation = renderGenerationRef.current;

    try {
      const response = await fetch("/api/resume/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          payload?.error ?? "Unable to render the résumé preview right now.",
        );
      }

      const headerCount = Number(response.headers.get("X-Resume-Page-Count"));
      const blob = await response.blob();

      if (generation !== renderGenerationRef.current) {
        return;
      }

      releaseObjectUrl();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setPreviewUrl(url);
      setPageCount(Number.isFinite(headerCount) && headerCount > 0 ? headerCount : null);
    } catch (previewError) {
      if (generation !== renderGenerationRef.current) {
        return;
      }
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Unable to render the résumé preview right now.",
      );
    } finally {
      if (generation === renderGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [loading, releaseObjectUrl, resumeData]);

  return (
    <section
      aria-labelledby="resume-pdf-preview-title"
      data-resume-pdf-preview
      className="site-panel p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="site-eyebrow">Résumé PDF</p>
          <h3 id="resume-pdf-preview-title" className="site-panel-title mt-1.5">
            See the file a recruiter downloads
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-site-muted">
            Rendered from the fields in this editor, including changes you have not saved
            yet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void renderPreview()}
          disabled={loading}
          className="site-button site-button-secondary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Rendering…" : previewUrl ? "Render again" : "Show the PDF"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-site-danger" role="alert">
          {error}
        </p>
      ) : null}

      {previewUrl ? (
        <div className="mt-4">
          {pageCount !== null ? (
            <p
              className={`mb-2 text-xs font-semibold ${
                pageCount === 1 ? "text-site-success" : "text-site-warning"
              }`}
              role="status"
            >
              {pageCount === 1
                ? "1 page."
                : `${pageCount} pages. More than one page is not automatically an ATS problem.`}
            </p>
          ) : null}
          <object
            data={previewUrl}
            type="application/pdf"
            aria-label="Résumé PDF preview"
            className="h-[32rem] w-full border border-site-border-strong bg-site-canvas-alt"
          >
            {/* Mobile browsers commonly refuse to embed PDFs. */}
            <p className="p-4 text-sm leading-6 text-site-secondary">
              Your browser cannot display the PDF inline.{" "}
              <a href={previewUrl} target="_blank" rel="noreferrer" className="site-link">
                Open it in a new tab
              </a>
              .
            </p>
          </object>
        </div>
      ) : null}
    </section>
  );
}
