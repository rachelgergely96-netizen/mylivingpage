import { describe, expect, it } from "vitest";
import {
  INITIAL_ANALYTICS_RANGE_MOTION_INTENT_STATE,
  consumeAnalyticsRangeIntent,
  getAnalyticsRangeMotionRenderKey,
  isCurrentAnalyticsRangeMotionResolution,
  markAnalyticsRangeIntent,
  type AnalyticsRangeMotionResolution,
} from "@/lib/analytics/range-motion-intent";

describe("analytics range motion intent", () => {
  it("keeps Strict Mode effect replay on one key while real navigation changes it", () => {
    const firstSetup = getAnalyticsRangeMotionRenderKey("page-1", "7d", true);
    const strictReplay = getAnalyticsRangeMotionRenderKey("page-1", "7d", true);
    const nextRange = getAnalyticsRangeMotionRenderKey("page-1", "90d", true);
    const staticResult = getAnalyticsRangeMotionRenderKey("page-1", "90d", false);

    expect(strictReplay).toBe(firstSetup);
    expect(nextRange).not.toBe(firstSetup);
    expect(staticResult).not.toBe(nextRange);
  });

  it("marks only a real range change and increments a numeric replay sequence", () => {
    const unchanged = markAnalyticsRangeIntent(
      INITIAL_ANALYTICS_RANGE_MOTION_INTENT_STATE,
      { pageId: "page-1", fromRange: "30d", toRange: "30d" },
    );
    const first = markAnalyticsRangeIntent(unchanged, {
      pageId: "page-1",
      fromRange: "30d",
      toRange: "7d",
    });
    const second = markAnalyticsRangeIntent(first, {
      pageId: "page-1",
      fromRange: "7d",
      toRange: "90d",
    });

    expect(unchanged).toBe(INITIAL_ANALYTICS_RANGE_MOTION_INTENT_STATE);
    expect(first.pending).toMatchObject({ toRange: "7d", sequence: 1 });
    expect(second.pending).toMatchObject({ toRange: "90d", sequence: 2 });
    expect(Number.isFinite(second.pending?.sequence)).toBe(true);
  });

  it("leaves a nonmatching intent pending until its destination renders", () => {
    const marked = markAnalyticsRangeIntent(
      INITIAL_ANALYTICS_RANGE_MOTION_INTENT_STATE,
      { pageId: "page-1", fromRange: "30d", toRange: "7d" },
    );
    const result = consumeAnalyticsRangeIntent(marked, {
      pageId: "page-1",
      renderedRange: "90d",
      canResolve: true,
    });

    expect(result.state).toBe(marked);
    expect(result.resolved).toBeNull();
  });

  it("consumes a matching supported result exactly once", () => {
    const marked = markAnalyticsRangeIntent(
      INITIAL_ANALYTICS_RANGE_MOTION_INTENT_STATE,
      { pageId: "page-1", fromRange: "30d", toRange: "7d" },
    );
    const first = consumeAnalyticsRangeIntent(marked, {
      pageId: "page-1",
      renderedRange: "7d",
      canResolve: true,
    });
    const replay = consumeAnalyticsRangeIntent(first.state, {
      pageId: "page-1",
      renderedRange: "7d",
      canResolve: true,
    });

    expect(first.resolved).toMatchObject({ toRange: "7d", sequence: 1 });
    expect(first.state.pending).toBeNull();
    expect(replay.resolved).toBeNull();
  });

  it("does not retain a resolved event when the same boundary renders another range", () => {
    let resolution: AnalyticsRangeMotionResolution | null = {
      rangeKey: "7d",
      sequence: 1,
    };

    expect(
      isCurrentAnalyticsRangeMotionResolution(resolution, "7d", true),
    ).toBe(true);

    // App Router query and Back navigations can reuse the mounted client
    // boundary. The old state must be inert before its effect clears it.
    expect(
      isCurrentAnalyticsRangeMotionResolution(resolution, "30d", true),
    ).toBe(false);
    resolution = null;
    expect(
      isCurrentAnalyticsRangeMotionResolution(resolution, "30d", true),
    ).toBe(false);

    const marked = markAnalyticsRangeIntent(
      INITIAL_ANALYTICS_RANGE_MOTION_INTENT_STATE,
      { pageId: "page-1", fromRange: "7d", toRange: "30d" },
    );
    const consumed = consumeAnalyticsRangeIntent(marked, {
      pageId: "page-1",
      renderedRange: "30d",
      canResolve: true,
    });
    expect(consumed.resolved).not.toBeNull();
    resolution = {
      rangeKey: consumed.resolved!.toRange,
      sequence: consumed.resolved!.sequence,
    };

    expect(
      isCurrentAnalyticsRangeMotionResolution(resolution, "30d", true),
    ).toBe(true);
    expect(resolution.sequence).toBe(1);
  });

  it.each([
    ["low-data", false],
    ["unavailable", false],
  ])("consumes a matching %s result without resolving motion", (_label, canResolve) => {
    const marked = markAnalyticsRangeIntent(
      INITIAL_ANALYTICS_RANGE_MOTION_INTENT_STATE,
      { pageId: "page-1", fromRange: "30d", toRange: "7d" },
    );
    const result = consumeAnalyticsRangeIntent(marked, {
      pageId: "page-1",
      renderedRange: "7d",
      canResolve,
    });

    expect(result.state.pending).toBeNull();
    expect(result.resolved).toBeNull();
  });
});
