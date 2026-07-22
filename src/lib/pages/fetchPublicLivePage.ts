import type { SupabaseClient } from "@supabase/supabase-js";
import type { PageRecord } from "@/types/resume";

export async function fetchPublicLivePage(
  supabase: SupabaseClient,
  username: string,
): Promise<PageRecord | null> {
  if (!username) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle<{ id: string }>();

  if (profileError || !profile) {
    return null;
  }

  const { data: publicPage } = await supabase
    .from("pages")
    .select("*")
    .eq("owner_id", profile.id)
    .eq("status", "live")
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (publicPage) {
    return publicPage as PageRecord;
  }

  const { data: legacyPage } = await supabase
    .from("pages")
    .select("*")
    .eq("user_id", profile.id)
    .eq("status", "live")
    .or("visibility.eq.public,visibility.is.null")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!legacyPage) {
    return null;
  }

  return legacyPage as PageRecord;
}
