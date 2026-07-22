import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ensureUserProfile } from "@/lib/auth/ensureUserProfile";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "rachel@example.com",
    app_metadata: { provider: "email" },
    user_metadata: { full_name: "Rachel Example" },
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as User;
}

function makeClient(input: {
  existing?: { id: string; username: string | null } | null;
  conflicts?: Array<{ id: string } | null>;
}) {
  const conflicts = [...(input.conflicts ?? [])];
  const upsert = vi.fn((payload: Record<string, unknown>) => ({
    select: () => ({
      maybeSingle: async () => ({ data: { id: payload.id, username: payload.username }, error: null }),
    }),
  }));
  let profileIdLookupDone = false;
  const client = {
    from: () => ({
      select: () => ({
        eq: (field: string) => ({
          maybeSingle: async () => {
            if (field === "id" && !profileIdLookupDone) {
              profileIdLookupDone = true;
              return { data: input.existing ?? null, error: null };
            }
            return { data: conflicts.shift() ?? null, error: null };
          },
        }),
      }),
      upsert,
    }),
  };
  return { client: client as unknown as SupabaseClient, upsert };
}

describe("ensureUserProfile", () => {
  it("returns an existing complete profile without writing", async () => {
    const { client, upsert } = makeClient({ existing: { id: "user-1", username: "rachel" } });
    await expect(ensureUserProfile(client, makeUser())).resolves.toEqual({ id: "user-1", username: "rachel" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("adds a suffix until the generated username is available", async () => {
    const { client, upsert } = makeClient({
      existing: null,
      conflicts: [{ id: "other-1" }, { id: "other-2" }, null],
    });
    await expect(ensureUserProfile(client, makeUser())).resolves.toEqual({ id: "user-1", username: "rachel-3" });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ username: "rachel-3" }), { onConflict: "id" });
  });

  it("preserves provider and signup attribution", async () => {
    const { client, upsert } = makeClient({ existing: null });
    await ensureUserProfile(client, makeUser({
      app_metadata: { provider: "google" },
      user_metadata: { name: "Rachel Google", signup_referrer: "guide" },
    }));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      auth_provider: "google",
      full_name: "Rachel Google",
      signup_referrer: "guide",
    }), { onConflict: "id" });
  });
});
