import { NextResponse } from "next/server";
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
    requireAdminUser: vi.fn(),
    getDeletionTargetProfile: vi.fn(),
    deleteUserAccount: vi.fn(),
    AccountDeletionError,
    isAccountDeletionError: (error: unknown) => error instanceof AccountDeletionError,
  };
});

vi.mock("@/lib/security/route-security", () => ({
  requireAdminUser: (...args: unknown[]) => mocks.requireAdminUser(...args),
}));

vi.mock("@/lib/account/deleteUserAccount", () => ({
  AccountDeletionError: mocks.AccountDeletionError,
  isAccountDeletionError: (error: unknown) => mocks.isAccountDeletionError(error),
  getDeletionTargetProfile: (...args: unknown[]) =>
    mocks.getDeletionTargetProfile(...args),
  deleteUserAccount: (...args: unknown[]) => mocks.deleteUserAccount(...args),
}));

import { DELETE } from "@/app/api/admin/users/[userId]/route";

function callDelete(userId: string) {
  return DELETE(new Request("http://localhost/api/admin/users/" + userId), {
    params: Promise.resolve({ userId }),
  });
}

function buildProfile(overrides?: Record<string, unknown>) {
  return {
    id: "target-1",
    email: "target@example.com",
    username: "target",
    full_name: "Target User",
    stripe_customer_id: null,
    ...overrides,
  };
}

describe("DELETE /api/admin/users/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminUser.mockResolvedValue({
      value: { user: { id: "admin-1", email: "admin@example.com" } },
    });
    mocks.getDeletionTargetProfile.mockResolvedValue(buildProfile());
    mocks.deleteUserAccount.mockResolvedValue(buildProfile());
  });

  it("rejects non-admin callers via the admin guard", async () => {
    mocks.requireAdminUser.mockResolvedValueOnce({
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await callDelete("target-1");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
  });

  it("deletes another user and writes an audit event", async () => {
    const response = await callDelete("target-1");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.deleteUserAccount).toHaveBeenCalledWith({
      targetUserId: "target-1",
      actorUserId: "admin-1",
      auditEventName: "admin.user_deleted",
    });
  });

  it("blocks an admin from deleting their own account", async () => {
    mocks.getDeletionTargetProfile.mockResolvedValueOnce(
      buildProfile({ email: "admin@example.com" }),
    );

    const response = await callDelete("admin-1");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "The admin account cannot be deleted from this flow.",
    });
    expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
  });

  it("returns 404 when the target user does not exist", async () => {
    mocks.getDeletionTargetProfile.mockResolvedValueOnce(null);

    const response = await callDelete("missing-1");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "User not found." });
    expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
  });

  it("passes through account-deletion errors with their status", async () => {
    mocks.deleteUserAccount.mockRejectedValueOnce(
      new mocks.AccountDeletionError("Failed to delete account.", 500),
    );

    const response = await callDelete("target-1");

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to delete account.",
    });
  });
});
