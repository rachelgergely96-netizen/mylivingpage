import type { ThemeId } from "@/themes/types";
import {
  FREE_PREVIEW_THEMES,
  STARTER_THEMES,
  getPublicPlanLabel,
  hasHostingSubscription,
  isProPlan,
} from "@/lib/plans";

export const LEGACY_BILLING_COHORT = "legacy_freemium";
export const TRIAL_HOSTING_BILLING_COHORT = "trial_hosting_v1";
export const PUBLISH_CC_TRIAL_BILLING_COHORT = "publish_cc_trial_v1";
export const FREE_HOSTING_TRIAL_DAYS = 30;
export const FREE_PARSE_TOTAL_LIMIT = 2;
export const PAID_PARSE_RATE_LIMIT = 5;
export const PAID_PARSE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export type BillingCohort =
  | typeof LEGACY_BILLING_COHORT
  | typeof TRIAL_HOSTING_BILLING_COHORT
  | typeof PUBLISH_CC_TRIAL_BILLING_COHORT;

export type AnalyticsTier = "none" | "basic" | "full";
export type ParseQuotaScope = "total" | "rolling_window";

export interface AccountAccessInput {
  plan?: string | null;
  billing_cohort?: string | null;
  hosting_trial_started_at?: string | null;
  stripe_subscription_status?: string | null;
  stripe_trial_ends_at?: string | null;
  now?: Date | string | number;
}

export interface AccountAccessState {
  publicPlanLabel: "Free" | "Starter" | "Pro";
  allowedThemeIds: ThemeId[] | null;
  analyticsTier: AnalyticsTier;
  shareCardAllowed: boolean;
  variantLimit: 0 | 1 | 3;
  parseQuota: {
    scope: ParseQuotaScope;
    limit: number;
    windowMs: number | null;
  };
  themeFeaturesUnlocked: boolean;
  analyticsAccessAllowed: boolean;
  billingCohort: BillingCohort;
  featuresUnlocked: boolean;
  publicHostingAllowed: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  requiresSubscription: boolean;
  isLegacyAccount: boolean;
  hasPaidSubscription: boolean;
  hasStartedFreeMonth: boolean;
  isActiveFreeMonth: boolean;
  isExpiredFreeMonth: boolean;
  requiresCheckoutToPublish: boolean;
  isTrialingSubscription: boolean;
  stripeSubscriptionStatus: string | null;
}

