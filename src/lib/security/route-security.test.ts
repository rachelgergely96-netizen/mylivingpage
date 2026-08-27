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
    const rawPayload = '{\n  "name": "José"\n}\n';
    const encodedPayload = new TextEncoder().encode(rawPayload);
    const splitAt = encodedPayload.findIndex((byte) => byte === 0xc3) + 1;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encodedPayload.slice(0, splitAt));
        controller.enqueue(encodedPayload.slice(splitAt));
        controller.close();
      },
    });
    const result = await assertSignedWebhook({
      request: new Request("http://localhost/api/test", {
        method: "POST",
        headers: {
          "x-signature": "sig",
        },
        body,
        duplex: "half",
      } as RequestInit & { duplex: "half" }),
      secret: "secret",
      signatureHeaderName: "x-signature",
      maxBodyBytes: 1024,
      verify(payload, signature, secret) {
        expect(payload).toBe(rawPayload);
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

  it("streams to the byte limit and rejects the next chunk before verification", async () => {
    const verify = vi.fn();
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "x-signature": "sig" },
      body: "123456789",
    });
    expect(request.headers.get("content-length")).toBeNull();

    const result = await assertSignedWebhook({
      request,
      secret: "secret",
      signatureHeaderName: "x-signature",
      maxBodyBytes: 8,
      verify,
    });

    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(413);
      await expect(result.response.json()).resolves.toEqual({
        error: "Webhook request rejected.",
      });
    }
    expect(verify).not.toHaveBeenCalled();
  });

  it("does not expose signature-verifier errors", async () => {
    const result = await assertSignedWebhook({
      request: new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "x-signature": "sig" },
        body: "payload",
      }),
      secret: "secret",
      signatureHeaderName: "x-signature",
      maxBodyBytes: 1024,
      verify() {
        throw new Error("internal verifier detail that must not leave the server");
      },
    });

    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toEqual({
        error: "Webhook request rejected.",
      });
    }
  });
});
