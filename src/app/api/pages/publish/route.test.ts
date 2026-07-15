import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  createServiceRoleSupabaseClient: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.authGetUser,
    },
  })),
  createServiceRoleSupabaseClient: vi.fn(() =>
    mocks.createServiceRoleSupabaseClient(),
  ),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: (...args: unknown[]) => mocks.trackEvent(...args),
}));

import { POST } from "@/app/api/pages/publish/route";

function createServiceRoleClient(options?: {
  profile?: {
    plan?: string | null;
    username?: string | null;
    billing_cohort?: string | null;
    hosting_trial_started_at?: string | null;
    stripe_subscription_status?: string | null;
    stripe_trial_ends_at?: string | null;
  } | null;
  existingPageId?: string | null;
  persistedPageId?: string | null;
  onProfileUpdate?: (values: Record<string, unknown>) => void;
  onProfileUpsert?: (values: Record<string, unknown>) => void;
  onPageUpsert?: (values: Record<string, unknown>) => void;
}) {
  let pageSelectCount = 0;

  return {
    from(table: string) {
      if (table === "profiles") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data:
                      options?.profile ?? {
                        plan: "spark",
                        username: "rachel",
                        billing_cohort: "legacy_freemium",
                        hosting_trial_started_at: null,
                        stripe_subscription_status: null,
                        stripe_trial_ends_at: null,
                      },
                    error: null,
                  }),
                  single: vi.fn().mockResolvedValue({
                    data:
                      options?.profile ?? {
                        plan: "spark",
                        username: "rachel",
                        billing_cohort: "legacy_freemium",
                        hosting_trial_started_at: null,
                        stripe_subscription_status: null,
                        stripe_trial_ends_at: null,
                      },
                    error: null,
                  }),
                };
              },
            };
          },
          update(values: Record<string, unknown>) {
            options?.onProfileUpdate?.(values);
            return {
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            };
          },
          upsert(values: Record<string, unknown>) {
            options?.onProfileUpsert?.(values);
            return Promise.resolve({ error: null });
          },
        };
      }

      if (table === "pages") {
        return {
          select() {
            return {
              eq() {
                const currentCall = pageSelectCount++;
                const data =
                  currentCall === 0
                    ? options?.existingPageId
                      ? { id: options.existingPageId }
                      : null
                    : {
                        id:
                          options?.persistedPageId ??
                          options?.existingPageId ??
                          "page-1",
                      };

                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data,
                    error: null,
                  }),
                };
              },
            };
          },
          upsert(values: Record<string, unknown>) {
            options?.onPageUpsert?.(values);
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

describe("POST /api/pages/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "rachel@example.com",
        },
      },
    });
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it("publishes for trial-hosting cohort users without starting a hosting timer", async () => {
    const profileUpdates = vi.fn();
    const pageUpserts = vi.fn();

    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        profile: {
          plan: "spark",
          username: "rachel",
          billing_cohort: "trial_hosting_v1",
          hosting_trial_started_at: null,
          stripe_subscription_status: null,
          stripe_trial_ends_at: null,
        },
        onProfileUpdate: profileUpdates,
        onPageUpsert: pageUpserts,
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/pages/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Rachel Gergely",
          theme_id: "matrix",
          resume_data: { name: "Rachel Gergely" },
          raw_resume: "Rachel Gergely",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      slug: "rachel",
      pageId: "page-1",
    });
    expect(profileUpdates).not.toHaveBeenCalled();
    expect(pageUpserts).toHaveBeenCalledWith(
      expect.objectContaining({
        theme_id: "matrix",
        status: "live",
        visibility: "public",
      }),
    );
  });

  it("lets expired trial-hosting users republish for free", async () => {
    const pageUpserts = vi.fn();

    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        profile: {
          plan: "spark",
          username: "rachel",
          billing_cohort: "trial_hosting_v1",
          hosting_trial_started_at: "2026-01-01T00:00:00.000Z",
          stripe_subscription_status: null,
          stripe_trial_ends_at: null,
        },
        onPageUpsert: pageUpserts,
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/pages/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Rachel Gergely",
          theme_id: "matrix",
          resume_data: { name: "Rachel Gergely" },
          raw_resume: "Rachel Gergely",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      slug: "rachel",
      pageId: "page-1",
    });
    expect(pageUpserts).toHaveBeenCalledWith(
      expect.objectContaining({ status: "live", visibility: "public" }),
    );
  });

  it("lets new publish-cc users publish without checkout", async () => {
    const pageUpserts = vi.fn();

    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        profile: {
          plan: "spark",
          username: "rachel",
          billing_cohort: "publish_cc_trial_v1",
          hosting_trial_started_at: null,
          stripe_subscription_status: null,
          stripe_trial_ends_at: null,
        },
        onPageUpsert: pageUpserts,
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/pages/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Rachel Gergely",
          theme_id: "cosmic",
          resume_data: { name: "Rachel Gergely" },
          raw_resume: "Rachel Gergely",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      slug: "rachel",
      pageId: "page-1",
    });
    expect(pageUpserts).toHaveBeenCalledWith(
      expect.objectContaining({ status: "live", visibility: "public" }),
    );
  });
});
