import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createSession: vi.fn(),
  getOrCreateStripeCustomer: vi.fn(),
  trackEvent: vi.fn(),
  fetchProfileWithHostingAccess: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  })),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    checkout: {
      sessions: {
        create: mocks.createSession,
      },
    },
  })),
  getOrCreateStripeCustomer: mocks.getOrCreateStripeCustomer,
}));

vi.mock("@/lib/profile-access", () => ({
  fetchProfileWithHostingAccess: mocks.fetchProfileWithHostingAccess,
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: mocks.trackEvent,
}));

import { POST } from "@/app/api/stripe/checkout/route";

describe("POST /api/stripe/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.STRIPE_STARTER_MONTHLY_PRICE_ID = "price_starter_live";
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = "price_pro_live";

    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "rachel@example.com",
        },
      },
    });
    mocks.getOrCreateStripeCustomer.mockResolvedValue("cus_123");
    mocks.createSession.mockResolvedValue({
      id: "cs_123",
      url: "https://checkout.stripe.test/session",
    });
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it("rejects requests without a valid plan", async () => {
    const response = await POST(
      new Request("http://localhost/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: "publish" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "A valid plan is required.",
      code: "plan_required",
    });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("creates a 30-day trial checkout session for new publish-preview users", async () => {
    mocks.fetchProfileWithHostingAccess.mockResolvedValue({
      data: {
        plan: "spark",
        billing_cohort: "publish_cc_trial_v1",
        hosting_trial_started_at: null,
        stripe_subscription_status: null,
        stripe_trial_ends_at: null,
      },
      error: null,
      schema: "full",
    });

    const response = await POST(
      new Request("http://localhost/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: "starter",
          source: "publish",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_starter_live", quantity: 1 }],
        success_url:
          "http://localhost:3000/create?checkout=success&source=publish&plan=starter",
        metadata: expect.objectContaining({
          selected_plan: "starter",
          checkout_source: "publish",
        }),
        subscription_data: expect.objectContaining({
          trial_period_days: 30,
          metadata: expect.objectContaining({
            selected_plan: "starter",
            checkout_source: "publish",
          }),
        }),
      }),
    );
  });

  it("does not start a new Stripe trial for legacy or already-paid cohorts", async () => {
    mocks.fetchProfileWithHostingAccess.mockResolvedValue({
      data: {
        plan: "starter",
        billing_cohort: "publish_cc_trial_v1",
        hosting_trial_started_at: null,
        stripe_subscription_status: "active",
        stripe_trial_ends_at: null,
      },
      error: null,
      schema: "full",
    });

    const response = await POST(
      new Request("http://localhost/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: "pro",
          source: "settings",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const createArgs = mocks.createSession.mock.calls[0]?.[0];
    expect(createArgs.line_items).toEqual([{ price: "price_pro_live", quantity: 1 }]);
    expect(createArgs.subscription_data).not.toHaveProperty("trial_period_days");
  });
});
