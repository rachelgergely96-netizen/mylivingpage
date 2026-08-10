import { getAccountAccessState } from "@/lib/account-access";
import { getAbsoluteUrl } from "@/lib/site";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export interface LivingPageSitemapEntry {
  url: string;
  lastModified: Date;
}

interface SitemapPageRow {
  owner_id: string | null;
  user_id: string | null;
  updated_at: string | null;
}

interface SitemapProfileRow {
  id: string;
  username: string | null;
  plan: string | null;
  billing_cohort: string | null;
  hosting_trial_started_at: string | null;
  stripe_subscription_status: string | null;
  stripe_trial_ends_at: string | null;
}

/**
 * Published Living Pages that are genuinely reachable by the public — live,
 * public, and owned by an account whose hosting access is active. Being
 * indexable is the product promise, so every hosted page belongs in the
 * sitemap; lapsed-hosting pages must never appear even if their row still
 * says "live" (the row is only demoted lazily on next view).
 */
export async function fetchLivingPageSitemapEntries(): Promise<
  LivingPageSitemapEntry[]
> {
  try {
    const supabase = createServiceRoleSupabaseClient();

    const { data: pages, error: pagesError } = await supabase
      .from("pages")
      .select("owner_id, user_id, updated_at")
      .eq("status", "live")
      .or("visibility.eq.public,visibility.is.null")
      // Load-bearing for the "link only" state: those pages are live and
      // reachable but must never be offered to search engines. `is.null`
      // covers rows written before the column existed, which are indexable.
      .or("search_indexable.is.null,search_indexable.eq.true");

    if (pagesError || !pages?.length) {
      return [];
    }

    const ownerIds = Array.from(
      new Set(
        (pages as SitemapPageRow[])
          .map((page) => page.owner_id ?? page.user_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (!ownerIds.length) {
      return [];
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select(
        "id, username, plan, billing_cohort, hosting_trial_started_at, stripe_subscription_status, stripe_trial_ends_at",
      )
      .in("id", ownerIds);

    if (profilesError || !profiles?.length) {
      return [];
    }

    const hostedProfilesById = new Map<string, string>();
    for (const profile of profiles as SitemapProfileRow[]) {
      if (!profile.username) continue;
      const access = getAccountAccessState({
        plan: profile.plan,
        billing_cohort: profile.billing_cohort,
        hosting_trial_started_at: profile.hosting_trial_started_at,
        stripe_subscription_status: profile.stripe_subscription_status,
        stripe_trial_ends_at: profile.stripe_trial_ends_at,
      });
      if (access.publicHostingAllowed) {
        hostedProfilesById.set(profile.id, profile.username);
      }
    }

    // One entry per username, stamped with the newest live page's update time.
    const entriesByUsername = new Map<string, Date>();
    for (const page of pages as SitemapPageRow[]) {
      const ownerId = page.owner_id ?? page.user_id;
      const username = ownerId ? hostedProfilesById.get(ownerId) : undefined;
      if (!username) continue;
      const updatedAt = page.updated_at ? new Date(page.updated_at) : new Date(0);
      const existing = entriesByUsername.get(username);
      if (!existing || updatedAt > existing) {
        entriesByUsername.set(username, updatedAt);
      }
    }

    return Array.from(entriesByUsername, ([username, lastModified]) => ({
      url: getAbsoluteUrl(`/${username}`),
      lastModified,
    }));
  } catch {
    // The sitemap must keep serving its static entries even when the
    // database is unreachable (e.g. local builds without credentials).
    return [];
  }
}
