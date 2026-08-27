import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getClientIp,
  hashSecurityIdentifier,
} from "@/lib/security/request";

afterEach(() => {
  vi.unstubAllEnvs();
});

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
  it("is deterministic for the same server-only pepper", () => {
    vi.stubEnv("SECURITY_HASH_PEPPER", "test-pepper-one");

    const first = hashSecurityIdentifier("ip:203.0.113.10");
    const second = hashSecurityIdentifier("ip:203.0.113.10");

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different identifiers when the pepper changes", () => {
    vi.stubEnv("SECURITY_HASH_PEPPER", "test-pepper-one");
    const first = hashSecurityIdentifier("ip:203.0.113.10");

    vi.stubEnv("SECURITY_HASH_PEPPER", "test-pepper-two");
    const second = hashSecurityIdentifier("ip:203.0.113.10");

    expect(second).not.toBe(first);
  });

  it("does not equal an enumerable raw SHA-256 identifier", () => {
    const value = "ip:203.0.113.10";
    vi.stubEnv("SECURITY_HASH_PEPPER", "test-pepper-one");

    expect(hashSecurityIdentifier(value)).not.toBe(
      createHash("sha256").update(value).digest("hex"),
    );
  });

  it("uses a deterministic development-only fallback for local fixtures", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SECURITY_HASH_PEPPER", undefined);

    expect(hashSecurityIdentifier("ip:127.0.0.1")).toBe(
      hashSecurityIdentifier("ip:127.0.0.1"),
    );
  });

  it("fails closed in production when the pepper is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SECURITY_HASH_PEPPER", undefined);

    expect(() => hashSecurityIdentifier("ip:203.0.113.10")).toThrow(
      "Missing SECURITY_HASH_PEPPER",
    );
  });
});
