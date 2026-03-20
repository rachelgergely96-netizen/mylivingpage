import { isPremiumPlan } from "@/lib/plans";

export const LEGACY_BILLING_COHORT = "legacy_freemium";
export const TRIAL_HOSTING_BILLING_COHORT = "trial_hosting_v1";
export const FREE_HOSTING_TRIAL_DAYS = 30;

export type BillingCohort =
  | typeof LEGACY_BILLING_COHORT
  | typeof TRIAL_HOSTING_BILLING_COHORT;

export interface AccountAccessInput {
  plan?: string | null;
  billing_cohort?: string | null;
  hosting_trial_started_at?: string | null;
  now?: Date | string | number;
}

export interface AccountAccessState {
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
  const hasPaidSubscription = isPremiumPlan(input.plan);

  if (billingCohort === LEGACY_BILLING_COHORT) {
    return {
      billingCohort,
      featuresUnlocked: hasPaidSubscription,
      publicHostingAllowed: true,
      trialStartedAt: null,
      trialEndsAt: null,
      requiresSubscription: false,
      isLegacyAccount: true,
      hasPaidSubscription,
      hasStartedFreeMonth: false,
      isActiveFreeMonth: false,
      isExpiredFreeMonth: false,
    };
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

  return {
    billingCohort,
    featuresUnlocked: true,
    publicHostingAllowed,
    trialStartedAt: trialStartedAtDate?.toISOString() ?? null,
    trialEndsAt: trialEndsAtDate?.toISOString() ?? null,
    requiresSubscription: isExpiredFreeMonth,
    isLegacyAccount: false,
    hasPaidSubscription,
    hasStartedFreeMonth,
    isActiveFreeMonth,
    isExpiredFreeMonth,
  };
}
