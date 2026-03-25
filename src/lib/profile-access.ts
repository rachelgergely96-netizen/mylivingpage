import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export interface HostingProfileFields {
  billing_cohort: string | null;
  hosting_trial_started_at: string | null;
  stripe_subscription_status: string | null;
  stripe_trial_ends_at: string | null;
}

export interface FetchProfileWithHostingAccessOptions {
  supabase: SupabaseClient;
  select: string;
  matchField: "id" | "username";
  matchValue: string;
  single?: boolean;
}

export interface FetchProfileWithHostingAccessResult<TProfile> {
  data: (TProfile & HostingProfileFields) | null;
  error: PostgrestError | null;
  schema: "full" | "legacy_fallback";
}

function withHostingAccessColumns(select: string) {
  const fields = select
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);

  if (!fields.includes("billing_cohort")) {
    fields.push("billing_cohort");
  }

  if (!fields.includes("hosting_trial_started_at")) {
    fields.push("hosting_trial_started_at");
  }

  if (!fields.includes("stripe_subscription_status")) {
    fields.push("stripe_subscription_status");
  }

  if (!fields.includes("stripe_trial_ends_at")) {
    fields.push("stripe_trial_ends_at");
  }

  return fields.join(", ");
}

function normalizeLegacyProfile<TProfile>(
  profile: TProfile | null,
): (TProfile & HostingProfileFields) | null {
  if (!profile) {
    return null;
  }

  return {
    ...(profile as Record<string, unknown>),
    billing_cohort: null,
    hosting_trial_started_at: null,
    stripe_subscription_status: null,
    stripe_trial_ends_at: null,
  } as TProfile & HostingProfileFields;
}

export function isMissingHostingAccessSchemaError(
  error: Pick<PostgrestError, "code" | "message" | "details" | "hint"> | null | undefined,
) {
  if (!error) {
    return false;
  }

  const haystack = [
    error.code,
    error.message,
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const mentionsHostingColumns =
    haystack.includes("billing_cohort") ||
    haystack.includes("hosting_trial_started_at") ||
    haystack.includes("stripe_subscription_status") ||
    haystack.includes("stripe_trial_ends_at");

  return (
    mentionsHostingColumns &&
    (haystack.includes("pgrst204") ||
      haystack.includes("42703") ||
      haystack.includes("schema cache") ||
      haystack.includes("could not find the") ||
      haystack.includes("does not exist"))
  );
}

async function runProfileLookup(
  supabase: SupabaseClient,
  select: string,
  matchField: "id" | "username",
  matchValue: string,
  single: boolean,
) {
  const query = supabase.from("profiles").select(select).eq(matchField, matchValue);
  return single ? query.single() : query.maybeSingle();
}

export async function fetchProfileWithHostingAccess<TProfile extends Record<string, unknown>>(
  options: FetchProfileWithHostingAccessOptions,
): Promise<FetchProfileWithHostingAccessResult<TProfile>> {
  const fullLookup = await runProfileLookup(
    options.supabase,
    withHostingAccessColumns(options.select),
    options.matchField,
    options.matchValue,
    Boolean(options.single),
  );

  if (!fullLookup.error) {
    return {
      data: (fullLookup.data as (TProfile & HostingProfileFields) | null) ?? null,
      error: null,
      schema: "full",
    };
  }

  if (!isMissingHostingAccessSchemaError(fullLookup.error)) {
    return {
      data: null,
      error: fullLookup.error,
      schema: "full",
    };
  }

  console.error("profile_access.legacy_fallback", {
    match_field: options.matchField,
    match_value: options.matchValue,
    error: fullLookup.error.message,
  });

  const legacyLookup = await runProfileLookup(
    options.supabase,
    options.select,
    options.matchField,
    options.matchValue,
    Boolean(options.single),
  );

  if (legacyLookup.error) {
    return {
      data: null,
      error: legacyLookup.error,
      schema: "legacy_fallback",
    };
  }

  return {
    data: normalizeLegacyProfile(legacyLookup.data as TProfile | null),
    error: null,
    schema: "legacy_fallback",
  };
}