function grantUniversalFreeAccess(
  state: AccountAccessState,
): AccountAccessState {
  return {
    ...state,
    allowedThemeIds: null,
    analyticsTier: "full",
    shareCardAllowed: true,
    variantLimit: 3,
    themeFeaturesUnlocked: true,
    analyticsAccessAllowed: true,
    featuresUnlocked: true,
    publicHostingAllowed: true,
    requiresSubscription: false,
    requiresCheckoutToPublish: false,
  };
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const next = value instanceof Date ? value : new Date(value);
  return Number.isNaN(next.getTime()) ? null : next;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function resolveBillingCohort(
  raw: string | null | undefined,
): BillingCohort {
  if (raw === PUBLISH_CC_TRIAL_BILLING_COHORT) {
    return PUBLISH_CC_TRIAL_BILLING_COHORT;
  }

  return raw === TRIAL_HOSTING_BILLING_COHORT
    ? TRIAL_HOSTING_BILLING_COHORT
    : LEGACY_BILLING_COHORT;
}

export function getAccountAccessState(
  input: AccountAccessInput,
): AccountAccessState {
  const billingCohort = resolveBillingCohort(input.billing_cohort);
  const now = toDate(input.now) ?? new Date();
  const trialStartedAtDate = toDate(input.hosting_trial_started_at);
  const trialEndsAtDate = trialStartedAtDate
    ? addDays(trialStartedAtDate, FREE_HOSTING_TRIAL_DAYS)
    : null;
  const hasPaidSubscription = hasHostingSubscription(input.plan);
  const publicPlanLabel = getPublicPlanLabel(input.plan);
  const stripeTrialEndsAtDate = toDate(input.stripe_trial_ends_at);
  const stripeSubscriptionStatus = input.stripe_subscription_status ?? null;
  const isTrialingSubscription = stripeSubscriptionStatus === "trialing";

  if (billingCohort === LEGACY_BILLING_COHORT) {
    const allowedThemeIds = hasPaidSubscription ? null : STARTER_THEMES;
    const themeFeaturesUnlocked = allowedThemeIds === null;

    return grantUniversalFreeAccess({
      publicPlanLabel,
      allowedThemeIds,
      analyticsTier: "full",
      shareCardAllowed: true,
      variantLimit: 3,
      parseQuota: {
        scope: "rolling_window",
        limit: PAID_PARSE_RATE_LIMIT,
        windowMs: PAID_PARSE_RATE_LIMIT_WINDOW_MS,
      },
      themeFeaturesUnlocked,
      analyticsAccessAllowed: true,
      billingCohort,
      featuresUnlocked: themeFeaturesUnlocked,
      publicHostingAllowed: true,
      trialStartedAt: null,
      trialEndsAt: null,
      requiresSubscription: false,
      isLegacyAccount: true,
      hasPaidSubscription,
      hasStartedFreeMonth: false,
      isActiveFreeMonth: false,
      isExpiredFreeMonth: false,
      requiresCheckoutToPublish: false,
      isTrialingSubscription: false,
      stripeSubscriptionStatus,
    });
  }

  if (billingCohort === PUBLISH_CC_TRIAL_BILLING_COHORT) {
    const isPro = isProPlan(input.plan);
    const allowedThemeIds = isPro
      ? null
      : hasPaidSubscription
        ? STARTER_THEMES
        : FREE_PREVIEW_THEMES;
    const analyticsTier: AnalyticsTier = isPro
      ? "full"
      : hasPaidSubscription
        ? "basic"
        : "none";
    const variantLimit: 0 | 1 | 3 = isPro ? 3 : hasPaidSubscription ? 1 : 0;
    const shareCardAllowed = hasPaidSubscription;
    const publicHostingAllowed = hasPaidSubscription;

    return grantUniversalFreeAccess({
      publicPlanLabel,
      allowedThemeIds,
      analyticsTier,
      shareCardAllowed,
      variantLimit,
      parseQuota: hasPaidSubscription
        ? {
            scope: "rolling_window",
            limit: PAID_PARSE_RATE_LIMIT,
            windowMs: PAID_PARSE_RATE_LIMIT_WINDOW_MS,
          }
        : {
            scope: "total",
            limit: FREE_PARSE_TOTAL_LIMIT,
            windowMs: null,
          },
      themeFeaturesUnlocked: allowedThemeIds === null,
      analyticsAccessAllowed: analyticsTier === "full",
      billingCohort,
      featuresUnlocked: hasPaidSubscription,
      publicHostingAllowed,
      trialStartedAt: null,
      trialEndsAt: stripeTrialEndsAtDate?.toISOString() ?? null,
      requiresSubscription: false,
      isLegacyAccount: false,
      hasPaidSubscription,
      hasStartedFreeMonth: false,
      isActiveFreeMonth: isTrialingSubscription,
      isExpiredFreeMonth: false,
      requiresCheckoutToPublish: !hasPaidSubscription,
      isTrialingSubscription,
      stripeSubscriptionStatus,
    });
  }

  const hasStartedFreeMonth = Boolean(trialStartedAtDate);
  const isActiveFreeMonth = Boolean(
    !hasPaidSubscription &&
      trialStartedAtDate &&
      trialEndsAtDate &&
      trialEndsAtDate.getTime() > now.getTime(),
  );
  const isExpiredFreeMonth = Boolean(
    !hasPaidSubscription &&
      trialStartedAtDate &&
      trialEndsAtDate &&
      trialEndsAtDate.getTime() <= now.getTime(),
  );
  const publicHostingAllowed =
    hasPaidSubscription || !hasStartedFreeMonth || isActiveFreeMonth;
  const themeFeaturesUnlocked = true;

  return grantUniversalFreeAccess({
    publicPlanLabel,
    allowedThemeIds: null,
    analyticsTier: "full",
    shareCardAllowed: true,
    variantLimit: 3,
    parseQuota: {
      scope: "rolling_window",
      limit: PAID_PARSE_RATE_LIMIT,
      windowMs: PAID_PARSE_RATE_LIMIT_WINDOW_MS,
    },
    themeFeaturesUnlocked,
    analyticsAccessAllowed: true,
    billingCohort,
    featuresUnlocked: themeFeaturesUnlocked,
    publicHostingAllowed,
    trialStartedAt: trialStartedAtDate?.toISOString() ?? null,
    trialEndsAt: trialEndsAtDate?.toISOString() ?? null,
    requiresSubscription: isExpiredFreeMonth,
    isLegacyAccount: false,
    hasPaidSubscription,
    hasStartedFreeMonth,
    isActiveFreeMonth,
    isExpiredFreeMonth,
    requiresCheckoutToPublish: false,
    isTrialingSubscription,
    stripeSubscriptionStatus,
  });
}
