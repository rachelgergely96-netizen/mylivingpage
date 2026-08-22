import { describe, expect, it } from "vitest";
import {
  isTruthfulFirstViewResolution,
  shouldEmitFirstViewMotion,
} from "@/components/create/FirstViewActivationHub";
import type { PageProofResponse } from "@/lib/analytics/proofSummary";

function makeProof(
  overrides: Partial<PageProofResponse> = {},
): PageProofResponse {
  return {
    pageId: "page-1",
    loopState: "first_view_detected",
    viewsLast7d: 1,
    mobileViewsLast7d: 0,
    avgEngagedSecondsLast7d: 30,
    shareIntentCountLast7d: 1,
    lastShareAt: "2026-08-22T12:00:00.000Z",
    latestViewAt: "2026-08-22T12:05:00.000Z",
    firstViewAfterLatestShareAt: "2026-08-22T12:05:00.000Z",
    firstViewAfterLatestShareDeviceLabel: "desktop",
    firstViewAfterLatestShareEngagedSeconds: 30,
    lastShareScenario: "application_follow_up",
    lastShareVariantId: null,
    lastShareVariantLabel: null,
    bestScenarioLast7d: "application_follow_up",
    ...overrides,
  };
}

describe("first-view motion proof", () => {
  it("accepts only a page-matched view at or after the latest share", () => {
    expect(isTruthfulFirstViewResolution(makeProof(), "page-1")).toBe(true);
    expect(
      isTruthfulFirstViewResolution(makeProof({ pageId: "page-2" }), "page-1"),
    ).toBe(false);
    expect(
      isTruthfulFirstViewResolution(
        makeProof({ firstViewAfterLatestShareAt: null }),
        "page-1",
      ),
    ).toBe(false);
    expect(
      isTruthfulFirstViewResolution(
        makeProof({
          firstViewAfterLatestShareAt: "2026-08-22T11:59:00.000Z",
        }),
        "page-1",
      ),
    ).toBe(false);
    expect(
      isTruthfulFirstViewResolution(
        makeProof({ loopState: "waiting_for_first_view" }),
        "page-1",
      ),
    ).toBe(false);
  });

  it("does not replay motion for the same resolved first-view timestamp", () => {
    const proof = makeProof();

    expect(shouldEmitFirstViewMotion(proof, "page-1", null)).toBe(true);
    expect(
      shouldEmitFirstViewMotion(
        proof,
        "page-1",
        proof.firstViewAfterLatestShareAt,
      ),
    ).toBe(false);
    expect(
      shouldEmitFirstViewMotion(
        makeProof({
          firstViewAfterLatestShareAt: "2026-08-22T12:10:00.000Z",
        }),
        "page-1",
        proof.firstViewAfterLatestShareAt,
      ),
    ).toBe(true);
  });
});
