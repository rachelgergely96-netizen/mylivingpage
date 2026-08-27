import { describe, expect, it, vi } from "vitest";
import { completeClientSignOut } from "@/lib/auth/client-sign-out";

describe("completeClientSignOut", () => {
  it("clears local drafts only after sign-out succeeds", async () => {
    const clearLocalDrafts = vi.fn();

    await expect(
      completeClientSignOut({
        signOut: vi.fn().mockResolvedValue({ error: null }),
        clearLocalDrafts,
      }),
    ).resolves.toBeUndefined();

    expect(clearLocalDrafts).toHaveBeenCalledOnce();
  });

  it("preserves local drafts when Supabase resolves with an auth error", async () => {
    const authError = new Error("session revoke failed");
    const clearLocalDrafts = vi.fn();

    await expect(
      completeClientSignOut({
        signOut: vi.fn().mockResolvedValue({ error: authError }),
        clearLocalDrafts,
      }),
    ).rejects.toBe(authError);

    expect(clearLocalDrafts).not.toHaveBeenCalled();
  });

  it("preserves local drafts when sign-out rejects", async () => {
    const clearLocalDrafts = vi.fn();

    await expect(
      completeClientSignOut({
        signOut: vi.fn().mockRejectedValue(new Error("offline")),
        clearLocalDrafts,
      }),
    ).rejects.toThrow("offline");

    expect(clearLocalDrafts).not.toHaveBeenCalled();
  });
});
