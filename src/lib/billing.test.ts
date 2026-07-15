import { describe, expect, it } from "vitest";
import {
  PRO_PLAN_PRICE,
  STARTER_PLAN_PRICE,
  getExpectedHostingPlanStripeSnapshot,
  getStoredPlanForSubscriptionStatus,
  getStripePriceDriftMessages,
} from "@/lib/billing";

describe("billing helpers", () => {
  it("maps active subscription states to the managed plan model", () => {
    expect(getStoredPlanForSubscriptionStatus("active")).toBe("pro");
    expect(getStoredPlanForSubscriptionStatus("trialing")).toBe("pro");
    expect(getStoredPlanForSubscriptionStatus("active", "starter")).toBe("starter");
    expect(getStoredPlanForSubscriptionStatus("past_due")).toBe("spark");
    expect(getStoredPlanForSubscriptionStatus(null)).toBe("spark");
  });

  it("builds the expected Stripe snapshot from the starter price config", () => {
    expect(getExpectedHostingPlanStripeSnapshot("price_live_123")).toEqual({
      id: "price_live_123",
      active: true,
      amountCents: PRO_PLAN_PRICE.amountCents,
      currency: PRO_PLAN_PRICE.currency,
      interval: PRO_PLAN_PRICE.interval,
      intervalCount: PRO_PLAN_PRICE.intervalCount,
      productName: PRO_PLAN_PRICE.productName,
    });

    expect(getExpectedHostingPlanStripeSnapshot("price_starter_123", "starter")).toEqual({
      id: "price_starter_123",
      active: true,
      amountCents: STARTER_PLAN_PRICE.amountCents,
      currency: STARTER_PLAN_PRICE.currency,
      interval: STARTER_PLAN_PRICE.interval,
      intervalCount: STARTER_PLAN_PRICE.intervalCount,
      productName: STARTER_PLAN_PRICE.productName,
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
      getExpectedHostingPlanStripeSnapshot("price_live_expected"),
    );

    expect(messages).toEqual([
      "Expected price id price_live_expected, received price_live_wrong.",
      "Expected active=true, received false.",
      "Expected amount 999 cents, received 1200.",
      "Expected currency usd, received eur.",
      "Expected interval month, received year.",
      "Expected interval_count 1, received 12.",
      'Expected product name "MyLivingPage Pro", received "Unexpected Plan".',
    ]);
  });
});
