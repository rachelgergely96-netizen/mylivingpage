import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal/legal-version";
import { processStripeWebhookEvent } from "@/lib/billing/stripeWebhook";

function buildEvent(
  type: Stripe.Event.Type,
  dataObject: Record<string, unknown>,
): Stripe.Event {
  return {
    id: `evt_${type.replace(/\./g, "_")}`,
    object: "event",
    api_version: "2026-02-25.clover",
    created: 1_762_562_400,
    data: {
      object: dataObject,
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
    type,
  } as unknown as Stripe.Event;
}

function createRepository(userId: string | null) {
  return {
    updateBillingStateByCustomerId: vi.fn().mockResolvedValue(undefined),
    findUserIdByCustomerId: vi.fn().mockResolvedValue(userId),
  };
}

describe("processStripeWebhookEvent", () => {
  beforeEach(() => {
    process.env.STRIPE_STARTER_MONTHLY_PRICE_ID = "price_starter_live";
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = "price_pro_live";
  });

  it("upgrades the profile, records legal acceptance, and tracks checkout completion", async () => {
    const repository = createRepository("user-123");
    const recordLegalAcceptance = vi.fn().mockResolvedValue(undefined);
    const trackEvent = vi.fn().mockResolvedValue(undefined);

    await processStripeWebhookEvent({
      event: buildEvent("checkout.session.completed", {
        id: "cs_test_123",
        object: "checkout.session",
        created: 1_762_562_400,
        customer: "cus_123",
        metadata: {
          supabase_user_id: "user-123",
          selected_plan: "starter",
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
        },
      }),
      repository,
      recordLegalAcceptance,
      trackEvent,
      processedAt: new Date("2026-03-10T12:00:02.000Z"),
    });

    expect(repository.updateBillingStateByCustomerId).toHaveBeenCalledWith("cus_123", {
      plan: "starter",
      stripeSubscriptionStatus: "trialing",
      stripeTrialEndsAt: "2025-12-08T00:40:00.000Z",
    });
    expect(recordLegalAcceptance).toHaveBeenCalledWith({
      userId: "user-123",
      source: "checkout",
      acceptedAt: "2025-11-08T00:40:00.000Z",
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    });
    expect(trackEvent).toHaveBeenNthCalledWith(
      1,
      "user-123",
      "billing.plan.upgraded",
      expect.objectContaining({
        plan: "starter",
        customer_id: "cus_123",
        event_type: "checkout.session.completed",
        subscription_status: "trialing",
        trial_ends_at: "2025-12-08T00:40:00.000Z",
      }),
    );
    expect(trackEvent).toHaveBeenNthCalledWith(
      2,
      "user-123",
      "billing.webhook.processed",
      expect.objectContaining({
        event_type: "checkout.session.completed",
        customer_id: "cus_123",
        plan: "starter",
        latency_ms: expect.any(Number),
      }),
    );
  });

  it("maps subscription updates to the selected paid plan from the Stripe price", async () => {
    const repository = createRepository("user-234");
    const recordLegalAcceptance = vi.fn().mockResolvedValue(undefined);
    const trackEvent = vi.fn().mockResolvedValue(undefined);

    await processStripeWebhookEvent({
      event: buildEvent("customer.subscription.updated", {
        id: "sub_234",
        object: "subscription",
        customer: "cus_234",
        status: "active",
        trial_end: null,
        items: {
          data: [
            {
              price: {
                id: "price_starter_live",
              },
            },
          ],
        },
      }),
      repository,
      recordLegalAcceptance,
      trackEvent,
      processedAt: new Date("2026-03-10T12:00:02.000Z"),
    });

    expect(repository.updateBillingStateByCustomerId).toHaveBeenCalledWith("cus_234", {
      plan: "starter",
      stripeSubscriptionStatus: "active",
      stripeTrialEndsAt: null,
    });
    expect(trackEvent).toHaveBeenNthCalledWith(
      1,
      "user-234",
      "billing.plan.upgraded",
      expect.objectContaining({
        plan: "starter",
        customer_id: "cus_234",
        event_type: "customer.subscription.updated",
        subscription_status: "active",
        price_id: "price_starter_live",
      }),
    );
  });

  it("downgrades deleted subscriptions back to spark", async () => {
    const repository = createRepository("user-456");
    const recordLegalAcceptance = vi.fn().mockResolvedValue(undefined);
    const trackEvent = vi.fn().mockResolvedValue(undefined);

    await processStripeWebhookEvent({
      event: buildEvent("customer.subscription.deleted", {
        id: "sub_123",
        object: "subscription",
        customer: "cus_456",
        status: "canceled",
        trial_end: null,
        items: {
          data: [
            {
              price: {
                id: "price_pro_live",
              },
            },
          ],
        },
      }),
      repository,
      recordLegalAcceptance,
      trackEvent,
      processedAt: new Date("2026-03-10T12:00:02.000Z"),
    });

    expect(repository.updateBillingStateByCustomerId).toHaveBeenCalledWith("cus_456", {
      plan: "spark",
      stripeSubscriptionStatus: "canceled",
      stripeTrialEndsAt: null,
    });
    expect(recordLegalAcceptance).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenNthCalledWith(
      1,
      "user-456",
      "billing.plan.downgraded",
      expect.objectContaining({
        plan: "spark",
        customer_id: "cus_456",
        event_type: "customer.subscription.deleted",
        subscription_status: "canceled",
      }),
    );
  });

  it("does not block plan upgrades when legal acceptance recording fails", async () => {
    const repository = createRepository("user-789");
    const recordLegalAcceptance = vi
      .fn()
      .mockRejectedValue(new Error("legal_acceptances missing"));
    const trackEvent = vi.fn().mockResolvedValue(undefined);

    await processStripeWebhookEvent({
      event: buildEvent("checkout.session.completed", {
        id: "cs_test_789",
        object: "checkout.session",
        created: 1_762_562_400,
        customer: "cus_789",
        metadata: {
          supabase_user_id: "user-789",
          selected_plan: "pro",
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
        },
      }),
      repository,
      recordLegalAcceptance,
      trackEvent,
      processedAt: new Date("2026-03-10T12:00:02.000Z"),
    });

    expect(repository.updateBillingStateByCustomerId).toHaveBeenCalledWith("cus_789", {
      plan: "pro",
      stripeSubscriptionStatus: "trialing",
      stripeTrialEndsAt: "2025-12-08T00:40:00.000Z",
    });
    expect(trackEvent).toHaveBeenNthCalledWith(
      1,
      "user-789",
      "billing.legal_acceptance.record_failed",
      expect.objectContaining({
        source: "checkout",
        error: "legal_acceptances missing",
      }),
    );
    expect(trackEvent).toHaveBeenNthCalledWith(
      2,
      "user-789",
      "billing.plan.upgraded",
      expect.objectContaining({
        plan: "pro",
        customer_id: "cus_789",
      }),
    );
  });

  it("tracks unsupported events as ignored without mutating plans", async () => {
    const repository = createRepository(null);
    const recordLegalAcceptance = vi.fn().mockResolvedValue(undefined);
    const trackEvent = vi.fn().mockResolvedValue(undefined);

    await processStripeWebhookEvent({
      event: buildEvent("invoice.created", {
        id: "in_123",
        object: "invoice",
      }),
      repository,
      recordLegalAcceptance,
      trackEvent,
      processedAt: new Date("2026-03-10T12:00:02.000Z"),
    });

    expect(repository.updateBillingStateByCustomerId).not.toHaveBeenCalled();
    expect(recordLegalAcceptance).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith(
      null,
      "billing.webhook.processed",
      expect.objectContaining({
        event_type: "invoice.created",
        ignored: true,
      }),
    );
  });
});
