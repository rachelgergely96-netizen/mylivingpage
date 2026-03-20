import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchPageAnalyticsDashboardMock = vi.fn();
const createServerSupabaseClientMock = vi.fn();
const createServiceRoleSupabaseClientMock = vi.fn();
const trackEventMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error("notFound");
});
const redirectMock = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
  redirect: (url: string) => redirectMock(url),
}));

vi.mock("@/components/analytics/PageAnalyticsDashboard", () => ({
  default: ({
    analytics,
  }: {
    analytics: { state: { availability: string; notice: string | null } };
  }) => (
    <div data-testid="analytics-dashboard">
      {analytics.state.availability}|{analytics.state.notice ?? ""}
    </div>
  ),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: (...args: unknown[]) =>
    createServerSupabaseClientMock(...args),
  createServiceRoleSupabaseClient: (...args: unknown[]) =>
    createServiceRoleSupabaseClientMock(...args),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

vi.mock("@/lib/analytics/pageAnalytics", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/analytics/pageAnalytics")>(
      "@/lib/analytics/pageAnalytics",
    );

  return {
    ...actual,
    fetchPageAnalyticsDashboard: (...args: unknown[]) =>
      fetchPageAnalyticsDashboardMock(...args),
  };
});

import AnalyticsPage from "./page";
import {
  buildPageAnalyticsDashboard,
  createUnavailablePageAnalyticsDashboard,
} from "@/lib/analytics/pageAnalytics";

const NOW = new Date("2026-03-13T12:00:00.000Z");

function makeBaseAnalytics() {
  return buildPageAnalyticsDashboard({
    rangeKey: "7d",
    allTimeViews: 9,
    now: NOW,
    views: [
      {
        id: "view-current-1",
        viewed_at: "2026-03-12T16:10:00.000Z",
        viewer_ip: "hash-a",
        referrer: "https://www.linkedin.com/feed/",
        user_agent: "Mozilla/5.0",
        country: "US",
        engaged_seconds: 120,
        max_scroll_depth_pct: 80,
        primary_section: "projects",
        had_outbound_click: true,
      },
    ],
    interactions: [],
  });
}

function makeServiceRoleClient() {
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        plan: "pro",
        username: "rachel",
      },
    }),
  };
  const pageQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        id: "page-1",
        slug: "rachel",
        views: 9,
        resume_data: {
          name: "Rachel",
        },
      },
    }),
  };

  return {
    from(table: string) {
      if (table === "profiles") {
        return profileQuery;
      }

      if (table === "pages") {
        return pageQuery;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

describe("analytics dashboard page", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
            },
          },
        }),
      },
    });
    createServiceRoleSupabaseClientMock.mockReturnValue(makeServiceRoleClient());
    trackEventMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders the dashboard page in basic mode instead of crashing", async () => {
    const analytics = makeBaseAnalytics();
    analytics.state = {
      ...analytics.state,
      availability: "basic",
      notice: "Detailed engagement analytics are temporarily unavailable.",
      hasEngagement: false,
    };
    fetchPageAnalyticsDashboardMock.mockResolvedValue(analytics);

    const element = await AnalyticsPage({
      params: Promise.resolve({ pageId: "page-1" }),
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("basic|Detailed engagement analytics are temporarily unavailable.");
    expect(trackEventMock).toHaveBeenCalledWith(
      "user-1",
      "analytics.dashboard.degraded",
      expect.objectContaining({
        page_id: "page-1",
        availability: "basic",
      }),
    );
  });

  it("renders the unavailable dashboard state instead of throwing", async () => {
    fetchPageAnalyticsDashboardMock.mockResolvedValue(
      createUnavailablePageAnalyticsDashboard({
        rangeKey: "7d",
        allTimeViews: 9,
        notice: "Traffic data could not be loaded right now. Please try again soon.",
        now: NOW,
      }),
    );

    const element = await AnalyticsPage({
      params: Promise.resolve({ pageId: "page-1" }),
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain(
      "unavailable|Traffic data could not be loaded right now. Please try again soon.",
    );
    expect(trackEventMock).toHaveBeenCalledWith(
      "user-1",
      "analytics.dashboard.load_failed",
      expect.objectContaining({
        page_id: "page-1",
        availability: "unavailable",
      }),
    );
  });
});
