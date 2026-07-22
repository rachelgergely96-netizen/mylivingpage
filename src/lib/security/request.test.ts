import { describe, expect, it } from "vitest";
import { hashSecurityIdentifier, getClientIp } from "@/lib/security/request";

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

describe("hashSecurityIdentifier", () => {
  it("uses the server-only pepper and never returns the raw identifier", () => {
    const previous = process.env.SECURITY_HASH_PEPPER;
    process.env.SECURITY_HASH_PEPPER = "test-pepper-one";
    const first = hashSecurityIdentifier("203.0.113.10");
    process.env.SECURITY_HASH_PEPPER = "test-pepper-two";
    const second = hashSecurityIdentifier("203.0.113.10");
    if (previous === undefined) delete process.env.SECURITY_HASH_PEPPER;
    else process.env.SECURITY_HASH_PEPPER = previous;

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("203.0.113.10");
    expect(second).not.toBe(first);
  });
});
