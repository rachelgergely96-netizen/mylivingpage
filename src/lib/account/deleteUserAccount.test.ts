import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscriptionList: vi.fn(),
  subscriptionCancel: vi.fn(),
  customerDelete: vi.fn(),
  profileMaybeSingle: vi.fn(),
  storageList: vi.fn(),
  storageRemove: vi.fn(),
  authDeleteUser: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    subscriptions: { list: mocks.subscriptionList, cancel: mocks.subscriptionCancel },
    customers: { del: mocks.customerDelete },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleSupabaseClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.profileMaybeSingle }) }),
    }),
    storage: {
      from: (bucket: string) => ({
        list: (userId: string) => mocks.storageList(bucket, userId),
        remove: (paths: string[]) => mocks.storageRemove(bucket, paths),
      }),
    },
    auth: { admin: { deleteUser: mocks.authDeleteUser } },
  }),
}));

vi.mock("@/lib/track-event", () => ({ trackEvent: mocks.trackEvent }));

import { deleteUserAccount } from "@/lib/account/deleteUserAccount";

describe("deleteUserAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profileMaybeSingle.mockResolvedValue({
      data: {
        id: "user-1",
        email: "person@example.com",
        username: "person",
        full_name: "Person",
        stripe_customer_id: "cus_123",
      },
      error: null,
    });
    mocks.subscriptionList.mockResolvedValue({ data: [{ id: "sub_1", status: "active" }] });
    mocks.subscriptionCancel.mockResolvedValue({});
    mocks.customerDelete.mockResolvedValue({ deleted: true });
    mocks.storageList.mockResolvedValue({ data: [], error: null });
    mocks.storageRemove.mockResolvedValue({ error: null });
    mocks.authDeleteUser.mockResolvedValue({ error: null });
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it("cleans billing and files before deleting authentication", async () => {
    await deleteUserAccount({ targetUserId: "user-1" });
    expect(mocks.subscriptionCancel).toHaveBeenCalledWith("sub_1");
    expect(mocks.customerDelete).toHaveBeenCalledWith("cus_123");
    expect(mocks.storageList).toHaveBeenCalledWith("avatars", "user-1");
    expect(mocks.storageList).toHaveBeenCalledWith("page-images", "user-1");
    expect(mocks.authDeleteUser).toHaveBeenCalledWith("user-1");
    expect(mocks.customerDelete.mock.invocationCallOrder[0]).toBeLessThan(mocks.authDeleteUser.mock.invocationCallOrder[0]);
  });

  it("does not delete auth when Stripe cleanup fails", async () => {
    mocks.subscriptionList.mockRejectedValue(new Error("Stripe unavailable"));
    await expect(deleteUserAccount({ targetUserId: "user-1" })).rejects.toMatchObject({ status: 409 });
    expect(mocks.authDeleteUser).not.toHaveBeenCalled();
  });

  it("does not delete auth when storage cleanup fails", async () => {
    mocks.storageList.mockResolvedValueOnce({ data: null, error: { message: "Storage unavailable" } });
    await expect(deleteUserAccount({ targetUserId: "user-1" })).rejects.toMatchObject({ status: 500 });
    expect(mocks.authDeleteUser).not.toHaveBeenCalled();
  });

  it("does not retain deleted email or username in the admin audit event", async () => {
    await deleteUserAccount({ targetUserId: "user-1", actorUserId: "admin-1", auditEventName: "admin.user.deleted" });
    expect(mocks.trackEvent).toHaveBeenCalledWith("admin-1", "admin.user.deleted", { target_user_id: "user-1" });
  });
});
