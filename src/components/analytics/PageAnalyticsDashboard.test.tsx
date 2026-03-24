import React from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import PageAnalyticsDashboard from "@/components/analytics/PageAnalyticsDashboard";
import {
  buildPageAnalyticsDashboard,
  createUnavailablePageAnalyticsDashboard,
} from "@/lib/analytics/pageAnalytics";

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

const NOW = new Date("2026-03-13T12:00:00.000Z");

function makeAnalytics() {
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
    interactions: [
      {
        page_view_id: "view-current-1",
        target_key: "project",
        target_label: "TraceBoard",
        click_count: 1,
      },
    ],
  });
}

describe("PageAnalyticsDashboard", () => {
  it("shows a basic-mode notice and hides engagement-only sections", () => {
    const analytics = makeAnalytics();
    analytics.state = {
      ...analytics.state,
      availability: "basic",
      notice:
        "Deeper detail is temporarily unavailable. Basic activity detail is still showing below.",
      hasEngagement: false,
    };

    const markup = renderToStaticMarkup(
      <PageAnalyticsDashboard
        analytics={analytics}
        pageId="page-1"
        pageName="Rachel"
        publicPath="/rachel"
      />,
    );

    expect(markup).toContain("Deeper detail is temporarily unavailable");
    expect(markup).toContain("People Who Looked");
    expect(markup).toContain("New People");
    expect(markup).not.toContain("Clicked Through");
    expect(markup).not.toContain("Content Performance");
    expect(markup).toContain("Deeper detail will return automatically");
  });

  it("shows an unavailable card instead of the full dashboard when analytics cannot load", () => {
    const analytics = createUnavailablePageAnalyticsDashboard({
      rangeKey: "7d",
      allTimeViews: 9,
      notice: "Traffic data could not be loaded right now. Please try again soon.",
      now: NOW,
    });

    const markup = renderToStaticMarkup(
      <PageAnalyticsDashboard
        analytics={analytics}
        pageId="page-1"
        pageName="Rachel"
        publicPath="/rachel"
      />,
    );

    expect(markup).toContain("Details are temporarily unavailable");
    expect(markup).toContain("Traffic data could not be loaded right now. Please try again soon.");
    expect(markup).not.toContain("New People");
    expect(markup).not.toContain("When people looked over");
  });
});
