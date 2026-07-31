import { describe, expect, it } from "vitest";
import {
  ATS_READINESS_DISCLOSURE,
  FREE_PRODUCT_FEATURE_GROUPS,
  LANDING_FAQS,
} from "@/lib/marketing-samples";

describe("public free-product copy", () => {
  it("describes the living resume, ATS-ready PDF, and share card as free", () => {
    const featureCopy = JSON.stringify(FREE_PRODUCT_FEATURE_GROUPS);
    const freeAnswer = LANDING_FAQS.find(
      (item) => item.question === "Is it actually free?",
    )?.answer;

    expect(featureCopy).toContain("Living Page");
    expect(featureCopy).toContain("ATS-ready PDF");
    expect(featureCopy).toContain("A clear, repeatable ATS readiness check");
    expect(featureCopy).toContain("Share Card + QR");
    expect(freeAnswer).toContain("without a card, trial, or subscription");
    expect(ATS_READINESS_DISCLOSURE).toContain("no checker can guarantee");
  });

  it("does not present a paid publishing tier in the free-product copy", () => {
    const copy = JSON.stringify({ FREE_PRODUCT_FEATURE_GROUPS, LANDING_FAQS });

    expect(copy).not.toMatch(/Starter|\bPro\b|30-day free trial|payment method/);
  });
});
