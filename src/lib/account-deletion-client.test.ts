import { describe, expect, it, vi } from "vitest";
import { finishDeletedAccountClientState } from "@/lib/account-deletion-client";

describe("finishDeletedAccountClientState", () => {
  it("clears drafts, signs out, and navigates home in order", async () => {
    const calls: string[] = [];

    await finishDeletedAccountClientState({
      clearLocalDrafts: () => calls.push("clear"),
      signOut: async () => {
        calls.push("sign-out");
      },
      navigateHome: () => calls.push("navigate"),
    });

    expect(calls).toEqual(["clear", "sign-out", "navigate"]);
  });

  it("still navigates after local cleanup fails for an account already deleted on the server", async () => {
    const navigateHome = vi.fn();

    await expect(
      finishDeletedAccountClientState({
        clearLocalDrafts: vi.fn(),
        signOut: vi.fn().mockRejectedValue(new Error("network unavailable")),
        navigateHome,
      }),
    ).resolves.toBeUndefined();

    expect(navigateHome).toHaveBeenCalledOnce();
  });
});
