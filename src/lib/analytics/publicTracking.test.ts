import { describe, expect, it } from "vitest";
import { normalizeEngagementPayload } from "@/lib/analytics/publicTracking";

const PAGE_ID = "11111111-1111-4111-8111-111111111111";
const PAGE_VIEW_ID = "22222222-2222-4222-8222-222222222222";

describe("public analytics tracking payloads", () => {
  it("clamps engagement metrics and aggregates duplicate click rows", () => {
    const payload = normalizeEngagementPayload({
      pageId: PAGE_ID,
      pageViewId: PAGE_VIEW_ID,
      engagedSeconds: 9999,
      maxScrollDepthPct: 180,
      primarySection: "projects",
      clicks: [
        { targetKey: "project", targetLabel: "TraceBoard", count: 2 },
        { targetKey: "project", targetLabel: "TraceBoard", count: 3 },
        { targetKey: "email", targetLabel: "avery@sample.invalid", count: 1 },
        { targetKey: "invalid", count: 4 },
      ],
    });

    expect(payload).toEqual({
      pageId: PAGE_ID,
      pageViewId: PAGE_VIEW_ID,
      engagedSeconds: 1800,
      maxScrollDepthPct: 100,
      primarySection: "projects",
      clicks: [
        { targetKey: "project", targetLabel: "TraceBoard", count: 5 },
        { targetKey: "email", targetLabel: "avery@sample.invalid", count: 1 },
      ],
    });
  });

  it("rejects payloads without valid page identifiers", () => {
    expect(
      normalizeEngagementPayload({
        pageId: "not-a-uuid",
        pageViewId: PAGE_VIEW_ID,
      }),
    ).toBeNull();

    expect(
      normalizeEngagementPayload({
        pageId: PAGE_ID,
        pageViewId: "",
      }),
    ).toBeNull();
  });
});

