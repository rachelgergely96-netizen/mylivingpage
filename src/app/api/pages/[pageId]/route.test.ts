import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PAGE_VISIBILITY_WRITES } from "@/lib/page-visibility";

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

import { PATCH } from "@/app/api/pages/[pageId]/route";

interface PageFixture {
  id: string;
  owner_id: string;
  user_id: string;
  status: "draft" | "live";
  visibility: "private" | "public";
  published_at: string | null;
  resume_data: Record<string, unknown>;
  theme_id: string;
  slug: string;
}

function createServiceRoleClient(options: {
  page: PageFixture;
  pageLookupError?: { message: string } | null;
  onPageUpdate: (values: Record<string, unknown>) => void;
}) {
  return {
    from(table: string) {
      if (table === "pages") {
        return {
          select() {
            return {
              eq() {
                return {
                  or() {
                    return {
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: options.page,
                        error: options.pageLookupError ?? null,
                      }),
                    };
                  },
                };
              },
            };
          },
          update(values: Record<string, unknown>) {
            options.onPageUpdate(values);
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          },
        };
      }

      if (table === "page_archives") {
        return {
          select() {
            return {
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            };
          },
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

function patchPage(body: Record<string, unknown>) {
  return PATCH(
    new Request("http://localhost/api/pages/page-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ pageId: "page-1" }) },
  );
}

describe("PATCH /api/pages/[pageId] visibility transitions", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T15:30:00.000Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it("lets the owner publish a draft as live and public", async () => {
    const pageUpdate = vi.fn();
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        page: {
          id: "page-1",
          owner_id: "user-1",
          user_id: "user-1",
          status: "draft",
          visibility: "private",
          published_at: null,
          resume_data: { name: "Rachel Gergely" },
          theme_id: "cosmic",
          slug: "rachel",
        },
        onPageUpdate: pageUpdate,
      }),
    );

    const response = await patchPage({ ...PAGE_VISIBILITY_WRITES.public });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(pageUpdate).toHaveBeenCalledOnce();
    expect(pageUpdate).toHaveBeenCalledWith({
      status: "live",
      visibility: "public",
      search_indexable: true,
      published_at: "2026-07-15T15:30:00.000Z",
    });
  });

  it("lets the owner unpublish a live page as draft and private", async () => {
    const pageUpdate = vi.fn();
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        page: {
          id: "page-1",
          owner_id: "user-1",
          user_id: "user-1",
          status: "live",
          visibility: "public",
          published_at: "2026-06-01T12:00:00.000Z",
          resume_data: { name: "Rachel Gergely" },
          theme_id: "cosmic",
          slug: "rachel",
        },
        onPageUpdate: pageUpdate,
      }),
    );

    const response = await patchPage({ ...PAGE_VISIBILITY_WRITES.offline });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(pageUpdate).toHaveBeenCalledOnce();
    expect(pageUpdate).toHaveBeenCalledWith({
      status: "draft",
      visibility: "private",
      search_indexable: false,
      // Preserved, so a page that comes back does not look newly created.
      published_at: "2026-06-01T12:00:00.000Z",
    });
  });

  it("lets the owner go link-only without touching the token-share enum value", async () => {
    const pageUpdate = vi.fn();
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        page: {
          id: "page-1",
          owner_id: "user-1",
          user_id: "user-1",
          status: "live",
          visibility: "public",
          published_at: "2026-06-01T12:00:00.000Z",
          resume_data: { name: "Rachel Gergely" },
          theme_id: "cosmic",
          slug: "rachel",
        },
        onPageUpdate: pageUpdate,
      }),
    );

    const response = await patchPage({ ...PAGE_VISIBILITY_WRITES.link });

    expect(response.status).toBe(200);
    // visibility='link' is reserved by pages_link_requires_share_token_chk for
    // token sharing; link-only must stay public and drop indexability instead.
    expect(pageUpdate).toHaveBeenCalledWith({
      status: "live",
      visibility: "public",
      search_indexable: false,
      published_at: "2026-06-01T12:00:00.000Z",
    });
  });

  it.each([
    ["a status without visibility", { status: "live", theme_id: "matrix" }],
    ["visibility without a status", { visibility: "public", theme_id: "matrix" }],
    [
      "live status paired with private visibility",
      { status: "live", visibility: "private", theme_id: "matrix" },
    ],
    [
      "draft status paired with public visibility",
      { status: "draft", visibility: "public", theme_id: "matrix" },
    ],
    [
      "the reserved token-share visibility",
      {
        status: "live",
        visibility: "link",
        search_indexable: false,
        theme_id: "matrix",
      },
    ],
    [
      "a live public page asking to be unindexed without the whole state",
      { search_indexable: false, theme_id: "matrix" },
    ],
  ])("rejects %s without applying any other updates", async (_label, body) => {
    const pageUpdate = vi.fn();
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        page: {
          id: "page-1",
          owner_id: "user-1",
          user_id: "user-1",
          status: "draft",
          visibility: "private",
          published_at: null,
          resume_data: { name: "Rachel Gergely" },
          theme_id: "cosmic",
          slug: "rachel",
        },
        onPageUpdate: pageUpdate,
      }),
    );

    const response = await patchPage(body);

    expect(response.status).toBe(400);
    expect(pageUpdate).not.toHaveBeenCalled();
  });

  it("rejects malformed resume data and client-controlled timestamps", async () => {
    const pageUpdate = vi.fn();
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        page: {
          id: "page-1",
          owner_id: "user-1",
          user_id: "user-1",
          status: "live",
          visibility: "public",
          published_at: "2026-06-01T12:00:00.000Z",
          resume_data: { name: "Rachel Gergely" },
          theme_id: "cosmic",
          slug: "rachel",
        },
        onPageUpdate: pageUpdate,
      }),
    );

    const malformed = await patchPage({
      resume_data: { name: "Rachel", experience: "invalid" },
    });
    const timestampOnly = await patchPage({
      updated_at: "2099-01-01T00:00:00.000Z",
    });

    expect(malformed.status).toBe(400);
    expect(timestampOnly.status).toBe(400);
    expect(pageUpdate).not.toHaveBeenCalled();
  });

  it("reports a temporary outage instead of masking a page lookup error", async () => {
    const pageUpdate = vi.fn();
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        pageLookupError: { message: "database unavailable" },
        page: {
          id: "page-1",
          owner_id: "user-1",
          user_id: "user-1",
          status: "live",
          visibility: "public",
          published_at: "2026-06-01T12:00:00.000Z",
          resume_data: { name: "Rachel Gergely" },
          theme_id: "cosmic",
          slug: "rachel",
        },
        onPageUpdate: pageUpdate,
      }),
    );

    const response = await patchPage({
      resume_data: { name: "Rachel Gergely" },
    });

    expect(response.status).toBe(503);
    expect(pageUpdate).not.toHaveBeenCalled();
  });
});
