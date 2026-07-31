"use client";

import React, { useEffect, useRef, useState } from "react";

interface AnalyticsCopyLinkButtonProps {
  publicPath: string;
  pageId?: string;
}

export default function AnalyticsCopyLinkButton({
  publicPath,
  pageId,
}: AnalyticsCopyLinkButtonProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
  }, []);

  const copyLink = async () => {
    const liveUrl = `${window.location.origin}${publicPath}`;

    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopyState("copied");

      if (pageId) {
        void fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: "page.share.copy_link",
            metadata: {
              page_id: pageId,
              surface: "page_analytics",
              mode: "link_only",
              share_path: publicPath,
            },
          }),
          keepalive: true,
        }).catch(() => {
          // Tracking should never block the share action.
        });
      }

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
    <div className="inline-flex flex-col items-center">
      <button
        type="button"
        onClick={() => void copyLink()}
        className="site-button site-button-primary px-5"
      >
        {copyState === "copied" ? "Link copied" : "Copy your link"}
      </button>
      {copyState === "error" ? (
        <p className="mt-2 max-w-xs text-xs leading-5 text-site-danger" role="alert">
          The link could not be copied. Open your live page and copy its address instead.
        </p>
      ) : null}
      {copyState === "copied" ? (
        <p className="sr-only" role="status">
          Page link copied.
        </p>
      ) : null}
    </div>
  );
}
