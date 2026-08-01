import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  })),
}));

import {
  assertSignedWebhook,
  isRouteTrustLevel,
  requireAdminUser,
  requireAuthenticatedUser,
} from "@/lib/security/route-security";

describe("route security helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recognizes the supported trust levels", () => {
    expect(isRouteTrustLevel("public_write")).toBe(true);
    expect(isRouteTrustLevel("totally_custom")).toBe(false);
  });

  it("returns a 401 response when auth is missing", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: null,
      },
    });

    const result = await requireAuthenticatedUser();
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(401);
      await expect(result.response.json()).resolves.toEqual({
        error: "Your session has expired. Sign in again to continue.",
      });
    }
  });

  it("returns the authenticated user when auth succeeds", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "person@example.com",
        },
      },
    });

    const result = await requireAuthenticatedUser();
    expect("value" in result).toBe(true);
    if ("value" in result) {
      expect(result.value.user.id).toBe("user-1");
    }
  });

  it("returns a 403 response when a non-admin calls an admin guard", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "person@example.com",
        },
      },
    });

    const result = await requireAdminUser();
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(403);
    }
  });

  it("passes through verified webhook payloads", async () => {
    const result = await assertSignedWebhook({
      request: new Request("http://localhost/api/test", {
        method: "POST",
        headers: {
          "x-signature": "sig",
        },
        body: "payload",
      }),
      secret: "secret",
      signatureHeaderName: "x-signature",
      verify(payload, signature, secret) {
        expect(payload).toBe("payload");
        expect(signature).toBe("sig");
        expect(secret).toBe("secret");
        return { ok: true };
      },
    });

    expect("value" in result).toBe(true);
    if ("value" in result) {
      expect(result.value.verified).toEqual({ ok: true });
    }
  });
});
