import type { PaidPlan, StoredPlan } from "@/lib/plans";

export type ManagedPlan = StoredPlan;
export type BillingPlan = PaidPlan;
export type BillingInterval = "month";

export interface PlanPriceConfig {
  plan: BillingPlan;
  amountCents: number;
  currency: "usd";
  interval: BillingInterval;
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

export const PUBLISH_TRIAL_DAYS = 30;

export const STARTER_PLAN_PRICE: PlanPriceConfig = {
  plan: "starter",
  amountCents: 499,
  currency: "usd",
  interval: "month",
  intervalCount: 1,
  amountLabel: "$4.99",
  intervalLabel: "/month",
  displayLabel: "$4.99/month",
  productName: "MyLivingPage Starter",
  productDescription:
    "$4.99/month subscription for one live MyLivingPage with starter analytics, starter themes, and one targeted version.",
};

export const PRO_PLAN_PRICE: PlanPriceConfig = {
  plan: "pro",
  amountCents: 999,
  currency: "usd",
  interval: "month",
  intervalCount: 1,
  amountLabel: "$9.99",
  intervalLabel: "/month",
  displayLabel: "$9.99/month",
  productName: "MyLivingPage Pro",
  productDescription:
    "$9.99/month subscription for full MyLivingPage hosting, full analytics, all themes, and three targeted versions.",
};
export const HOSTING_PLAN_PRICE = PRO_PLAN_PRICE;

export const PLAN_PRICE_CONFIG: Record<BillingPlan, PlanPriceConfig> = {
  starter: STARTER_PLAN_PRICE,
  pro: PRO_PLAN_PRICE,
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

function getPriceEnvVar(plan: BillingPlan) {
  return plan === "starter"
    ? "STRIPE_STARTER_MONTHLY_PRICE_ID"
    : "STRIPE_PRO_MONTHLY_PRICE_ID";
}

export function getPlanPriceConfig(plan: BillingPlan): PlanPriceConfig {
  return PLAN_PRICE_CONFIG[plan];
}

export function getConfiguredPriceIdForPlan(plan: BillingPlan): string | null {
  return process.env[getPriceEnvVar(plan)] ?? null;
}

export function getConfiguredPlanPriceIds() {
  return (Object.keys(PLAN_PRICE_CONFIG) as BillingPlan[]).map((plan) => ({
    plan,
    priceId: getConfiguredPriceIdForPlan(plan),
  }));
}

export function getPlanFromPriceId(priceId: string | null | undefined): BillingPlan | null {
  if (!priceId) {
    return null;
  }

  return (Object.keys(PLAN_PRICE_CONFIG) as BillingPlan[]).find(
    (plan) => getConfiguredPriceIdForPlan(plan) === priceId,
  ) ?? null;
}

export function getStoredPlanForSubscriptionStatus(
  status: string | null | undefined,
  activePlan: BillingPlan = "pro",
): ManagedPlan {
  return status && ACTIVE_SUBSCRIPTION_STATUSES.has(status) ? activePlan : "spark";
}
export const getManagedPlanForSubscriptionStatus = getStoredPlanForSubscriptionStatus;

export function getExpectedHostingPlanStripeSnapshot(
  priceId: string | null | undefined,
  plan: BillingPlan = "pro",
): StripePriceSnapshot {
  const config = getPlanPriceConfig(plan);
  return {
    id: priceId ?? null,
    active: true,
    amountCents: config.amountCents,
    currency: config.currency,
    interval: config.interval,
    intervalCount: config.intervalCount,
    productName: config.productName,
  };
}
export const getExpectedProPlanStripeSnapshot = getExpectedHostingPlanStripeSnapshot;

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
