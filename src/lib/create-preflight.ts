import {
  getAccountAccessState,
  type AccountAccessInput,
  type AccountAccessState,
} from "@/lib/account-access";
import { usernameFromEmail } from "@/lib/usernames";

interface CreatePreflightProfile extends AccountAccessInput {
  username?: string | null;
}

interface QueryResult<T> {
  data: T | null;
  error: unknown;
}

export interface CreatePreflightInput {
  profileResult: QueryResult<CreatePreflightProfile>;
  pagesResult: {
    count: number | null;
    error: unknown;
  };
  userEmail: string | null | undefined;
}

export interface CreatePreflightResult {
  accountAccess: AccountAccessState;
  pageCount: number;
  publicSlug: string;
}

export const CREATE_PREFLIGHT_ERROR =
  "We couldn't verify your current page access. Try again before starting a new page.";

/**
 * Resolve the account facts that make first-page creation safe.
 *
 * Defaults are intentionally not accepted here. If the page-count read fails,
 * treating it as zero can route an existing owner into onboarding and replace
 * their page through the one-page upsert.
 */
export function resolveCreatePreflight({
  profileResult,
  pagesResult,
  userEmail,
}: CreatePreflightInput): CreatePreflightResult {
  if (
    profileResult.error ||
    pagesResult.error ||
    !Number.isInteger(pagesResult.count) ||
    (pagesResult.count ?? -1) < 0
  ) {
    throw new Error(CREATE_PREFLIGHT_ERROR);
  }

  const profile = profileResult.data;
  return {
    accountAccess: getAccountAccessState({
      plan: profile?.plan ?? "spark",
      billing_cohort: profile?.billing_cohort ?? null,
      hosting_trial_started_at: profile?.hosting_trial_started_at ?? null,
      stripe_subscription_status: profile?.stripe_subscription_status ?? null,
      stripe_trial_ends_at: profile?.stripe_trial_ends_at ?? null,
    }),
    pageCount: pagesResult.count as number,
    publicSlug: profile?.username ?? usernameFromEmail(userEmail),
  };
}
