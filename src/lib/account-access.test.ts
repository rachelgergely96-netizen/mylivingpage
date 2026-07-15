import { describe, expect, it } from "vitest";
import {
  FREE_PARSE_TOTAL_LIMIT,
  LEGACY_BILLING_COHORT,
  PAID_PARSE_RATE_LIMIT,
  PAID_PARSE_RATE_LIMIT_WINDOW_MS,
  PUBLISH_CC_TRIAL_BILLING_COHORT,
  TRIAL_HOSTING_BILLING_COHORT,
  getAccountAccessState,
} from "@/lib/account-access";

describe("getAccountAccessState", () => {
  it("grants universal free product access to legacy free accounts", () => {
    expect(
      getAccountAccessState({
        plan: "spark",
        billing_cohort: LEGACY_BILLING_COHORT,
      }),
    ).toMatchObject({
      publicPlanLabel: "Free",
      isLegacyAccount: true,
      analyticsTier: "full",
      shareCardAllowed: true,
      variantLimit: 3,
      themeFeaturesUnlocked: true,
      publicHostingAllowed: true,
      requiresSubscription: false,
      hasPaidSubscription: false,
    });
  });

  it("keeps legacy paid accounts fully unlocked", () => {
    expect(
      getAccountAccessState({
        plan: "pro",
        billing_cohort: LEGACY_BILLING_COHORT,
      }),
    ).toMatchObject({
      publicPlanLabel: "Pro",
      isLegacyAccount: true,
      analyticsTier: "full",
      shareCardAllowed: true,
      variantLimit: 3,
      themeFeaturesUnlocked: true,
      publicHostingAllowed: true,
      requiresSubscription: false,
      hasPaidSubscription: true,
    });
  });

  it("keeps trial-hosting users fully unlocked before the first publish", () => {
    expect(
      getAccountAccessState({
        plan: "spark",
        billing_cohort: TRIAL_HOSTING_BILLING_COHORT,
      }),
    ).toMatchObject({
      isLegacyAccount: false,
      billingCohort: TRIAL_HOSTING_BILLING_COHORT,
      analyticsTier: "full",
      shareCardAllowed: true,
      variantLimit: 3,
      themeFeaturesUnlocked: true,
      publicHostingAllowed: true,
      hasStartedFreeMonth: false,
      requiresSubscription: false,
      requiresCheckoutToPublish: false,
    });
  });

  it("keeps public hosting active during the legacy trial-hosting free month", () => {
    const access = getAccountAccessState({
      plan: "spark",
      billing_cohort: TRIAL_HOSTING_BILLING_COHORT,
      hosting_trial_started_at: "2026-03-01T00:00:00.000Z",
      now: "2026-03-20T00:00:00.000Z",
    });

    expect(access).toMatchObject({
      publicHostingAllowed: true,
      hasStartedFreeMonth: true,
      isActiveFreeMonth: true,
      isExpiredFreeMonth: false,
      requiresSubscription: false,
    });
    expect(access.trialEndsAt).toBe("2026-03-31T00:00:00.000Z");
  });

  it("keeps hosting free after the historical trial-hosting month expires", () => {
    expect(
      getAccountAccessState({
        plan: "spark",
        billing_cohort: TRIAL_HOSTING_BILLING_COHORT,
        hosting_trial_started_at: "2026-01-01T00:00:00.000Z",
        now: "2026-03-20T00:00:00.000Z",
      }),
    ).toMatchObject({
      publicHostingAllowed: true,
      hasStartedFreeMonth: true,
      isActiveFreeMonth: false,
      isExpiredFreeMonth: true,
      requiresSubscription: false,
      requiresCheckoutToPublish: false,
      shareCardAllowed: true,
      hasPaidSubscription: false,
    });
  });

  it("lets new publish-cc users publish and share without adding a card", () => {
    expect(
      getAccountAccessState({
        plan: "spark",
        billing_cohort: PUBLISH_CC_TRIAL_BILLING_COHORT,
      }),
    ).toMatchObject({
      publicPlanLabel: "Free",
      billingCohort: PUBLISH_CC_TRIAL_BILLING_COHORT,
      analyticsTier: "full",
      shareCardAllowed: true,
      variantLimit: 3,
      publicHostingAllowed: true,
      requiresCheckoutToPublish: false,
      requiresSubscription: false,
      hasPaidSubscription: false,
      parseQuota: {
        scope: "total",
        limit: FREE_PARSE_TOTAL_LIMIT,
        windowMs: null,
      },
    });
  });

  it("grants starter entitlements for publish-cc users with an active starter subscription", () => {
    expect(
      getAccountAccessState({
        plan: "starter",
        billing_cohort: PUBLISH_CC_TRIAL_BILLING_COHORT,
        stripe_subscription_status: "active",
      }),
    ).toMatchObject({
      publicPlanLabel: "Starter",
      analyticsTier: "full",
      shareCardAllowed: true,
      variantLimit: 3,
      publicHostingAllowed: true,
      requiresCheckoutToPublish: false,
      hasPaidSubscription: true,
      isTrialingSubscription: false,
      parseQuota: {
        scope: "rolling_window",
        limit: PAID_PARSE_RATE_LIMIT,
        windowMs: PAID_PARSE_RATE_LIMIT_WINDOW_MS,
      },
    });
  });

  it("grants pro entitlements and exposes the Stripe trial end when trialing", () => {
    const access = getAccountAccessState({
      plan: "pro",
      billing_cohort: PUBLISH_CC_TRIAL_BILLING_COHORT,
      stripe_subscription_status: "trialing",
      stripe_trial_ends_at: "2026-04-24T00:00:00.000Z",
    });

    expect(access).toMatchObject({
      publicPlanLabel: "Pro",
      analyticsTier: "full",
      shareCardAllowed: true,
      variantLimit: 3,
      publicHostingAllowed: true,
      requiresCheckoutToPublish: false,
      hasPaidSubscription: true,
      isTrialingSubscription: true,
      trialEndsAt: "2026-04-24T00:00:00.000Z",
    });
  });
});
