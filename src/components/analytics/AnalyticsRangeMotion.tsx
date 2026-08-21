"use client";

import React, { useEffect, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import type { AnalyticsRangeKey } from "@/lib/analytics/constants";
import {
  consumeClientAnalyticsRangeIntent,
  isCurrentAnalyticsRangeMotionResolution,
  markClientAnalyticsRangeIntent,
  type AnalyticsRangeMotionResolution,
} from "@/lib/analytics/range-motion-intent";
import { MOTION_EVENTS, MOTION_SIGNALS } from "@/lib/motion";
import type { PageAnalyticsAvailability } from "@/lib/analytics/pageAnalytics";

interface AnalyticsRangeMotionBoundaryProps {
  availability: PageAnalyticsAvailability;
  children: ReactNode;
  lowData: boolean;
  pageId: string;
  rangeKey: AnalyticsRangeKey;
}

export function AnalyticsRangeMotionBoundary({
  availability,
  children,
  lowData,
  pageId,
  rangeKey,
}: AnalyticsRangeMotionBoundaryProps) {
  const [resolution, setResolution] =
    useState<AnalyticsRangeMotionResolution | null>(null);
  const isUnavailable = availability === "unavailable";
  const canResolve = !isUnavailable && !lowData;

  useEffect(() => {
    // A client boundary can survive an App Router query navigation. Clear the
    // previous range before consuming the intent for these rendered props so
    // Back/direct navigation cannot replay an earlier semantic event.
    setResolution(null);
    const intent = consumeClientAnalyticsRangeIntent({
      pageId,
      renderedRange: rangeKey,
      canResolve,
    });

    if (intent) {
      setResolution({ rangeKey, sequence: intent.sequence });
    }
  }, [canResolve, pageId, rangeKey]);

  const resolved = isCurrentAnalyticsRangeMotionResolution(
    resolution,
    rangeKey,
    canResolve,
  );

  return (
    <div
      className="space-y-6 font-site"
      data-motion-event={resolved ? MOTION_EVENTS.ANALYTICS_RANGE_UPDATED : undefined}
      data-motion-signal={MOTION_SIGNALS.EDIT_TO_PROOF}
      data-motion-state={
        isUnavailable
          ? "unavailable"
          : lowData
            ? "low-data"
            : resolved
              ? "resolved"
              : undefined
      }
      data-motion-target={resolved ? rangeKey : undefined}
      data-motion-sequence={resolved ? resolution.sequence : undefined}
    >
      {children}
    </div>
  );
}

interface AnalyticsRangeLinkProps {
  currentRange: AnalyticsRangeKey;
  pageId: string;
  targetRange: AnalyticsRangeKey;
}

export function AnalyticsRangeLink({
  currentRange,
  pageId,
  targetRange,
}: AnalyticsRangeLinkProps) {
  const active = currentRange === targetRange;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      active ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    markClientAnalyticsRangeIntent({
      pageId,
      fromRange: currentRange,
      toRange: targetRange,
    });
  }

  return (
    <Link
      href={`/dashboard/analytics/${pageId}?range=${targetRange}`}
      aria-current={active ? "page" : undefined}
      className={`site-button px-4 py-2 text-xs ${
        active
          ? "border-site-action bg-site-selected text-site-action"
          : "site-button-secondary"
      }`}
      data-analytics-range-target={targetRange}
      onClick={handleClick}
    >
      {targetRange.replace("d", " days")}
    </Link>
  );
}
