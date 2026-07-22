import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOrCreateCustomer: vi.fn(),
  createSession: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/stripe", () => ({
  getOrCreateStripeCustomer: mocks.getOrCreateCustomer,
  getStripe: () => ({ billingPortal: { sessions: { create: mocks.createSession } } }),
}));
vi.mock("@/lib/track-event", () => ({ trackEvent: mocks.trackEvent }));

import { POST } from "@/app/api/stripe/portal/route";

describe("POST /api/stripe/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "person@example.com" } } });
    mocks.getOrCreateCustomer.mockResolvedValue("cus_123");
    mocks.createSession.mockResolvedValue({ id: "bps_123", url: "https://billing.stripe.test/session" });
    mocks.trackEvent.mockResolvedValue(undefined);
    process.env.NEXT_PUBLIC_APP_URL = "https://www.mylivingpage.com";
  });

  it("requires authentication", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST()).status).toBe(401);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("creates a portal session with a safe return URL", async () => {
    const response = await POST();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: "https://billing.stripe.test/session" });
    expect(mocks.createSession).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "https://www.mylivingpage.com/dashboard/settings",
    });
  });

  it("does not expose provider errors", async () => {
    mocks.createSession.mockRejectedValue(new Error("secret Stripe detail"));
    const response = await POST();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Unable to create billing portal session." });
  });
});
