import { describe, expect, it } from "vitest";
import {
  buildPageProofResponse,
  buildPageProofSummary,
} from "@/lib/analytics/proofSummary";

const NOW = new Date("2026-03-23T16:00:00.000Z");

describe("buildPageProofSummary", () => {
  it("stays ready to share when there is no sharing or traffic yet", () => {
    const summary = buildPageProofSummary({
      pageId: "page-1",
      views: [],
      events: [],
      now: NOW,
    });

    expect(summary.status).toBe("ready_to_share");
    expect(summary.viewsLast7d).toBe(0);
    expect(summary.shareIntentCountLast7d).toBe(0);
  });

  it("shows awaiting views after a recent share with no outside traffic yet", () => {
    const summary = buildPageProofSummary({
      pageId: "page-1",
      views: [],
      events: [
        {
          event_name: "page.share.copy_link",
          created_at: "2026-03-23T14:00:00.000Z",
          metadata: { page_id: "page-1", scenario: "recruiter_reply" },
        },
      ],
      now: NOW,
    });

    expect(summary.status).toBe("awaiting_views");
    expect(summary.lastShareAt).toBe("2026-03-23T14:00:00.000Z");
    expect(summary.firstViewAfterLatestShareAt).toBeNull();
    expect(summary.lastShareScenario).toBe("recruiter_reply");
  });

  it("celebrates proof landing when a view arrives after a recent share", () => {
    const summary = buildPageProofSummary({
      pageId: "page-1",
      views: [
        {
          page_id: "page-1",
          viewed_at: "2026-03-23T14:05:00.000Z",
          user_agent: "Mozilla/5.0 (iPhone)",
          engaged_seconds: 44,
        },
      ],
      events: [
        {
          event_name: "page.share.copy_link",
          created_at: "2026-03-23T14:00:00.000Z",
          metadata: {
            page_id: "page-1",
            scenario: "application_follow_up",
            variant_id: "variant-1",
            variant_label: "Recruiter version",
          },
        },
        {
          event_name: "page.share_link.opened",
          created_at: "2026-03-23T14:05:00.000Z",
          metadata: {
            page_id: "page-1",
            scenario: "application_follow_up",
            variant_id: "variant-1",
            variant_label: "Recruiter version",
          },
        },
      ],
      now: NOW,
    });

    expect(summary.status).toBe("proof_landed");
    expect(summary.viewsLast7d).toBe(1);
    expect(summary.mobileViewsLast7d).toBe(1);
    expect(summary.avgEngagedSecondsLast7d).toBe(44);
    expect(summary.firstViewAfterLatestShareAt).toBe("2026-03-23T14:05:00.000Z");
    expect(summary.firstViewAfterLatestShareDeviceLabel).toBe("mobile");
    expect(summary.firstViewAfterLatestShareEngagedSeconds).toBe(44);
    expect(summary.lastShareScenario).toBe("application_follow_up");
    expect(summary.lastShareVariantLabel).toBe("Recruiter version");
    expect(summary.bestScenarioLast7d).toBe("application_follow_up");
  });

  it("falls back to active traffic when views exist without a fresh share event", () => {
    const summary = buildPageProofSummary({
      pageId: "page-1",
      views: [
        {
          page_id: "page-1",
          viewed_at: "2026-03-22T18:00:00.000Z",
          user_agent: "Mozilla/5.0",
          engaged_seconds: 91,
        },
      ],
      events: [
        {
          event_name: "page.share.copy_link",
          created_at: "2026-03-10T10:00:00.000Z",
          metadata: { page_id: "page-1" },
        },
      ],
      now: NOW,
    });

    expect(summary.status).toBe("active");
    expect(summary.latestViewAt).toBe("2026-03-22T18:00:00.000Z");
    expect(summary.shareIntentCountLast7d).toBe(0);
  });

  it("builds the create-flow response state from the summary", () => {
    const response = buildPageProofResponse(
      buildPageProofSummary({
        pageId: "page-1",
        views: [
          {
            page_id: "page-1",
            viewed_at: "2026-03-23T14:05:00.000Z",
            user_agent: "Mozilla/5.0 (iPhone)",
            engaged_seconds: 44,
          },
        ],
        events: [
          {
            event_name: "page.share.copy_link",
            created_at: "2026-03-23T14:00:00.000Z",
            metadata: { page_id: "page-1", scenario: "connection" },
          },
        ],
        now: NOW,
      }),
    );

    expect(response.loopState).toBe("first_view_detected");
    expect(response.lastShareScenario).toBe("connection");
    expect(response.firstViewAfterLatestShareDeviceLabel).toBe("mobile");
  });
});
