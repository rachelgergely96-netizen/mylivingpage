import { describe, expect, it } from "vitest";
import {
  PRO_PLAN_PRICE,
  getExpectedProPlanStripeSnapshot,
  getManagedPlanForSubscriptionStatus,
  getStripePriceDriftMessages,
} from "@/lib/billing";
import { PRICING_REASSURANCE } from "@/lib/marketing-samples";

describe("billing helpers", () => {
  it("maps active subscription states to the managed plan model", () => {
    expect(getManagedPlanForSubscriptionStatus("active")).toBe("pro");
    expect(getManagedPlanForSubscriptionStatus("trialing")).toBe("pro");
    expect(getManagedPlanForSubscriptionStatus("past_due")).toBe("spark");
    expect(getManagedPlanForSubscriptionStatus(null)).toBe("spark");
  });

  it("builds the expected Stripe snapshot from the managed price config", () => {
    expect(getExpectedProPlanStripeSnapshot("price_live_123")).toEqual({
      id: "price_live_123",
      active: true,
      amountCents: PRO_PLAN_PRICE.amountCents,
      currency: PRO_PLAN_PRICE.currency,
      interval: PRO_PLAN_PRICE.interval,
      intervalCount: PRO_PLAN_PRICE.intervalCount,
      productName: PRO_PLAN_PRICE.productName,
    });
  });

  it("reports drift when Stripe no longer matches the app pricing contract", () => {
    const messages = getStripePriceDriftMessages(
      {
        id: "price_live_wrong",
        active: false,
        amountCents: 1200,
        currency: "eur",
        interval: "year",
        intervalCount: 12,
        productName: "Unexpected Plan",
      },
      getExpectedProPlanStripeSnapshot("price_live_expected"),
    );

    expect(messages).toEqual([
      "Expected price id price_live_expected, received price_live_wrong.",
      "Expected active=true, received false.",
      "Expected amount 900 cents, received 1200.",
      "Expected currency usd, received eur.",
      "Expected interval month, received year.",
      "Expected interval_count 1, received 12.",
      'Expected product name "MyLivingPage Pro", received "Unexpected Plan".',
    ]);
  });

  it("keeps the user-facing reassurance copy aligned with the managed price config", () => {
    expect(PRICING_REASSURANCE.pro).toContain(
      `Upgrade anytime for ${PRO_PLAN_PRICE.displayLabel}`,
    );
  });
});
