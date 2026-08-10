"use client";

import { useCallback, useState } from "react";
import ContactOwnerButton from "@/components/ContactOwnerButton";
import DownloadResumeButton from "@/components/DownloadResumeButton";
import ShareCardDownload from "@/components/ShareCardDownload";
import type { ResumeData } from "@/types/resume";

interface PublicPageActionDockProps {
  pageId: string;
  isOwner: boolean;
  slug: string;
  themeId: string;
  resumeData: ResumeData;
  variantId?: string | null;
  liveUrl?: string;
  shareCardEnabled?: boolean;
  analyticsHref?: string;
  analyticsCtaLabel?: string;
  avoidBadge?: boolean;
}

/* Opaque surface so the fixed dock stays legible over any theme artwork. */
const dockButtonClassName =
  "w-full justify-center bg-site-surface-raised shadow-[var(--site-shadow-raised)]";

export default function PublicPageActionDock({
  pageId,
  isOwner,
  slug,
  themeId,
  resumeData,
  variantId = null,
  liveUrl,
  shareCardEnabled = true,
  analyticsHref,
  analyticsCtaLabel,
  avoidBadge = false,
}: PublicPageActionDockProps) {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const dockBottomClass = avoidBadge
    ? "bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] lg:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]"
    : "bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]";

  const handleDownloadErrorChange = useCallback((message: string | null) => {
    setDownloadError(message);
  }, []);

  return (
    <div className={`fixed right-5 z-40 w-72 max-w-[calc(100vw-2.5rem)] ${dockBottomClass}`} data-site-ui>
      <div className="flex w-full flex-col items-stretch gap-2">
        {downloadError ? (
          <div
            data-testid="public-action-dock-error"
            className="site-alert-danger flex w-full items-center gap-2 py-1 pl-3.5 pr-1 text-left text-xs leading-5 shadow-[var(--site-shadow-raised)]"
            role="alert"
          >
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 4.75v3.75" strokeLinecap="square" />
              <path d="M8 11.25h.01" strokeLinecap="round" />
            </svg>
            <span className="min-w-0 flex-1 py-1">{downloadError}</span>
            <button
              type="button"
              onClick={() => setDownloadError(null)}
              className="site-icon-button shrink-0 border-0 text-site-danger"
              aria-label="Dismiss error"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}

        {/* The owner already has their own address; only a visitor needs this. */}
        {isOwner ? null : (
          <ContactOwnerButton
            resumeData={resumeData}
            className="w-full justify-center shadow-[var(--site-shadow-raised)]"
          />
        )}

        <DownloadResumeButton
          data={resumeData}
          pageId={pageId}
          variantId={variantId}
          appearance="site"
          onErrorChange={handleDownloadErrorChange}
          className={dockButtonClassName}
        />

        <ShareCardDownload
          pageId={pageId}
          isOwner={isOwner}
          slug={slug}
          themeId={themeId}
          resumeData={resumeData}
          liveUrl={liveUrl}
          variantId={variantId}
          analyticsHref={analyticsHref}
          analyticsCtaLabel={analyticsCtaLabel}
          enabled={shareCardEnabled}
          className={dockButtonClassName}
        />
      </div>
    </div>
  );
}
