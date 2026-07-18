import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/security/request";

describe("getClientIp", () => {
  it("prefers Vercel's platform-provided client IP header", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.10",
      "x-forwarded-for": "198.51.100.8, 192.0.2.4",
      "x-real-ip": "198.51.100.9",
    });

    expect(getClientIp(headers)).toBe("203.0.113.10");
  });

  it("uses the nearest forwarded hop when the Vercel header is unavailable", () => {
    const headers = new Headers({
      "x-forwarded-for": "attacker-controlled, 192.0.2.4",
    });

    expect(getClientIp(headers)).toBe("192.0.2.4");
  });

  it("falls back to x-real-ip and then null", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe(
      "198.51.100.4",
    );
    expect(getClientIp(new Headers())).toBeNull();
  });
});
