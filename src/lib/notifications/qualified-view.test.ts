import { describe, expect, it } from "vitest";
import {
  QUALIFIED_VIEW_ENGAGED_SECONDS,
  describeViewQuality,
  isQualifiedView,
} from "@/lib/notifications/qualified-view";

describe("isQualifiedView", () => {
  it("rejects the headless link-scanner shape: executes, never dwells", () => {
    expect(
      isQualifiedView({
        engagedSeconds: 0,
        maxScrollDepthPct: 0,
        hadOutboundClick: false,
      }),
    ).toBe(false);
  });

  it("rejects a brief bounce below the dwell threshold", () => {
    expect(
      isQualifiedView({
        engagedSeconds: QUALIFIED_VIEW_ENGAGED_SECONDS - 1,
        maxScrollDepthPct: 10,
        hadOutboundClick: false,
      }),
    ).toBe(false);
  });

  it("qualifies at the dwell threshold", () => {
    expect(
      isQualifiedView({
        engagedSeconds: QUALIFIED_VIEW_ENGAGED_SECONDS,
        maxScrollDepthPct: 0,
        hadOutboundClick: false,
      }),
    ).toBe(true);
  });

  it("qualifies a reader who scrolled without dwelling long", () => {
    expect(
      isQualifiedView({
        engagedSeconds: 2,
        maxScrollDepthPct: 60,
        hadOutboundClick: false,
      }),
    ).toBe(true);
  });

  it("qualifies an outbound click immediately — no scanner clicks a contact link", () => {
    expect(
      isQualifiedView({
        engagedSeconds: 0,
        maxScrollDepthPct: 0,
        hadOutboundClick: true,
      }),
    ).toBe(true);
  });

  it("treats missing signals as not qualified", () => {
    expect(
      isQualifiedView({
        engagedSeconds: null,
        maxScrollDepthPct: null,
        hadOutboundClick: null,
      }),
    ).toBe(false);
  });
});

describe("describeViewQuality", () => {
  it("names the dwell and the section that held attention", () => {
    expect(
      describeViewQuality({
        engagedSeconds: 40,
        maxScrollDepthPct: 80,
        hadOutboundClick: false,
        primarySectionLabel: "Proof",
      }),
    ).toBe("They spent 40 seconds on the page, mostly on Proof.");
  });

  it("rounds longer visits to minutes", () => {
    expect(
      describeViewQuality({
        engagedSeconds: 120,
        maxScrollDepthPct: 90,
        hadOutboundClick: false,
        primarySectionLabel: null,
      }),
    ).toBe("They spent 2 min on the page.");
  });

  it("mentions an outbound click", () => {
    expect(
      describeViewQuality({
        engagedSeconds: 30,
        maxScrollDepthPct: 50,
        hadOutboundClick: true,
        primarySectionLabel: "Experience",
      }),
    ).toBe(
      "They spent 30 seconds on the page, mostly on Experience, and followed one of your links.",
    );
  });

  it("falls back when no signal is available", () => {
    expect(
      describeViewQuality({
        engagedSeconds: 0,
        maxScrollDepthPct: 0,
        hadOutboundClick: false,
        primarySectionLabel: null,
      }),
    ).toBe("They opened your page.");
  });
});
