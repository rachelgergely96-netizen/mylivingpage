"use client";

import { useEffect, useRef, useState } from "react";

interface DashboardCopyLinkButtonProps {
  label: string;
  livePath: string;
  pageId: string;
}

export default function DashboardCopyLinkButton({
  label,
  livePath,
  pageId,
}: DashboardCopyLinkButtonProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
  }, []);

  const copyLiveLink = async () => {
    const liveUrl = `${window.location.origin}${livePath}`;

    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopyState("copied");

      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "page.share.copy_link",
          metadata: {
            page_id: pageId,
            surface: "dashboard_signal_desk",
            mode: "link_only",
            share_path: livePath,
          },
        }),
        keepalive: true,
      }).catch(() => {
        // Tracking should never block the share action.
      });

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => {
        resetTimerRef.current = null;
        setCopyState("idle");
      }, 2400);
    } catch {
      setCopyState("error");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => void copyLiveLink()}
        className="site-button site-button-primary w-full sm:w-auto"
      >
        {copyState === "copied" ? "Link copied" : label}
      </button>
      {copyState === "error" ? (
        <p className="mt-2 max-w-xs text-xs leading-5 text-site-danger" role="alert">
          The link could not be copied. Open the live page and copy its address instead.
        </p>
      ) : null}
      {copyState === "copied" ? (
        <p className="sr-only" role="status">Live page link copied.</p>
      ) : null}
    </div>
  );
}
