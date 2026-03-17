import { describe, expect, it } from "vitest";
import { buildPageAnalyticsDashboard } from "@/lib/analytics/pageAnalytics";
import type {
  AnalyticsSectionId,
  AnalyticsTargetKey,
} from "@/lib/analytics/constants";

const NOW = new Date("2026-03-13T12:00:00.000Z");

function makeView({
  id,
  viewedAt,
  viewerIp,
  referrer = null,
  userAgent = null,
  country = null,
  engagedSeconds = null,
  maxScrollDepthPct = null,
  primarySection = null,
  hadOutboundClick = false,
}: {
  id: string;
  viewedAt: string;
  viewerIp: string;
  referrer?: string | null;
  userAgent?: string | null;
  country?: string | null;
  engagedSeconds?: number | null;
  maxScrollDepthPct?: number | null;
  primarySection?: AnalyticsSectionId | null;
  hadOutboundClick?: boolean;
}) {
  return {
    id,
    viewed_at: viewedAt,
    viewer_ip: viewerIp,
    referrer,
    user_agent: userAgent,
    country,
    engaged_seconds: engagedSeconds,
    max_scroll_depth_pct: maxScrollDepthPct,
    primary_section: primarySection,
    had_outbound_click: hadOutboundClick,
  };
}

function makeInteraction({
  pageViewId,
  targetKey,
  targetLabel = null,
  clickCount = 1,
}: {
  pageViewId: string;
  targetKey: AnalyticsTargetKey;
  targetLabel?: string | null;
  clickCount?: number;
}) {
  return {
    page_view_id: pageViewId,
    target_key: targetKey,
    target_label: targetLabel,
    click_count: clickCount,
  };
}

describe("page analytics aggregation", () => {
  it("builds range totals and previous-period comparisons", () => {
    const analytics = buildPageAnalyticsDashboard({
      rangeKey: "7d",
      allTimeViews: 18,
      now: NOW,
      views: [
        makeView({
          id: "view-current-1",
          viewedAt: "2026-03-12T16:10:00.000Z",
          viewerIp: "hash-a",
          referrer: "https://www.linkedin.com/feed/",
          userAgent: "Mozilla/5.0 (iPhone)",
          country: "US",
          engagedSeconds: 120,
          maxScrollDepthPct: 92,
          primarySection: "projects",
          hadOutboundClick: true,
        }),
        makeView({
          id: "view-current-2",
          viewedAt: "2026-03-11T12:05:00.000Z",
          viewerIp: "hash-b",
          referrer: "https://www.linkedin.com/in/sample/",
          userAgent: "Mozilla/5.0",
          country: "US",
          engagedSeconds: 90,
          maxScrollDepthPct: 80,
          primarySection: "projects",
          hadOutboundClick: true,
        }),
        makeView({
          id: "view-current-3",
          viewedAt: "2026-03-10T09:00:00.000Z",
          viewerIp: "hash-c",
          referrer: null,
          userAgent: "Mozilla/5.0 (Android Mobile)",
          country: "CA",
        }),
        makeView({
          id: "view-current-4",
          viewedAt: "2026-03-08T20:00:00.000Z",
          viewerIp: "hash-a",
          referrer: "https://portfolio.example.com/case-study",
          userAgent: "Mozilla/5.0",
          country: "US",
          engagedSeconds: 60,
          maxScrollDepthPct: 42,
          primarySection: "experience",
        }),
        makeView({
          id: "view-previous-1",
          viewedAt: "2026-03-05T10:00:00.000Z",
          viewerIp: "hash-d",
          referrer: null,
          userAgent: "Mozilla/5.0",
          country: "US",
        }),
        makeView({
          id: "view-previous-2",
          viewedAt: "2026-03-02T08:30:00.000Z",
          viewerIp: "hash-e",
          referrer: "https://example.com/ref",
          userAgent: "Mozilla/5.0 (iPad)",
          country: "GB",
        }),
      ],
      interactions: [
        makeInteraction({
          pageViewId: "view-current-1",
          targetKey: "project",
          targetLabel: "TraceBoard",
          clickCount: 2,
        }),
        makeInteraction({
          pageViewId: "view-current-2",
          targetKey: "email",
          targetLabel: "avery@sample.invalid",
          clickCount: 1,
        }),
      ],
    });

    expect(analytics.overview.views).toMatchObject({
      value: 4,
      previousValue: 2,
      status: "up",
      deltaPercent: 100,
      lowData: false,
    });
    expect(analytics.overview.uniqueVisitors.value).toBe(3);
    expect(analytics.overview.outboundCtr.value).toBe(50);
    expect(analytics.acquisition.topReferrers[0]).toMatchObject({
      label: "linkedin.com",
      count: 2,
    });
    expect(analytics.contentPerformance.topSection).toMatchObject({
      label: "Projects",
      count: 2,
    });
    expect(analytics.conversion.topActions[0]).toMatchObject({
      label: "Project: TraceBoard",
      count: 2,
    });
  });

  it("uses low-data fallbacks when a period is too sparse to compare cleanly", () => {
    const analytics = buildPageAnalyticsDashboard({
      rangeKey: "7d",
      allTimeViews: 1,
      now: NOW,
      views: [
        makeView({
          id: "view-current-1",
          viewedAt: "2026-03-12T16:10:00.000Z",
          viewerIp: "hash-a",
        }),
      ],
      interactions: [],
    });

    expect(analytics.overview.views.lowData).toBe(true);
    expect(analytics.overview.views.deltaPercent).toBeNull();
    expect(analytics.state.lowData).toBe(true);
  });

  it("respects the selected range when aggregating 30-day and 90-day views", () => {
    const views = [
      makeView({
        id: "view-7d",
        viewedAt: "2026-03-11T12:05:00.000Z",
        viewerIp: "hash-a",
      }),
      makeView({
        id: "view-30d",
        viewedAt: "2026-02-20T12:05:00.000Z",
        viewerIp: "hash-b",
      }),
      makeView({
        id: "view-90d",
        viewedAt: "2026-01-20T12:05:00.000Z",
        viewerIp: "hash-c",
      }),
    ];

    const last30Days = buildPageAnalyticsDashboard({
      rangeKey: "30d",
      allTimeViews: 3,
      now: NOW,
      views,
      interactions: [],
    });
    const last90Days = buildPageAnalyticsDashboard({
      rangeKey: "90d",
      allTimeViews: 3,
      now: NOW,
      views,
      interactions: [],
    });

    expect(last30Days.overview.views.value).toBe(2);
    expect(last90Days.overview.views.value).toBe(3);
  });
});
