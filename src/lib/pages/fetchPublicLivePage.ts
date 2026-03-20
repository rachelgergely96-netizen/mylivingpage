import type { SupabaseClient } from "@supabase/supabase-js";
import { syncPageHostingState } from "@/lib/hosting-state";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import type { PageRecord } from "@/types/resume";

export async function fetchPublicLivePage(
  supabase: SupabaseClient,
  username: string,
): Promise<PageRecord | null> {
  if (!username) {
    return null;
  }

  const { data: profile, error: profileError } =
    await fetchProfileWithHostingAccess<{
      id: string;
      plan?: string | null;
    }>({
      supabase,
      select: "id, plan",
      matchField: "username",
      matchValue: username,
    });

  if (profileError || !profile) {
    return null;
  }

  const { data: publicPage } = await supabase
    .from("pages")
    .select("*")
    .eq("owner_id", profile.id)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (publicPage) {
    const synced = await syncPageHostingState(
      supabase,
      publicPage as PageRecord,
      {
        plan: profile.plan,
        billing_cohort: profile.billing_cohort,
        hosting_trial_started_at: profile.hosting_trial_started_at,
      },
    );

    return synced.access.publicHostingAllowed
      ? (synced.page as PageRecord)
      : null;
  }

  const { data: legacyPage } = await supabase
    .from("pages")
    .select("*")
    .eq("user_id", profile.id)
    .eq("status", "live")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!legacyPage) {
    return null;
  }

  const synced = await syncPageHostingState(
    supabase,
    legacyPage as PageRecord,
    {
      plan: profile.plan,
      billing_cohort: profile.billing_cohort,
      hosting_trial_started_at: profile.hosting_trial_started_at,
    },
  );

  return synced.access.publicHostingAllowed
    ? (synced.page as PageRecord)
    : null;
}
