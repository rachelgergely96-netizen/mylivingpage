import { describe, expect, it, vi } from "vitest";
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

describe("processStripeWebhookEvent", () => {
  it("upgrades the profile, records legal acceptance, and tracks checkout completion", async () => {
    const repository = {
      updatePlanByCustomerId: vi.fn().mockResolvedValue(undefined),
      findUserIdByCustomerId: vi.fn().mockResolvedValue("user-123"),
    };
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
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
        },
      }),
      repository,
      recordLegalAcceptance,
      trackEvent,
      processedAt: new Date("2026-03-10T12:00:02.000Z"),
    });

    expect(repository.updatePlanByCustomerId).toHaveBeenCalledWith("cus_123", "pro");
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
        plan: "pro",
        customer_id: "cus_123",
        event_type: "checkout.session.completed",
      }),
    );
    expect(trackEvent).toHaveBeenNthCalledWith(
      2,
      "user-123",
      "billing.webhook.processed",
      expect.objectContaining({
        event_type: "checkout.session.completed",
        customer_id: "cus_123",
        plan: "pro",
        latency_ms: expect.any(Number),
      }),
    );
  });

  it("downgrades deleted subscriptions back to spark", async () => {
    const repository = {
      updatePlanByCustomerId: vi.fn().mockResolvedValue(undefined),
      findUserIdByCustomerId: vi.fn().mockResolvedValue("user-456"),
    };
    const recordLegalAcceptance = vi.fn().mockResolvedValue(undefined);
    const trackEvent = vi.fn().mockResolvedValue(undefined);

    await processStripeWebhookEvent({
      event: buildEvent("customer.subscription.deleted", {
        id: "sub_123",
        object: "subscription",
        customer: "cus_456",
        status: "canceled",
      }),
      repository,
      recordLegalAcceptance,
      trackEvent,
      processedAt: new Date("2026-03-10T12:00:02.000Z"),
    });

    expect(repository.updatePlanByCustomerId).toHaveBeenCalledWith("cus_456", "spark");
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
    expect(trackEvent).toHaveBeenNthCalledWith(
      2,
      "user-456",
      "billing.webhook.processed",
      expect.objectContaining({
        plan: "spark",
        customer_id: "cus_456",
        event_type: "customer.subscription.deleted",
        subscription_status: "canceled",
      }),
    );
  });

  it("tracks unsupported events as ignored without mutating plans", async () => {
    const repository = {
      updatePlanByCustomerId: vi.fn().mockResolvedValue(undefined),
      findUserIdByCustomerId: vi.fn().mockResolvedValue(null),
    };
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

    expect(repository.updatePlanByCustomerId).not.toHaveBeenCalled();
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
