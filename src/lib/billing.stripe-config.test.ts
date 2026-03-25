import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import {
  getExpectedHostingPlanStripeSnapshot,
  getStripePriceDriftMessages,
  type BillingPlan,
  type StripePriceSnapshot,
} from "@/lib/billing";

const LIVE_PRICE_CONFIGS: Array<{ plan: BillingPlan; priceId: string | undefined }> = [
  { plan: "starter", priceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID },
  { plan: "pro", priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID },
];

const canRunLiveStripePriceCheck =
  process.env.RUN_LIVE_STRIPE_CONFIG_TESTS === "1" &&
  Boolean(process.env.STRIPE_SECRET_KEY) &&
  LIVE_PRICE_CONFIGS.every((config) => Boolean(config.priceId));

const maybeIt = canRunLiveStripePriceCheck ? it : it.skip;

describe("live Stripe pricing configuration", () => {
  maybeIt("matches the managed app pricing contract for all configured plans", async () => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });

    for (const config of LIVE_PRICE_CONFIGS) {
      const price = await stripe.prices.retrieve(config.priceId!, {
        expand: ["product"],
      });

      const actual: StripePriceSnapshot = {
        id: price.id,
        active: price.active,
        amountCents: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval ?? null,
        intervalCount: price.recurring?.interval_count ?? null,
        productName:
          typeof price.product === "string" || "deleted" in price.product
            ? null
            : price.product.name ?? null,
      };

      expect(
        getStripePriceDriftMessages(
          actual,
          getExpectedHostingPlanStripeSnapshot(config.priceId!, config.plan),
        ),
      ).toEqual([]);
    }
  });
});
