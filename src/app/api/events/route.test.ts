import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  enforceRateLimit: vi.fn(),
  pageMaybeSingle: vi.fn(),
  recordEvent: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.authGetUser },
  })),
  createServiceRoleSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          or: vi.fn(() => ({ maybeSingle: mocks.pageMaybeSingle })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/track-event", () => ({
  recordEvent: (...args: unknown[]) => mocks.recordEvent(...args),
}));

import { POST } from "@/app/api/events/route";

function buildRequest(body: unknown, headers?: HeadersInit) {
  return new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mocks.enforceRateLimit.mockResolvedValue({ limited: false });
    mocks.pageMaybeSingle.mockResolvedValue({ data: { id: "page-1" }, error: null });
    mocks.recordEvent.mockResolvedValue(true);
  });

  it("records an allowlisted share event with bounded metadata", async () => {
    const response = await POST(
      buildRequest({
        eventName: "page.share.copy_link",
        metadata: {
          page_id: "page-1",
          scenario: "recruiter_reply",
          surface: "create_success",
          variant_id: null,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ policy: "client_event", userId: "user-1" }),
    );
    expect(mocks.recordEvent).toHaveBeenCalledWith("user-1", "page.share.copy_link", {
      page_id: "page-1",
      scenario: "recruiter_reply",
      surface: "create_success",
    });
  });

  it("rejects arbitrary event names and metadata keys", async () => {
    const arbitraryEvent = await POST(
      buildRequest({ eventName: "admin.did_anything", metadata: { page_id: "page-1" } }),
    );
    const arbitraryMetadata = await POST(
      buildRequest({
        eventName: "page.share.copy_link",
        metadata: { page_id: "page-1", injected: true },
      }),
    );

    expect(arbitraryEvent.status).toBe(400);
    expect(arbitraryMetadata.status).toBe(400);
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });

  it("does not let one user write analytics for another user's page", async () => {
    mocks.pageMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const response = await POST(
      buildRequest({
        eventName: "page.share.download_card",
        metadata: { page_id: "someone-elses-page" },
      }),
    );

    expect(response.status).toBe(404);
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });

  it("fails closed when rate-limit persistence is unavailable", async () => {
    mocks.enforceRateLimit.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await POST(
      buildRequest({
        eventName: "page.share.open_live_page",
        metadata: { page_id: "page-1" },
      }),
    );

    expect(response.status).toBe(503);
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    mocks.authGetUser.mockResolvedValueOnce({ data: { user: null } });

    const response = await POST(
      buildRequest({
        eventName: "page.share.copy_link",
        metadata: { page_id: "page-1" },
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
  });
});
