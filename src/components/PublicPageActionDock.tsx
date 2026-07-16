"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DownloadResumeButton from "@/components/DownloadResumeButton";
import ShareCardDownload from "@/components/ShareCardDownload";
import type { ResumeData } from "@/types/resume";

interface PublicPageActionDockProps {
  pageId: string;
  pageUserId: string;
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

export default function PublicPageActionDock({
  pageId,
  pageUserId,
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
  const clearTimerRef = useRef<number | null>(null);
  const dockBottomClass = avoidBadge
    ? "bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] lg:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]"
    : "bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]";

  const handleDownloadErrorChange = useCallback((message: string | null) => {
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }

    setDownloadError(message);

    if (message) {
      clearTimerRef.current = window.setTimeout(() => {
        setDownloadError(null);
        clearTimerRef.current = null;
      }, 4000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={`fixed right-4 z-40 w-72 max-w-[calc(100vw-2rem)] ${dockBottomClass} sm:right-5`}>
      <div className="profile-window w-full">
        <div className="profile-titlebar">
          <span>Profile actions</span>
          <span>Share or save</span>
        </div>
        <div className="flex flex-col items-stretch gap-2 p-2.5">
        {downloadError ? (
          <p
            data-testid="public-action-dock-error"
            role="alert"
            aria-live="polite"
            className="w-full border border-[rgba(255,142,142,0.18)] bg-[rgba(255,120,120,0.06)] px-3.5 py-2 text-left text-xs leading-5 text-[#ff9f9f]"
          >
            {downloadError}
          </p>
        ) : null}

        <DownloadResumeButton
          data={resumeData}
          pageId={pageId}
          variantId={variantId}
          onErrorChange={handleDownloadErrorChange}
          className="w-full justify-center"
        />

        <ShareCardDownload
          pageId={pageId}
          pageUserId={pageUserId}
          slug={slug}
          themeId={themeId}
          resumeData={resumeData}
          liveUrl={liveUrl}
          variantId={variantId}
          analyticsHref={analyticsHref}
          analyticsCtaLabel={analyticsCtaLabel}
          enabled={shareCardEnabled}
          className="w-full justify-center"
        />
        </div>
      </div>
    </div>
  );
}
