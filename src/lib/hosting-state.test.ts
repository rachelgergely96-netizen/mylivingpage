import { describe, expect, it } from "vitest";
import { isPubliclyAvailablePage } from "@/lib/hosting-state";

describe("isPubliclyAvailablePage", () => {
  it("requires a live page and a public or legacy visibility", () => {
    expect(isPubliclyAvailablePage({ status: "live", visibility: "public" })).toBe(true);
    expect(isPubliclyAvailablePage({ status: "live", visibility: null })).toBe(true);
  });

  it("never exposes mismatched publication state", () => {
    expect(isPubliclyAvailablePage({ status: "draft", visibility: "public" })).toBe(false);
    expect(isPubliclyAvailablePage({ status: "live", visibility: "private" })).toBe(false);
    expect(isPubliclyAvailablePage({ status: "draft", visibility: "private" })).toBe(false);
    expect(isPubliclyAvailablePage(null)).toBe(false);
  });
});
