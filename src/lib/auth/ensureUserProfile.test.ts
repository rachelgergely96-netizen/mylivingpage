import type { SupabaseClient, User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { ensureUserProfile } from "@/lib/auth/ensureUserProfile";

interface ExistingProfileResult {
  data: { id: string; username: string | null } | null;
  error: unknown | null;
}

interface ConflictResult {
  data: { id: string } | null;
  error: unknown | null;
}

interface UpsertResult {
  data: { id: string; username: string } | null;
  error: unknown | null;
}

function buildUser(overrides?: Partial<User>) {
  return {
    id: "user-1",
    email: "rachel@example.com",
    app_metadata: { provider: "email" },
    user_metadata: {
      full_name: "Rachel Gergely",
      signup_referrer: "homepage",
    },
    aud: "authenticated",
    created_at: "2026-08-23T00:00:00.000Z",
    ...overrides,
  } as User;
}

function createProfileClient(options?: {
  existing?: ExistingProfileResult;
  conflicts?: ConflictResult[];
  upsert?: UpsertResult;
}) {
  const existingMaybeSingle = vi.fn().mockResolvedValue(
    options?.existing ?? {
      data: null,
      error: null,
    },
  );
  const conflictMaybeSingle = vi.fn().mockResolvedValue({
    data: null,
    error: null,
  });
  for (const result of options?.conflicts ?? []) {
    conflictMaybeSingle.mockResolvedValueOnce(result);
  }

  const upsertMaybeSingle = vi.fn().mockResolvedValue(
    options?.upsert ?? {
      data: { id: "user-1", username: "rachel" },
      error: null,
    },
  );
  const eq = vi.fn((field: string) => {
    if (field === "id") {
      return { maybeSingle: existingMaybeSingle };
    }
    if (field === "username") {
      return { maybeSingle: conflictMaybeSingle };
    }
    throw new Error(`Unexpected equality field: ${field}`);
  });
  const select = vi.fn(() => ({ eq }));
  const upsertSelect = vi.fn(() => ({ maybeSingle: upsertMaybeSingle }));
  const upsert = vi.fn(() => ({ select: upsertSelect }));
  const from = vi.fn((table: string) => {
    if (table !== "profiles") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return { select, upsert };
  });

  return {
    client: { from } as unknown as SupabaseClient,
    conflictMaybeSingle,
    eq,
    existingMaybeSingle,
    upsert,
  };
}

describe("ensureUserProfile", () => {
  it("fails closed when the existing-profile lookup fails", async () => {
    const readError = { message: "profile lookup unavailable" };
    const harness = createProfileClient({
      existing: { data: null, error: readError },
    });

    await expect(
      ensureUserProfile(harness.client, buildUser()),
    ).rejects.toBe(readError);
    expect(harness.conflictMaybeSingle).not.toHaveBeenCalled();
    expect(harness.upsert).not.toHaveBeenCalled();
  });

  it("fails closed when a username-conflict lookup fails", async () => {
    const conflictError = { message: "username lookup unavailable" };
    const harness = createProfileClient({
      conflicts: [{ data: null, error: conflictError }],
    });

    await expect(
      ensureUserProfile(harness.client, buildUser()),
    ).rejects.toBe(conflictError);
    expect(harness.upsert).not.toHaveBeenCalled();
  });

  it("returns an existing named profile without attempting a write", async () => {
    const existingProfile = { id: "user-1", username: "rachel" };
    const harness = createProfileClient({
      existing: { data: existingProfile, error: null },
    });

    await expect(
      ensureUserProfile(harness.client, buildUser()),
    ).resolves.toEqual(existingProfile);
    expect(harness.conflictMaybeSingle).not.toHaveBeenCalled();
    expect(harness.upsert).not.toHaveBeenCalled();
  });

  it("preserves signup metadata when it provisions a missing profile", async () => {
    const harness = createProfileClient();
    const user = buildUser({
      app_metadata: { providers: ["google"] },
      user_metadata: {
        full_name: "Rachel Gergely",
        signup_referrer: "metadata-referrer",
      },
    });

    await expect(
      ensureUserProfile(harness.client, user, {
        signupReferrer: "callback-referrer",
      }),
    ).resolves.toEqual({ id: "user-1", username: "rachel" });
    expect(harness.upsert).toHaveBeenCalledWith(
      {
        id: "user-1",
        username: "rachel",
        email: "rachel@example.com",
        full_name: "Rachel Gergely",
        auth_provider: "google",
        signup_referrer: "callback-referrer",
      },
      { onConflict: "id" },
    );
  });

  it("keeps the existing suffix search behavior for username conflicts", async () => {
    const harness = createProfileClient({
      conflicts: [
        { data: { id: "other-user" }, error: null },
        { data: null, error: null },
      ],
      upsert: {
        data: { id: "user-1", username: "rachel-2" },
        error: null,
      },
    });

    await expect(
      ensureUserProfile(harness.client, buildUser()),
    ).resolves.toEqual({ id: "user-1", username: "rachel-2" });
    expect(harness.eq).toHaveBeenCalledWith("username", "rachel");
    expect(harness.eq).toHaveBeenCalledWith("username", "rachel-2");
    expect(harness.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ username: "rachel-2" }),
      { onConflict: "id" },
    );
  });

  it("continues to surface a concurrent unique-username collision from upsert", async () => {
    const collisionError = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    };
    const harness = createProfileClient({
      upsert: { data: null, error: collisionError },
    });

    await expect(
      ensureUserProfile(harness.client, buildUser()),
    ).rejects.toBe(collisionError);
  });
});
