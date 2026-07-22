import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertSignedWebhook: vi.fn(),
  processEvent: vi.fn(),
  createRepository: vi.fn(() => ({ repository: true })),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/security/route-security", () => ({ assertSignedWebhook: mocks.assertSignedWebhook }));
vi.mock("@/lib/billing/stripeWebhook", () => ({
  processStripeWebhookEvent: mocks.processEvent,
  createSupabaseBillingRepository: mocks.createRepository,
}));
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleSupabaseClient: () => ({}) }));
vi.mock("@/lib/track-event", () => ({ trackEvent: mocks.trackEvent }));
vi.mock("@/lib/legal/acceptance", () => ({ recordLegalAcceptance: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ webhooks: { constructEvent: vi.fn() } }) }));

import { POST } from "@/app/api/webhooks/stripe/route";

describe("POST /api/webhooks/stripe", () => {
  const request = () => new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" });
  const event = { id: "evt_1", type: "customer.subscription.updated", created: Math.floor(Date.now() / 1000) };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertSignedWebhook.mockResolvedValue({ value: { verified: event } });
    mocks.processEvent.mockResolvedValue(undefined);
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it("returns the signature failure response unchanged", async () => {
    mocks.assertSignedWebhook.mockResolvedValue({ response: Response.json({ error: "Missing signature" }, { status: 400 }) });
    const response = await POST(request() as never);
    expect(response.status).toBe(400);
    expect(mocks.processEvent).not.toHaveBeenCalled();
  });

  it("processes a verified event", async () => {
    const response = await POST(request() as never);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(mocks.processEvent).toHaveBeenCalledWith(expect.objectContaining({ event }));
  });

  it("returns a stable error when processing fails", async () => {
    mocks.processEvent.mockRejectedValue(new Error("database detail"));
    const response = await POST(request() as never);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Webhook processing failed." });
  });
});
