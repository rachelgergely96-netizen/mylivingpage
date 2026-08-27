import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  getStripe: vi.fn(),
  profileMaybeSingle: vi.fn(),
  avatarList: vi.fn(),
  avatarRemove: vi.fn(),
  authDeleteUser: vi.fn(),
  subscriptionList: vi.fn(),
  subscriptionCancel: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: (...args: unknown[]) => mocks.getStripe(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleSupabaseClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table !== "profiles") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: mocks.profileMaybeSingle,
          })),
        })),
      };
    }),
    storage: {
      from: vi.fn((bucket: string) => {
        if (bucket !== "avatars") {
          throw new Error(`Unexpected bucket: ${bucket}`);
        }
        return {
          list: mocks.avatarList,
          remove: mocks.avatarRemove,
        };
      }),
    },
    auth: {
      admin: {
        deleteUser: mocks.authDeleteUser,
      },
    },
  })),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: (...args: unknown[]) => mocks.trackEvent(...args),
}));

import {
  AccountDeletionError,
  deleteUserAccount,
} from "@/lib/account/deleteUserAccount";

const profile = {
  id: "user-1",
  email: "person@example.com",
  username: "person",
  full_name: "Person Example",
  stripe_customer_id: "cus_123",
};

describe("deleteUserAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls.length = 0;

    mocks.getStripe.mockImplementation(() => ({
      subscriptions: {
        list: mocks.subscriptionList,
        cancel: mocks.subscriptionCancel,
      },
    }));
    mocks.profileMaybeSingle.mockImplementation(async () => {
      mocks.calls.push("profile:load");
      return { data: profile, error: null };
    });
    mocks.subscriptionList.mockImplementation(async (options: { starting_after?: string }) => {
      mocks.calls.push(`billing:list:${options.starting_after ?? "first"}`);
      return {
        data: [
          { id: "sub_active", status: "active" },
          { id: "sub_canceled", status: "canceled" },
          { id: "sub_expired", status: "incomplete_expired" },
          { id: "sub_past_due", status: "past_due" },
        ],
        has_more: false,
      };
    });
    mocks.subscriptionCancel.mockImplementation(async (subscriptionId: string) => {
      mocks.calls.push(`billing:cancel:${subscriptionId}`);
      return { id: subscriptionId };
    });
    mocks.avatarList.mockImplementation(async (userId: string, options: { offset: number }) => {
      mocks.calls.push(`storage:list:${userId}:${options.offset}`);
      return {
        data: [{ name: "headshot-one" }, { name: "headshot-two" }],
        error: null,
      };
    });
    mocks.avatarRemove.mockImplementation(async (paths: string[]) => {
      mocks.calls.push(`storage:remove:${paths.join(",")}`);
      return { error: null };
    });
    mocks.authDeleteUser.mockImplementation(async (userId: string) => {
      mocks.calls.push(`auth:delete:${userId}`);
      return { error: null };
    });
    mocks.trackEvent.mockImplementation(async () => {
      mocks.calls.push("audit:track");
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cancels live billing, removes storage, deletes auth last, then audits", async () => {
    await expect(
      deleteUserAccount({
        targetUserId: "user-1",
        actorUserId: "admin-1",
        auditEventName: "admin.user_deleted",
      }),
    ).resolves.toEqual(profile);

    expect(mocks.subscriptionList).toHaveBeenCalledWith({
      customer: "cus_123",
      status: "all",
      limit: 100,
    });
    expect(mocks.avatarList).toHaveBeenCalledWith("user-1", {
      limit: 100,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    expect(mocks.subscriptionCancel.mock.calls.map(([id]) => id)).toEqual([
      "sub_active",
      "sub_past_due",
    ]);
    expect(mocks.avatarRemove).toHaveBeenCalledWith([
      "user-1/headshot-one",
      "user-1/headshot-two",
    ]);
    expect(mocks.trackEvent).toHaveBeenCalledWith("admin-1", "admin.user_deleted", {
      target_user_id: "user-1",
      target_email: "person@example.com",
      target_username: "person",
    });
    expect(mocks.calls).toEqual([
      "profile:load",
      "billing:list:first",
      "billing:cancel:sub_active",
      "billing:cancel:sub_past_due",
      "storage:list:user-1:0",
      "storage:remove:user-1/headshot-one,user-1/headshot-two",
      "auth:delete:user-1",
      "audit:track",
    ]);
  });

  it("skips billing and storage removal when the profile has neither", async () => {
    mocks.profileMaybeSingle.mockResolvedValueOnce({
      data: { ...profile, stripe_customer_id: null },
      error: null,
    });
    mocks.avatarList.mockResolvedValueOnce({ data: [], error: null });

    await deleteUserAccount({ targetUserId: "user-1" });

    expect(mocks.getStripe).not.toHaveBeenCalled();
    expect(mocks.avatarRemove).not.toHaveBeenCalled();
    expect(mocks.authDeleteUser).toHaveBeenCalledWith("user-1");
  });

  it("cancels cancellable subscriptions across every Stripe page", async () => {
    mocks.subscriptionList
      .mockResolvedValueOnce({
        data: [
          { id: "sub_page_one_active", status: "active" },
          { id: "sub_page_one_canceled", status: "canceled" },
        ],
        has_more: true,
      })
      .mockResolvedValueOnce({
        data: [
          { id: "sub_page_two_trialing", status: "trialing" },
          { id: "sub_page_two_expired", status: "incomplete_expired" },
        ],
        has_more: false,
      });

    await deleteUserAccount({ targetUserId: "user-1" });

    expect(mocks.subscriptionList).toHaveBeenNthCalledWith(1, {
      customer: "cus_123",
      status: "all",
      limit: 100,
    });
    expect(mocks.subscriptionList).toHaveBeenNthCalledWith(2, {
      customer: "cus_123",
      status: "all",
      limit: 100,
      starting_after: "sub_page_one_canceled",
    });
    expect(mocks.subscriptionCancel.mock.calls.map(([id]) => id)).toEqual([
      "sub_page_one_active",
      "sub_page_two_trialing",
    ]);
    expect(mocks.authDeleteUser).toHaveBeenCalledOnce();
  });

  it("stops before cancellation, storage, and auth when a later Stripe page fails", async () => {
    mocks.subscriptionList
      .mockResolvedValueOnce({
        data: [{ id: "sub_page_one_active", status: "active" }],
        has_more: true,
      })
      .mockRejectedValueOnce(new Error("Stripe pagination unavailable"));

    await expect(
      deleteUserAccount({ targetUserId: "user-1" }),
    ).rejects.toMatchObject({
      name: "AccountDeletionError",
      status: 409,
    });
    expect(mocks.subscriptionCancel).not.toHaveBeenCalled();
    expect(mocks.avatarList).not.toHaveBeenCalled();
    expect(mocks.authDeleteUser).not.toHaveBeenCalled();
  });

  it("lists every avatar page before removing objects in bounded batches", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      name: `headshot-${String(index).padStart(3, "0")}`,
    }));
    const secondPage = [{ name: "headshot-100" }, { name: "headshot-101" }];
    mocks.avatarList
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: secondPage, error: null });

    await deleteUserAccount({ targetUserId: "user-1" });

    expect(mocks.avatarList).toHaveBeenNthCalledWith(1, "user-1", {
      limit: 100,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    expect(mocks.avatarList).toHaveBeenNthCalledWith(2, "user-1", {
      limit: 100,
      offset: 100,
      sortBy: { column: "name", order: "asc" },
    });
    expect(mocks.avatarRemove).toHaveBeenCalledTimes(2);
    expect(mocks.avatarRemove.mock.calls[0]?.[0]).toHaveLength(100);
    expect(mocks.avatarRemove.mock.calls[1]?.[0]).toEqual([
      "user-1/headshot-100",
      "user-1/headshot-101",
    ]);
    expect(mocks.authDeleteUser).toHaveBeenCalledOnce();
  });

  it("stops before avatar removal and auth deletion when a later storage page fails", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      name: `headshot-${index}`,
    }));
    mocks.avatarList
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "Storage unavailable" } });

    await expect(
      deleteUserAccount({ targetUserId: "user-1" }),
    ).rejects.toMatchObject({
      name: "AccountDeletionError",
      message: "Failed to inspect avatar files for deletion.",
    });
    expect(mocks.avatarRemove).not.toHaveBeenCalled();
    expect(mocks.authDeleteUser).not.toHaveBeenCalled();
  });

  it("classifies Stripe client initialization failure and stops deletion", async () => {
    mocks.getStripe.mockImplementationOnce(() => {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    });

    const deletion = deleteUserAccount({ targetUserId: "user-1" });

    await expect(deletion).rejects.toMatchObject({
      name: "AccountDeletionError",
      status: 409,
      message: "Unable to cancel active billing. Please retry or resolve billing first.",
    });
    expect(mocks.avatarList).not.toHaveBeenCalled();
    expect(mocks.authDeleteUser).not.toHaveBeenCalled();
  });

  it("stops before storage and auth deletion when subscription cancellation fails", async () => {
    mocks.subscriptionCancel.mockRejectedValueOnce(new Error("Stripe unavailable"));

    await expect(
      deleteUserAccount({ targetUserId: "user-1" }),
    ).rejects.toBeInstanceOf(AccountDeletionError);
    expect(mocks.avatarList).not.toHaveBeenCalled();
    expect(mocks.authDeleteUser).not.toHaveBeenCalled();
  });

  it("stops before auth deletion when avatar cleanup fails", async () => {
    mocks.avatarRemove.mockResolvedValueOnce({ error: { message: "Storage unavailable" } });

    await expect(
      deleteUserAccount({ targetUserId: "user-1" }),
    ).rejects.toMatchObject({
      name: "AccountDeletionError",
      status: 500,
      message: "Failed to remove avatar files.",
    });
    expect(mocks.authDeleteUser).not.toHaveBeenCalled();
  });

  it("does not emit a success audit event when auth deletion fails", async () => {
    mocks.authDeleteUser.mockResolvedValueOnce({ error: { message: "Auth unavailable" } });

    await expect(
      deleteUserAccount({
        targetUserId: "user-1",
        actorUserId: "admin-1",
        auditEventName: "admin.user_deleted",
      }),
    ).rejects.toMatchObject({
      name: "AccountDeletionError",
      status: 500,
      message: "Failed to delete account.",
    });
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });
});
