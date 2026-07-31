import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPageAnalyticsDashboard,
  fetchPageAnalyticsDashboard,
} from "@/lib/analytics/pageAnalytics";
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

interface MockQueryRequest {
  table: string;
  select: string;
  eqFilters: Record<string, unknown>;
  gteFilters: Record<string, unknown>;
  inFilters: Record<string, unknown[]>;
  order: { column: string; ascending?: boolean } | null;
}

type MockQueryResponse = {
  data: unknown;
  error: unknown;
};

function createMockSupabase(
  resolve: (request: MockQueryRequest) => MockQueryResponse | Promise<MockQueryResponse>,
) {
  return {
    from(table: string) {
      return {
        select(select: string) {
          const request: MockQueryRequest = {
            table,
            select,
            eqFilters: {},
            gteFilters: {},
            inFilters: {},
            order: null,
          };

          const builder = {
            eq(column: string, value: unknown) {
              request.eqFilters[column] = value;
              return builder;
            },
            gte(column: string, value: unknown) {
              request.gteFilters[column] = value;
              return builder;
            },
            order(column: string, options?: { ascending?: boolean }) {
              request.order = { column, ascending: options?.ascending };
              return Promise.resolve(resolve(request));
            },
            in(column: string, values: unknown[]) {
              request.inFilters[column] = values;
              return Promise.resolve(resolve(request));
            },
          };

          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("page analytics aggregation", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

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
    expect(analytics.followUp).toMatchObject({
      repeatVisitors: 1,
      recentViews: 2,
      latestReferrerLabel: "linkedin.com",
      repeatViewAlert: true,
      suggestedTimingLabel: "Follow up today",
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

  it("uses qualitative insight copy below the percent sample threshold", () => {
    const analytics = buildPageAnalyticsDashboard({
      rangeKey: "7d",
      allTimeViews: 2,
      now: NOW,
      views: [
        makeView({
          id: "view-1",
          viewedAt: "2026-03-12T10:00:00.000Z",
          viewerIp: "hash-a",
          referrer: "https://www.linkedin.com/feed/",
          engagedSeconds: 90,
          primarySection: "projects",
          hadOutboundClick: true,
        }),
        makeView({
          id: "view-2",
          viewedAt: "2026-03-11T10:00:00.000Z",
          viewerIp: "hash-b",
          referrer: "https://www.linkedin.com/in/sample/",
          engagedSeconds: 60,
          primarySection: "projects",
        }),
      ],
      interactions: [makeInteraction({ pageViewId: "view-1", targetKey: "email" })],
    });

    expect(analytics.insights.length).toBeGreaterThan(0);
    for (const insight of analytics.insights) {
      expect(insight).not.toContain("%");
    }
  });

  it("uses percent insight copy once the sample reaches the threshold", () => {
    const analytics = buildPageAnalyticsDashboard({
      rangeKey: "7d",
      allTimeViews: 3,
      now: NOW,
      views: ["hash-a", "hash-b", "hash-c"].map((viewerIp, index) =>
        makeView({
          id: `view-${index + 1}`,
          viewedAt: `2026-03-1${index}T10:00:00.000Z`,
          viewerIp,
          referrer: "https://www.linkedin.com/feed/",
          engagedSeconds: 90,
          primarySection: "projects",
          hadOutboundClick: index === 0,
        }),
      ),
      interactions: [makeInteraction({ pageViewId: "view-1", targetKey: "email" })],
    });

    expect(analytics.insights.some((insight) => insight.includes("%"))).toBe(true);
  });

  it("returns full analytics when the engagement schema is available", async () => {
    const requests: MockQueryRequest[] = [];
    const supabase = createMockSupabase((request) => {
      requests.push(request);

      if (request.table === "page_views") {
        return {
          data: [
            makeView({
              id: "view-current-1",
              viewedAt: "2026-03-12T16:10:00.000Z",
              viewerIp: "hash-a",
              referrer: "https://www.linkedin.com/feed/",
              userAgent: "Mozilla/5.0",
              country: "US",
              engagedSeconds: 120,
              maxScrollDepthPct: 80,
              primarySection: "projects",
              hadOutboundClick: true,
            }),
          ],
          error: null,
        };
      }

      if (request.table === "page_interactions") {
        return {
          data: [
            makeInteraction({
              pageViewId: "view-current-1",
              targetKey: "project",
              targetLabel: "TraceBoard",
            }),
          ],
          error: null,
        };
      }

      return {
        data: [],
        error: null,
      };
    });

    const analytics = await fetchPageAnalyticsDashboard({
      supabase,
      pageId: "page-1",
      rangeKey: "7d",
      allTimeViews: 12,
      now: NOW,
    });

    expect(analytics.state.availability).toBe("full");
    expect(analytics.state.notice).toBeNull();
    expect(analytics.overview.views.value).toBe(1);
    expect(analytics.conversion.topActions[0]).toMatchObject({
      label: "Project: TraceBoard",
      count: 1,
    });
    expect(requests.map((request) => request.table)).toEqual([
      "page_views",
      "page_interactions",
    ]);
  });

  it("falls back to basic traffic analytics when engagement columns are missing", async () => {
    const requests: MockQueryRequest[] = [];
    const supabase = createMockSupabase((request) => {
      requests.push(request);

      if (request.table !== "page_views") {
        return {
          data: [],
          error: null,
        };
      }

      if (request.select.includes("engaged_seconds")) {
        return {
          data: null,
          error: {
            code: "42703",
            message: 'column "engaged_seconds" does not exist',
          },
        };
      }

      return {
        data: [
          {
            id: "legacy-view-1",
            viewed_at: "2026-03-12T16:10:00.000Z",
            viewer_ip: "hash-a",
            referrer: "https://www.linkedin.com/feed/",
            user_agent: "Mozilla/5.0",
            country: "US",
          },
        ],
        error: null,
      };
    });

    const analytics = await fetchPageAnalyticsDashboard({
      supabase,
      pageId: "page-1",
      rangeKey: "7d",
      allTimeViews: 12,
      now: NOW,
    });

    expect(analytics.state.availability).toBe("basic");
    expect(analytics.state.notice).toContain("Detailed reading and click insights");
    expect(analytics.overview.views.value).toBe(1);
    expect(analytics.state.hasEngagement).toBe(false);
    expect(requests.map((request) => `${request.table}:${request.select.includes("engaged_seconds")}`)).toEqual([
      "page_views:true",
      "page_views:false",
    ]);
  });

  it("falls back to basic traffic analytics when the page_interactions table is missing", async () => {
    const requests: MockQueryRequest[] = [];
    const supabase = createMockSupabase((request) => {
      requests.push(request);

      if (request.table === "page_views" && request.select.includes("engaged_seconds")) {
        return {
          data: [
            makeView({
              id: "view-current-1",
              viewedAt: "2026-03-12T16:10:00.000Z",
              viewerIp: "hash-a",
              userAgent: "Mozilla/5.0",
              country: "US",
              engagedSeconds: 90,
              maxScrollDepthPct: 72,
              primarySection: "projects",
            }),
          ],
          error: null,
        };
      }

      if (request.table === "page_interactions") {
        return {
          data: null,
          error: {
            code: "42P01",
            message: 'relation "page_interactions" does not exist',
          },
        };
      }

      if (request.table === "page_views") {
        return {
          data: [
            {
              id: "view-current-1",
              viewed_at: "2026-03-12T16:10:00.000Z",
              viewer_ip: "hash-a",
              user_agent: "Mozilla/5.0",
              country: "US",
            },
          ],
          error: null,
        };
      }

      return {
        data: [],
        error: null,
      };
    });

    const analytics = await fetchPageAnalyticsDashboard({
      supabase,
      pageId: "page-1",
      rangeKey: "7d",
      allTimeViews: 12,
      now: NOW,
    });

    expect(analytics.state.availability).toBe("basic");
    expect(analytics.state.hasEngagement).toBe(false);
    expect(requests.map((request) => request.table)).toEqual([
      "page_views",
      "page_interactions",
      "page_views",
    ]);
  });

  it("returns unavailable when the legacy-safe traffic query also fails", async () => {
    const supabase = createMockSupabase((request) => {
      if (request.table !== "page_views") {
        return {
          data: [],
          error: null,
        };
      }

      if (request.select.includes("engaged_seconds")) {
        return {
          data: null,
          error: {
            code: "PGRST204",
            message: "Could not find the 'engaged_seconds' column of 'page_views' in the schema cache",
          },
        };
      }

      return {
        data: null,
        error: {
          code: "42501",
          message: "permission denied for table page_views",
        },
      };
    });

    const analytics = await fetchPageAnalyticsDashboard({
      supabase,
      pageId: "page-1",
      rangeKey: "7d",
      allTimeViews: 12,
      now: NOW,
    });

    expect(analytics.state.availability).toBe("unavailable");
    expect(analytics.state.notice).toContain("Analytics are temporarily unavailable");
  });

  it("drops malformed legacy rows instead of crashing the basic fallback", async () => {
    const supabase = createMockSupabase((request) => {
      if (request.table !== "page_views") {
        return {
          data: [],
          error: null,
        };
      }

      if (request.select.includes("engaged_seconds")) {
        return {
          data: null,
          error: {
            code: "42703",
            message: 'column "engaged_seconds" does not exist',
          },
        };
      }

      return {
        data: [
          {
            id: "legacy-view-1",
            viewed_at: "2026-03-12T16:10:00.000Z",
            viewer_ip: "hash-a",
            referrer: ["invalid"],
            user_agent: "Mozilla/5.0",
            country: "US",
          },
          {
            id: null,
            viewed_at: "2026-03-11T16:10:00.000Z",
            viewer_ip: "hash-b",
          },
        ],
        error: null,
      };
    });

    const analytics = await fetchPageAnalyticsDashboard({
      supabase,
      pageId: "page-1",
      rangeKey: "7d",
      allTimeViews: 12,
      now: NOW,
    });

    expect(analytics.state.availability).toBe("basic");
    expect(analytics.overview.views.value).toBe(1);
    expect(analytics.acquisition.topReferrers[0]?.label).toBe("Direct");
  });
});
