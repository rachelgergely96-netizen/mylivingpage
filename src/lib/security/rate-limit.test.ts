import { describe, expect, it } from "vitest";
import {
  RATE_LIMIT_POLICIES,
  getRateLimitResetAt,
  getRateLimitWindowStart,
  isRateLimitExceeded,
} from "@/lib/security/rate-limit";

describe("shared rate limit helpers", () => {
  it("computes a rolling window start for the selected policy", () => {
    const now = new Date("2026-03-17T15:42:27.000Z");
    expect(
      getRateLimitWindowStart("waitlist_submit", now).toISOString(),
    ).toBe("2026-03-17T14:42:27.000Z");
  });

  it("computes a reset time based on the selected policy window", () => {
    const now = new Date("2026-03-17T15:42:27.000Z");
    expect(getRateLimitResetAt("username_check", now).toISOString()).toBe(
      "2026-03-17T15:52:27.000Z",
    );
  });

  it("treats reaching the policy ceiling as blocked", () => {
    const maxRequests = RATE_LIMIT_POLICIES.ats_export_download.maxRequests;
    expect(isRateLimitExceeded(maxRequests - 1, maxRequests)).toBe(false);
    expect(isRateLimitExceeded(maxRequests, maxRequests)).toBe(true);
  });
});
