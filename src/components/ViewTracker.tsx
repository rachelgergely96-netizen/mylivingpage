"use client";

import { useEffect, useRef } from "react";
import type {
  AnalyticsSectionId,
  AnalyticsTargetKey,
} from "@/lib/analytics/constants";

interface ViewTrackerProps {
  pageId: string;
}

interface ClickAggregate {
  count: number;
  targetKey: AnalyticsTargetKey;
  targetLabel: string | null;
}

interface ViewResponse {
  deduped?: boolean;
  ignored?: boolean;
  pageViewId?: string;
}

export default function ViewTracker({ pageId }: ViewTrackerProps) {
  const pageViewIdRef = useRef<string | null>(null);
  const clicksRef = useRef(new Map<string, ClickAggregate>());
  const sectionRatiosRef = useRef(new Map<AnalyticsSectionId, number>());
  const sectionTimesRef = useRef(new Map<AnalyticsSectionId, number>());
  const activeSectionRef = useRef<AnalyticsSectionId | null>(null);
  const activeSectionSinceRef = useRef<number | null>(null);
  const maxScrollDepthRef = useRef(0);
  const lastPayloadRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const scrollRoot = document.querySelector<HTMLElement>(
      "[data-analytics-scroll-root='true']",
    );
    const trackedSections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-analytics-section]"),
    );

    const snapshotSectionTimes = () => {
      const now = performance.now();
      const sectionTimes = new Map(sectionTimesRef.current);

      if (activeSectionRef.current && activeSectionSinceRef.current !== null) {
        sectionTimes.set(
          activeSectionRef.current,
          (sectionTimes.get(activeSectionRef.current) ?? 0) +
            Math.max(0, now - activeSectionSinceRef.current),
        );
      }

      return sectionTimes;
    };

    const pickActiveSection = () => {
      const ratios = Array.from(sectionRatiosRef.current.entries()).sort(
        (left, right) => right[1] - left[1],
      );

      if (ratios[0] && ratios[0][1] > 0) {
        return ratios[0][0];
      }

      const firstSection = trackedSections[0]?.dataset.analyticsSection;
      return firstSection ? (firstSection as AnalyticsSectionId) : null;
    };

    const syncActiveSection = () => {
      const nextSection = pickActiveSection();
      if (nextSection === activeSectionRef.current) {
        return;
      }

      const now = performance.now();
      const previousSection = activeSectionRef.current;

      if (previousSection && activeSectionSinceRef.current !== null) {
        sectionTimesRef.current.set(
          previousSection,
          (sectionTimesRef.current.get(previousSection) ?? 0) +
            Math.max(0, now - activeSectionSinceRef.current),
        );
      }

      activeSectionRef.current = nextSection;
      activeSectionSinceRef.current =
        nextSection && document.visibilityState === "visible" ? now : null;
    };

    const updateScrollDepth = () => {
      if (!scrollRoot) {
        return;
      }

      const scrollHeight = scrollRoot.scrollHeight;
      if (scrollHeight <= 0) {
        return;
      }

      const visibleBottom = scrollRoot.scrollTop + scrollRoot.clientHeight;
      const depth = Math.round((visibleBottom / scrollHeight) * 100);
      maxScrollDepthRef.current = Math.max(maxScrollDepthRef.current, depth);
    };

    const buildPayload = () => {
      if (!pageViewIdRef.current) {
        return null;
      }

      const sectionTimes = snapshotSectionTimes();
      const engagedMilliseconds = Array.from(sectionTimes.values()).reduce(
        (sum, value) => sum + value,
        0,
      );
      const primarySection =
        Array.from(sectionTimes.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ??
        null;

      return {
        pageId,
        pageViewId: pageViewIdRef.current,
        engagedSeconds: Math.round(engagedMilliseconds / 1000),
        maxScrollDepthPct: maxScrollDepthRef.current,
        primarySection,
        clicks: Array.from(clicksRef.current.values()).map((click) => ({
          targetKey: click.targetKey,
          targetLabel: click.targetLabel,
          count: click.count,
        })),
      };
    };

    const sendEngagement = (reason: "click" | "pagehide") => {
      const payload = buildPayload();
      if (!payload) {
        return;
      }

      const body = JSON.stringify(payload);
      if (body === lastPayloadRef.current) {
        return;
      }

      lastPayloadRef.current = body;

      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon("/api/pages/engagement", blob)) {
          return;
        }
      }

      void fetch("/api/pages/engagement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
        keepalive: reason === "pagehide",
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (activeSectionRef.current && activeSectionSinceRef.current !== null) {
          const now = performance.now();
          sectionTimesRef.current.set(
            activeSectionRef.current,
            (sectionTimesRef.current.get(activeSectionRef.current) ?? 0) +
              Math.max(0, now - activeSectionSinceRef.current),
          );
          activeSectionSinceRef.current = null;
        }

        sendEngagement("pagehide");
        return;
      }

      if (activeSectionRef.current && activeSectionSinceRef.current === null) {
        activeSectionSinceRef.current = performance.now();
      }
    };

    const handlePageHide = () => {
      if (activeSectionRef.current && activeSectionSinceRef.current !== null) {
        const now = performance.now();
        sectionTimesRef.current.set(
          activeSectionRef.current,
          (sectionTimesRef.current.get(activeSectionRef.current) ?? 0) +
            Math.max(0, now - activeSectionSinceRef.current),
        );
        activeSectionSinceRef.current = null;
      }

      sendEngagement("pagehide");
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const anchor = event.target.closest<HTMLAnchorElement>(
        "a[data-analytics-target-key]",
      );
      if (!anchor) {
        return;
      }

      const targetKey = anchor.dataset.analyticsTargetKey as AnalyticsTargetKey | undefined;
      if (!targetKey) {
        return;
      }

      const targetLabel = anchor.dataset.analyticsTargetLabel?.trim() || null;
      const mapKey = `${targetKey}::${targetLabel ?? ""}`;
      const existing = clicksRef.current.get(mapKey);

      clicksRef.current.set(mapKey, {
        targetKey,
        targetLabel,
        count: (existing?.count ?? 0) + 1,
      });

      sendEngagement("click");
    };

    updateScrollDepth();
    activeSectionRef.current = pickActiveSection();
    activeSectionSinceRef.current =
      activeSectionRef.current && document.visibilityState === "visible"
        ? performance.now()
        : null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const sectionId = entry.target.getAttribute("data-analytics-section");
          if (!sectionId) {
            continue;
          }

          sectionRatiosRef.current.set(
            sectionId as AnalyticsSectionId,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        }

        syncActiveSection();
      },
      {
        root: scrollRoot ?? null,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    trackedSections.forEach((section) => observer.observe(section));
    scrollRoot?.addEventListener("scroll", updateScrollDepth, { passive: true });
    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    void fetch("/api/pages/view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pageId }),
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as ViewResponse;
      })
      .then((payload) => {
        if (cancelled || !payload || payload.ignored || !payload.pageViewId) {
          return;
        }

        pageViewIdRef.current = payload.pageViewId;
      })
      .catch(() => {
        // Analytics should never interrupt the public page experience.
      });

    return () => {
      observer.disconnect();
      scrollRoot?.removeEventListener("scroll", updateScrollDepth);
      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      handlePageHide();
      cancelled = true;
    };
  }, [pageId]);

  return null;
}
