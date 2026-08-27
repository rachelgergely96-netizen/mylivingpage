import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class AccountDeletionError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "AccountDeletionError";
      this.status = status;
    }
  }

  return {
    authGetUser: vi.fn(),
    deleteUserAccount: vi.fn(),
    enforceRateLimit: vi.fn(),
    requireRecentReauthentication: vi.fn(),
    AccountDeletionError,
    isAccountDeletionError: (error: unknown) => error instanceof AccountDeletionError,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.authGetUser },
  })),
}));

vi.mock("@/lib/account/deleteUserAccount", () => ({
  AccountDeletionError: mocks.AccountDeletionError,
  isAccountDeletionError: (error: unknown) => mocks.isAccountDeletionError(error),
  deleteUserAccount: (...args: unknown[]) => mocks.deleteUserAccount(...args),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mocks.enforceRateLimit(...args),
}));

vi.mock("@/lib/auth/reauthentication", () => ({
  requireRecentReauthentication: (...args: unknown[]) => mocks.requireRecentReauthentication(...args),
}));

import { POST } from "@/app/api/account/delete/route";

describe("POST /api/account/delete", () => {
  const request = () => new Request("http://localhost/api/account/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: "current-password" }),
  });

  const rawRequest = (body: string) => new Request("http://localhost/api/account/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "rachel@example.com" } },
    });
    mocks.deleteUserAccount.mockResolvedValue(null);
    mocks.enforceRateLimit.mockResolvedValue({ limited: false });
    mocks.requireRecentReauthentication.mockResolvedValue({ ok: true });
  });

  it("requires authentication", async () => {
    mocks.authGetUser.mockResolvedValueOnce({ data: { user: null } });

    const response = await POST(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Your session has expired. Sign in again to continue.",
    });
    expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
  });

  it("deletes the authenticated user's own account", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.deleteUserAccount).toHaveBeenCalledWith({ targetUserId: "user-1" });
  });

  it.each(["{", "null", "[]", '"delete"'])(
    "rejects an invalid request body: %s",
    async (body) => {
      const response = await POST(rawRequest(body));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid request." });
      expect(mocks.requireRecentReauthentication).not.toHaveBeenCalled();
      expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
    },
  );

  it("rejects a headerless oversized request before reauthentication", async () => {
    const oversizedRequest = rawRequest(
      JSON.stringify({ currentPassword: "current-password", padding: "x".repeat(17 * 1024) }),
    );
    expect(oversizedRequest.headers.get("content-length")).toBeNull();

    const response = await POST(oversizedRequest);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Request payload is too large.",
    });
    expect(mocks.requireRecentReauthentication).not.toHaveBeenCalled();
    expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
  });

  it("surfaces a friendly message when active billing cannot be cancelled", async () => {
    mocks.deleteUserAccount.mockRejectedValueOnce(
      new mocks.AccountDeletionError("Unable to cancel active billing.", 409),
    );

    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error:
        "Unable to cancel active billing. Please retry from Settings or contact support.",
    });
  });

  it("passes through non-conflict deletion errors with their status", async () => {
    mocks.deleteUserAccount.mockRejectedValueOnce(
      new mocks.AccountDeletionError("Failed to remove avatar files.", 500),
    );

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to remove avatar files.",
    });
  });

  it("returns a generic 500 for unexpected failures", async () => {
    mocks.deleteUserAccount.mockRejectedValueOnce(new Error("boom"));

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to delete account.",
    });
  });
});
