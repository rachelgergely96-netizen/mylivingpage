import { describe, expect, it } from "vitest";
import {
  LEGACY_BILLING_COHORT,
  TRIAL_HOSTING_BILLING_COHORT,
  getAccountAccessState,
} from "@/lib/account-access";

describe("getAccountAccessState", () => {
  it("keeps legacy free accounts on the old restricted feature model", () => {
    expect(
      getAccountAccessState({
        plan: "spark",
        billing_cohort: LEGACY_BILLING_COHORT,
      }),
    ).toMatchObject({
      isLegacyAccount: true,
      featuresUnlocked: false,
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
      isLegacyAccount: true,
      featuresUnlocked: true,
      publicHostingAllowed: true,
      requiresSubscription: false,
      hasPaidSubscription: true,
    });
  });

  it("unlocks all features for new-cohort users before the first publish", () => {
    expect(
      getAccountAccessState({
        plan: "spark",
        billing_cohort: TRIAL_HOSTING_BILLING_COHORT,
      }),
    ).toMatchObject({
      isLegacyAccount: false,
      featuresUnlocked: true,
      publicHostingAllowed: true,
      hasStartedFreeMonth: false,
      requiresSubscription: false,
    });
  });

  it("keeps public hosting active during the first free month", () => {
    const access = getAccountAccessState({
      plan: "spark",
      billing_cohort: TRIAL_HOSTING_BILLING_COHORT,
      hosting_trial_started_at: "2026-03-01T00:00:00.000Z",
      now: "2026-03-20T00:00:00.000Z",
    });

    expect(access).toMatchObject({
      isLegacyAccount: false,
      featuresUnlocked: true,
      publicHostingAllowed: true,
      hasStartedFreeMonth: true,
      isActiveFreeMonth: true,
      isExpiredFreeMonth: false,
      requiresSubscription: false,
    });
    expect(access.trialEndsAt).toBe("2026-03-31T00:00:00.000Z");
  });

  it("requires a subscription after the free month expires", () => {
    expect(
      getAccountAccessState({
        plan: "spark",
        billing_cohort: TRIAL_HOSTING_BILLING_COHORT,
        hosting_trial_started_at: "2026-01-01T00:00:00.000Z",
        now: "2026-03-20T00:00:00.000Z",
      }),
    ).toMatchObject({
      isLegacyAccount: false,
      featuresUnlocked: true,
      publicHostingAllowed: false,
      hasStartedFreeMonth: true,
      isActiveFreeMonth: false,
      isExpiredFreeMonth: true,
      requiresSubscription: true,
      hasPaidSubscription: false,
    });
  });

  it("keeps hosting active for new-cohort paid subscribers even after the free month window", () => {
    expect(
      getAccountAccessState({
        plan: "pro",
        billing_cohort: TRIAL_HOSTING_BILLING_COHORT,
        hosting_trial_started_at: "2026-01-01T00:00:00.000Z",
        now: "2026-03-20T00:00:00.000Z",
      }),
    ).toMatchObject({
      isLegacyAccount: false,
      featuresUnlocked: true,
      publicHostingAllowed: true,
      requiresSubscription: false,
      hasPaidSubscription: true,
    });
  });
});
