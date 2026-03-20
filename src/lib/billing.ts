export type ManagedPlan = "spark" | "pro";

export interface PlanPriceConfig {
  amountCents: number;
  currency: "usd";
  interval: "month";
  intervalCount: 1;
  amountLabel: string;
  intervalLabel: string;
  displayLabel: string;
  productName: string;
  productDescription: string;
}

export interface StripePriceSnapshot {
  id: string | null;
  active: boolean;
  amountCents: number | null;
  currency: string | null;
  interval: string | null;
  intervalCount: number | null;
  productName: string | null;
}

export const PRO_PLAN_PRICE: PlanPriceConfig = {
  amountCents: 999,
  currency: "usd",
  interval: "month",
  intervalCount: 1,
  amountLabel: "$9.99",
  intervalLabel: "/month",
  displayLabel: "$9.99/month",
  productName: "MyLivingPage Hosting",
  productDescription:
    "$9.99/month subscription to continue hosting your live MyLivingPage after the first free month.",
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export function getManagedPlanForSubscriptionStatus(
  status: string | null | undefined,
): ManagedPlan {
  return status && ACTIVE_SUBSCRIPTION_STATUSES.has(status) ? "pro" : "spark";
}

export function getExpectedProPlanStripeSnapshot(
  priceId: string | null | undefined,
): StripePriceSnapshot {
  return {
    id: priceId ?? null,
    active: true,
    amountCents: PRO_PLAN_PRICE.amountCents,
    currency: PRO_PLAN_PRICE.currency,
    interval: PRO_PLAN_PRICE.interval,
    intervalCount: PRO_PLAN_PRICE.intervalCount,
    productName: PRO_PLAN_PRICE.productName,
  };
}

export function getStripePriceDriftMessages(
  actual: StripePriceSnapshot,
  expected: StripePriceSnapshot,
): string[] {
  const messages: string[] = [];

  if (expected.id && actual.id !== expected.id) {
    messages.push(`Expected price id ${expected.id}, received ${actual.id ?? "missing"}.`);
  }

  if (actual.active !== expected.active) {
    messages.push(`Expected active=${expected.active}, received ${actual.active}.`);
  }

  if (actual.amountCents !== expected.amountCents) {
    messages.push(
      `Expected amount ${expected.amountCents ?? "missing"} cents, received ${actual.amountCents ?? "missing"}.`,
    );
  }

  if (actual.currency !== expected.currency) {
    messages.push(`Expected currency ${expected.currency}, received ${actual.currency ?? "missing"}.`);
  }

  if (actual.interval !== expected.interval) {
    messages.push(`Expected interval ${expected.interval}, received ${actual.interval ?? "missing"}.`);
  }

  if (actual.intervalCount !== expected.intervalCount) {
    messages.push(
      `Expected interval_count ${expected.intervalCount}, received ${actual.intervalCount ?? "missing"}.`,
    );
  }

  if (actual.productName !== expected.productName) {
    messages.push(
      `Expected product name "${expected.productName ?? "missing"}", received "${actual.productName ?? "missing"}".`,
    );
  }

  return messages;
}
