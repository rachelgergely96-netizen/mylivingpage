import { describe, expect, it } from "vitest";
import {
  ATS_READINESS_DISCLOSURE,
  FREE_PRODUCT_FEATURE_GROUPS,
  getMarketingSamples,
  LANDING_FAQS,
} from "@/lib/marketing-samples";

describe("public free-product copy", () => {
  it("describes the living resume, ATS-ready PDF, and share card as free", () => {
    const featureCopy = JSON.stringify(FREE_PRODUCT_FEATURE_GROUPS);
    const freeAnswer = LANDING_FAQS.find(
      (item) => item.question === "Is it actually free?",
    )?.answer;

    expect(featureCopy).toContain("Living Page");
    expect(featureCopy).toContain("ATS-Ready PDF");
    expect(featureCopy).toContain("Deterministic ATS readiness check");
    expect(featureCopy).toContain("Share Card + QR");
    expect(freeAnswer).toContain("without a card, trial, or subscription");
    expect(ATS_READINESS_DISCLOSURE).toContain("no checker can guarantee");
  });

  it("does not present a paid publishing tier in the free-product copy", () => {
    const copy = JSON.stringify({ FREE_PRODUCT_FEATURE_GROUPS, LANDING_FAQS });

    expect(copy).not.toMatch(/Starter|\bPro\b|30-day free trial|payment method/);
  });

  it("showcases all three authored Living Page experiences", () => {
    const samples = getMarketingSamples();

    expect(
      samples
        .filter((sample) =>
          ["axiom", "atelier", "atlas"].includes(sample.demo.themeId),
        )
        .map((sample) => [sample.id, sample.demo.themeId]),
    ).toEqual([
      ["laid-off-tech", "axiom"],
      ["career-switching-designer", "atelier"],
      ["early-career-attorney", "atlas"],
    ]);

    const axiomSample = samples.find((sample) => sample.demo.themeId === "axiom");
    const atelierSample = samples.find(
      (sample) => sample.demo.themeId === "atelier",
    );
    const atlasSample = samples.find((sample) => sample.demo.themeId === "atlas");

    expect(axiomSample?.demo.data.proofs?.length).toBeGreaterThanOrEqual(2);
    expect(
      atelierSample?.demo.data.testimonials?.some(
        (testimonial) => testimonial.status === "approved",
      ),
    ).toBe(true);
    expect(atlasSample?.demo.data.proofs?.length).toBeGreaterThanOrEqual(1);
  });
});
