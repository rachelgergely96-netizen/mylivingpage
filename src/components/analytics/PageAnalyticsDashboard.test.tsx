import React from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import PageAnalyticsDashboard from "@/components/analytics/PageAnalyticsDashboard";
import {
  buildPageAnalyticsDashboard,
  createUnavailablePageAnalyticsDashboard,
} from "@/lib/analytics/pageAnalytics";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

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
const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(NOW.getTime());

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
  afterAll(() => {
    dateNowSpy.mockRestore();
  });

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
    expect(markup).toContain("People who looked");
    expect(markup).toContain("New people");
    expect(markup).not.toContain("Clicked through");
    expect(markup).not.toContain("Content performance");
    expect(markup).not.toContain("Deeper detail will return automatically");
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
    expect(markup).toContain("Try again");
    expect(markup).toContain('data-motion-state="unavailable"');
    expect(markup).not.toContain("data-motion-event=");
    expect(markup).not.toContain("data-motion-target=");
    expect(markup).not.toContain("New people");
    expect(markup).not.toContain("When people looked over");
  });

  it("shows follow-up signals and variant guidance in full mode", () => {
    const analytics = makeAnalytics();

    const markup = renderToStaticMarkup(
      <PageAnalyticsDashboard
        analytics={analytics}
        pageId="page-1"
        pageName="Rachel"
        publicPath="/rachel"
        variantLabels={["Recruiter follow-up", "Hiring manager version"]}
      />,
    );

    expect(markup).toContain("What to do after the click");
    expect(markup).toContain("Suggested timing");
    expect(markup).toContain("Follow up tomorrow");
    expect(markup).toContain("Target the next send");
    expect(markup).toContain("Recruiter follow-up");
    expect(markup).toContain("Hiring manager version");
  });

  it("exposes daily values in a semantic disclosure without focusable bars", () => {
    const markup = renderToStaticMarkup(
      <PageAnalyticsDashboard
        analytics={makeAnalytics()}
        pageId="page-1"
        pageName="Rachel"
        publicPath="/rachel"
      />,
    );

    expect(markup).toContain('data-testid="analytics-daily-values"');
    expect(markup).toContain("View daily values");
    expect(markup).toContain("<table");
    expect(markup).toContain('<th scope="col"');
    expect(markup).toContain('<th scope="row"');
    expect(markup).toContain("People who looked");
    expect(markup).toContain('data-analytics-day-bar="');
    expect(markup).not.toMatch(/data-analytics-day-bar="[^"]+"[^>]*tabindex=/);
  });

  it("does not treat a directly rendered range result as a user range change", () => {
    const analytics = makeAnalytics();
    analytics.state = {
      ...analytics.state,
      lowData: false,
    };

    const directMarkup = renderToStaticMarkup(
      <PageAnalyticsDashboard
        analytics={analytics}
        pageId="page-1"
        pageName="Rachel"
        publicPath="/rachel"
      />,
    );
    const defaultMarkup = renderToStaticMarkup(
      <PageAnalyticsDashboard
        analytics={analytics}
        pageId="page-1"
        pageName="Rachel"
        publicPath="/rachel"
      />,
    );

    expect(directMarkup).not.toContain(
      'data-motion-event="analytics.range.updated"',
    );
    expect(directMarkup).not.toContain('data-motion-state="resolved"');
    expect(directMarkup).not.toContain('data-motion-target="7d"');
    expect(directMarkup).not.toContain("data-motion-sequence=");
    expect(directMarkup).toContain('data-analytics-range-target="7d"');
    expect(defaultMarkup).not.toContain("data-motion-event=");
    expect(defaultMarkup).not.toContain("data-motion-target=");
  });

  it("keeps a low-data range render unresolved", () => {
    const markup = renderToStaticMarkup(
      <PageAnalyticsDashboard
        analytics={makeAnalytics()}
        pageId="page-1"
        pageName="Rachel"
        publicPath="/rachel"
      />,
    );

    expect(markup).toContain('data-motion-signal="edit-to-proof"');
    expect(markup).toContain('data-motion-state="low-data"');
    expect(markup).not.toContain("data-motion-event=");
    expect(markup).not.toContain("data-motion-target=");
  });
});
