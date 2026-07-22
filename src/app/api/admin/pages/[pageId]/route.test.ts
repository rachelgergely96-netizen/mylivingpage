import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  maybeSingle: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/security/route-security", () => ({
  requireAdminUser: mocks.requireAdminUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleSupabaseClient: () => ({
    from: () => ({
      update: () => ({
        eq: () => ({
          select: () => ({ maybeSingle: mocks.maybeSingle }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/track-event", () => ({ trackEvent: mocks.trackEvent }));

import { PATCH } from "@/app/api/admin/pages/[pageId]/route";

describe("PATCH /api/admin/pages/[pageId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminUser.mockResolvedValue({ value: { user: { id: "admin-1" } } });
    mocks.maybeSingle.mockResolvedValue({ data: { id: "page-1" }, error: null });
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it("requires an administrator", async () => {
    mocks.requireAdminUser.mockResolvedValue({
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });
    const response = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ pageId: "page-1" }),
    });
    expect(response.status).toBe(403);
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it("unpublishes and audits the page", async () => {
    const response = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ pageId: "page-1" }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.trackEvent).toHaveBeenCalledWith("admin-1", "admin.page.unpublished", {
      page_id: "page-1",
    });
  });

  it("returns 404 when the page does not exist", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const response = await PATCH(new Request("http://localhost"), {
      params: Promise.resolve({ pageId: "missing-page" }),
    });
    expect(response.status).toBe(404);
  });
});
