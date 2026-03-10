import { describe, expect, it } from "vitest";
import {
  PARSE_RATE_LIMIT_MAX_REQUESTS,
  getParseRateLimitWindowStart,
  isParseRateLimited,
} from "@/lib/parse-rate-limit";

describe("parse rate limit helpers", () => {
  it("rounds the rolling window start to one hour earlier", () => {
    const now = new Date("2026-03-10T15:42:27.000Z");
    expect(getParseRateLimitWindowStart(now).toISOString()).toBe("2026-03-10T14:42:27.000Z");
  });

  it("blocks requests at the configured hourly ceiling", () => {
    expect(isParseRateLimited(PARSE_RATE_LIMIT_MAX_REQUESTS - 1)).toBe(false);
    expect(isParseRateLimited(PARSE_RATE_LIMIT_MAX_REQUESTS)).toBe(true);
  });

  it("supports alternate limits for future plan-specific policies", () => {
    expect(isParseRateLimited(2, 3)).toBe(false);
    expect(isParseRateLimited(3, 3)).toBe(true);
  });
});
