import type { SupabaseClient } from "@supabase/supabase-js";
import type { PageRecord } from "@/types/resume";

const LIVE_VISIBILITY_FILTER = "status.eq.live,visibility.eq.public";

export async function fetchPublicLivePage(
  supabase: SupabaseClient,
  identifier: string,
): Promise<PageRecord | null> {
  if (!identifier) {
    return null;
  }

  // Primary path: direct slug lookup.
  const { data: slugPage } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", identifier)
    .or(LIVE_VISIBILITY_FILTER)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (slugPage) {
    return slugPage as PageRecord;
  }

  // Fallback: profile username -> latest publicly visible page.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", identifier)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  const { data: ownerPage } = await supabase
    .from("pages")
    .select("*")
    .or(`user_id.eq.${profile.id},owner_id.eq.${profile.id}`)
    .or(LIVE_VISIBILITY_FILTER)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (ownerPage as PageRecord | null) ?? null;
}
