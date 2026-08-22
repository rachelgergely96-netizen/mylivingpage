"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import type { AnalyticsRangeKey } from "@/lib/analytics/constants";
import {
  consumeClientAnalyticsRangeIntent,
  getAnalyticsRangeMotionRenderKey,
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

interface AnalyticsRangeMotionContextValue {
  resolution: AnalyticsRangeMotionResolution | null;
  resolved: boolean;
}

const AnalyticsRangeMotionContext =
  createContext<AnalyticsRangeMotionContextValue | null>(null);

export function AnalyticsRangeMotionBoundary({
  availability,
  children,
  lowData,
  pageId,
  rangeKey,
}: AnalyticsRangeMotionBoundaryProps) {
  const [resolution, setResolution] =
    useState<AnalyticsRangeMotionResolution | null>(null);
  const handledRenderKeyRef = useRef<string | null>(null);
  const isUnavailable = availability === "unavailable";
  const canResolve = !isUnavailable && !lowData;

  useEffect(() => {
    const renderKey = getAnalyticsRangeMotionRenderKey(
      pageId,
      rangeKey,
      canResolve,
    );
    // React Strict Mode replays effect setup on the same mounted instance.
    // The first setup consumes the one-shot intent; the replay must preserve
    // that resolution rather than clearing it and finding nothing to consume.
    if (handledRenderKeyRef.current === renderKey) {
      return;
    }
    handledRenderKeyRef.current = renderKey;

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
      data-motion-signal={
        isUnavailable ? undefined : MOTION_SIGNALS.EDIT_TO_PROOF
      }
      data-motion-state={
        isUnavailable
          ? "unavailable"
          : lowData
            ? "low-data"
            : resolved
              ? "resolved"
              : undefined
      }
    >
      <AnalyticsRangeMotionContext.Provider
        value={{ resolution, resolved }}
      >
        {children}
      </AnalyticsRangeMotionContext.Provider>
    </div>
  );
}

export function AnalyticsRangeMotionTarget({
  children,
  rangeLabel,
}: {
  children: ReactNode;
  rangeLabel: string;
}) {
  const context = useContext(AnalyticsRangeMotionContext);
  const resolved = context?.resolved ?? false;

  return (
    <div
      data-analytics-range-summary
      data-motion-event={
        resolved ? MOTION_EVENTS.ANALYTICS_RANGE_UPDATED : undefined
      }
      data-motion-signal={resolved ? MOTION_SIGNALS.EDIT_TO_PROOF : undefined}
      data-motion-state={resolved ? "resolved" : undefined}
      data-motion-sequence={
        resolved ? context?.resolution?.sequence : undefined
      }
      data-motion-target={resolved ? "summary-metrics" : undefined}
    >
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-analytics-range-update-status
        className="sr-only"
      >
        {resolved ? `Activity summary updated for ${rangeLabel.toLowerCase()}.` : ""}
      </p>
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
