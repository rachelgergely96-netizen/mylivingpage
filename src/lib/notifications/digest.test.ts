import { describe, expect, it } from "vitest";
import { buildDigestSummary } from "@/lib/notifications/digest";
import {
  buildFirstViewEmail,
  buildWeeklyDigestEmail,
  escapeHtml,
} from "@/lib/notifications/templates";

const PAGE_URL = "https://www.mylivingpage.com/rachel";

describe("buildDigestSummary", () => {
  it("counts a viewer seen more than once as a repeat visitor", () => {
    const summary = buildDigestSummary({
      pageUrl: PAGE_URL,
      views: [
        { viewer_ip: "a", referrer: null, had_outbound_click: false },
        { viewer_ip: "a", referrer: null, had_outbound_click: false },
        { viewer_ip: "b", referrer: null, had_outbound_click: false },
      ],
    });

    expect(summary.views).toBe(3);
    expect(summary.repeatVisitors).toBe(1);
  });

  it("reports a named referrer ahead of the Direct default bucket", () => {
    const summary = buildDigestSummary({
      pageUrl: PAGE_URL,
      views: [
        { viewer_ip: "a", referrer: null, had_outbound_click: false },
        { viewer_ip: "b", referrer: null, had_outbound_click: false },
        {
          viewer_ip: "c",
          referrer: "https://www.linkedin.com/feed",
          had_outbound_click: false,
        },
      ],
    });

    expect(summary.topReferrerLabel).toBe("linkedin.com");
  });

  it("reports no top referrer when every view was direct", () => {
    const summary = buildDigestSummary({
      pageUrl: PAGE_URL,
      views: [{ viewer_ip: "a", referrer: null, had_outbound_click: false }],
    });

    expect(summary.topReferrerLabel).toBeNull();
  });

  it("counts outbound clicks across views", () => {
    const summary = buildDigestSummary({
      pageUrl: PAGE_URL,
      views: [
        { viewer_ip: "a", referrer: null, had_outbound_click: true },
        { viewer_ip: "b", referrer: null, had_outbound_click: true },
        { viewer_ip: "c", referrer: null, had_outbound_click: false },
      ],
    });

    expect(summary.outboundClicks).toBe(2);
  });

  it("handles an empty week without dividing by zero", () => {
    const summary = buildDigestSummary({ pageUrl: PAGE_URL, views: [] });

    expect(summary).toMatchObject({
      views: 0,
      repeatVisitors: 0,
      outboundClicks: 0,
      topReferrerLabel: null,
    });
  });
});

describe("email templates", () => {
  const base = {
    ownerName: null,
    pageUrl: PAGE_URL,
    analyticsUrl: "https://www.mylivingpage.com/dashboard/analytics/1",
    preferencesUrl: "https://www.mylivingpage.com/dashboard/settings#notifications",
    unsubscribeUrl: "https://www.mylivingpage.com/api/notifications/unsubscribe?token=t",
    qualityLine: "They spent 40 seconds on the page.",
  };

  it("escapes owner-controlled text so a variant label cannot inject markup", () => {
    const email = buildFirstViewEmail({
      ...base,
      variantLabel: '<img src=x onerror="alert(1)">',
    });

    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img src=x");
  });

  it("always carries an unsubscribe link in both parts", () => {
    const email = buildFirstViewEmail(base);

    expect(email.html).toContain(base.unsubscribeUrl);
    expect(email.text).toContain(base.unsubscribeUrl);
  });

  it("writes a different digest subject when nobody visited", () => {
    const quiet = buildWeeklyDigestEmail({
      ownerName: "Rachel",
      analyticsUrl: base.analyticsUrl,
      preferencesUrl: base.preferencesUrl,
      unsubscribeUrl: base.unsubscribeUrl,
      rangeLabel: "last 7 days",
      summary: {
        pageUrl: PAGE_URL,
        views: 0,
        repeatVisitors: 0,
        topReferrerLabel: null,
        outboundClicks: 0,
      },
    });

    const busy = buildWeeklyDigestEmail({
      ownerName: "Rachel",
      analyticsUrl: base.analyticsUrl,
      preferencesUrl: base.preferencesUrl,
      unsubscribeUrl: base.unsubscribeUrl,
      rangeLabel: "last 7 days",
      summary: {
        pageUrl: PAGE_URL,
        views: 4,
        repeatVisitors: 1,
        topReferrerLabel: "linkedin.com",
        outboundClicks: 2,
      },
    });

    expect(quiet.subject).toBe("Your page in the last 7 days");
    expect(busy.subject).toBe("Your page in the last 7 days: 4 views");
  });

  it("escapes HTML entities", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;",
    );
  });
});
