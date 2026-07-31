"use client";

import React, { useEffect, useRef, useState } from "react";

interface DashboardCopyLinkButtonProps {
  emphasis?: "primary" | "secondary";
  label: string;
  livePath: string;
  pageId: string;
}

export default function DashboardCopyLinkButton({
  emphasis = "primary",
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
    <div className={emphasis === "secondary" ? "inline-flex flex-col" : undefined}>
      <button
        type="button"
        onClick={() => void copyLiveLink()}
        className={`site-button ${
          emphasis === "primary"
            ? "site-button-primary w-full sm:w-auto sm:min-w-[10.5rem]"
            : "site-button-secondary px-3 py-2 sm:min-w-[8rem] sm:px-4"
        }`}
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
