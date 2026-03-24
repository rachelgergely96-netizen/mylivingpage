import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import {
  getExpectedHostingPlanStripeSnapshot,
  getStripePriceDriftMessages,
  type StripePriceSnapshot,
} from "@/lib/billing";

const canRunLiveStripePriceCheck =
  process.env.RUN_LIVE_STRIPE_CONFIG_TESTS === "1" &&
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);

const maybeIt = canRunLiveStripePriceCheck ? it : it.skip;

describe("live Stripe pricing configuration", () => {
  maybeIt("matches the managed app pricing contract", async () => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });

    const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!, {
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
        getExpectedHostingPlanStripeSnapshot(process.env.STRIPE_PRICE_ID!),
      ),
    ).toEqual([]);
  });
});
