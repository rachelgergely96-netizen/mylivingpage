import { describe, expect, it, vi } from "vitest";
import { requireRecentReauthentication } from "@/lib/auth/reauthentication";

describe("requireRecentReauthentication", () => {
  it("verifies password identities with their current password", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    const result = await requireRecentReauthentication(
      { auth: { signInWithPassword } },
      {
        email: "person@example.com",
        app_metadata: { providers: ["email"] },
      },
      "current-password",
    );

    expect(result).toEqual({ ok: true });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "current-password",
    });
  });

  it("rejects an incorrect current password with a fixed message", async () => {
    const result = await requireRecentReauthentication(
      { auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: { message: "provider detail" } }) } },
      { email: "person@example.com", app_metadata: { providers: ["email"] } },
      "wrong-password",
    );

    expect(result).toMatchObject({ ok: false, status: 403, code: "REAUTH_REQUIRED" });
    expect(result).not.toHaveProperty("error", "provider detail");
  });

  it("requires provider accounts to have signed in recently", async () => {
    const now = Date.parse("2026-07-19T18:00:00.000Z");
    const client = { auth: { signInWithPassword: vi.fn() } };

    await expect(requireRecentReauthentication(
      client,
      { last_sign_in_at: "2026-07-19T17:55:00.000Z", app_metadata: { providers: ["google"] } },
      undefined,
      now,
    )).resolves.toEqual({ ok: true });

    await expect(requireRecentReauthentication(
      client,
      { last_sign_in_at: "2026-07-19T17:30:00.000Z", app_metadata: { providers: ["google"] } },
      undefined,
      now,
    )).resolves.toMatchObject({ ok: false, status: 403, code: "REAUTH_REQUIRED" });
  });
});
