import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  createServiceRoleSupabaseClient: vi.fn(),
  fetchProfileWithHostingAccess: vi.fn(),
  syncPageHostingState: vi.fn(),
  getAccountAccessState: vi.fn(),
  onProfileUpdate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.authGetUser },
  })),
  createServiceRoleSupabaseClient: vi.fn(() =>
    mocks.createServiceRoleSupabaseClient(),
  ),
}));

vi.mock("@/lib/profile-access", () => ({
  fetchProfileWithHostingAccess: (...args: unknown[]) =>
    mocks.fetchProfileWithHostingAccess(...args),
}));

vi.mock("@/lib/hosting-state", () => ({
  syncPageHostingState: (...args: unknown[]) => mocks.syncPageHostingState(...args),
}));

vi.mock("@/lib/account-access", () => ({
  getAccountAccessState: (...args: unknown[]) => mocks.getAccountAccessState(...args),
}));

import { GET, PATCH } from "@/app/api/profile/route";

function createServiceRoleClient(options?: {
  latestPage?: Record<string, unknown> | null;
  latestPageError?: { message: string } | null;
  profileUpdateError?: { message: string } | null;
}) {
  return {
    from(table: string) {
      if (table === "pages") {
        return {
          select: () => ({
            or: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: options?.latestPage ?? null,
                    error: options?.latestPageError ?? null,
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === "profiles") {
        return {
          update(values: Record<string, unknown>) {
            mocks.onProfileUpdate(values);
            return {
              eq: vi.fn().mockResolvedValue({
                error: options?.profileUpdateError ?? null,
              }),
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

function buildProfile(overrides?: Record<string, unknown>) {
  return {
    id: "user-1",
    username: "rachel",
    full_name: "Rachel Gergely",
    email: "rachel@example.com",
    avatar_url: null,
    plan: "spark",
    created_at: "2026-01-01T00:00:00.000Z",
    billing_cohort: "legacy_freemium",
    hosting_trial_started_at: null,
    stripe_subscription_status: null,
    stripe_trial_ends_at: null,
    signup_referrer: null,
    ...overrides,
  };
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "rachel@example.com",
          app_metadata: { providers: ["email"] },
          user_metadata: {},
        },
      },
    });
    mocks.createServiceRoleSupabaseClient.mockReturnValue(createServiceRoleClient());
    mocks.fetchProfileWithHostingAccess.mockResolvedValue({
      data: buildProfile(),
      error: null,
    });
    mocks.getAccountAccessState.mockReturnValue({ status: "active" });
  });

  describe("GET", () => {
    it("requires authentication", async () => {
      mocks.authGetUser.mockResolvedValueOnce({ data: { user: null } });

      const response = await GET();

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    });

    it("returns 404 when the profile cannot be loaded", async () => {
      mocks.fetchProfileWithHostingAccess.mockResolvedValueOnce({
        data: null,
        error: { message: "not found" },
      });

      const response = await GET();

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "Profile not found" });
    });

    it("returns the profile with account access and password info", async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        id: "user-1",
        username: "rachel",
        accountAccess: { status: "active" },
        hasLivingPage: false,
        latestPage: null,
        hasPassword: true,
      });
    });

    it("leaves page ownership inconclusive when the page lookup fails", async () => {
      mocks.createServiceRoleSupabaseClient.mockReturnValue(
        createServiceRoleClient({
          latestPageError: { message: "database unavailable" },
        }),
      );

      const response = await GET();

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        hasLivingPage: null,
        latestPage: null,
      });
    });
  });

  describe("PATCH", () => {
    it("requires authentication", async () => {
      mocks.authGetUser.mockResolvedValueOnce({ data: { user: null } });

      const response = await PATCH(patchRequest({ full_name: "New Name" }));

      expect(response.status).toBe(401);
      expect(mocks.onProfileUpdate).not.toHaveBeenCalled();
    });

    it("updates the trimmed full_name", async () => {
      const response = await PATCH(patchRequest({ full_name: "  Rachel G  " }));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ success: true });
      expect(mocks.onProfileUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ full_name: "Rachel G" }),
      );
    });

    it("rejects a full_name longer than 100 characters", async () => {
      const response = await PATCH(patchRequest({ full_name: "a".repeat(101) }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Name must be 100 characters or fewer.",
      });
      expect(mocks.onProfileUpdate).not.toHaveBeenCalled();
    });

    it("rejects requests with no updatable fields", async () => {
      const response = await PATCH(patchRequest({ plan: "premium" }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "No valid fields to update.",
      });
      expect(mocks.onProfileUpdate).not.toHaveBeenCalled();
    });

    it("returns 500 when the update fails", async () => {
      mocks.createServiceRoleSupabaseClient.mockReturnValue(
        createServiceRoleClient({ profileUpdateError: { message: "db down" } }),
      );

      const response = await PATCH(patchRequest({ full_name: "Rachel" }));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Failed to update profile.",
      });
    });
  });
});
