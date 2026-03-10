import type { SupabaseClient, User } from "@supabase/supabase-js";
import { usernameFromEmail } from "@/lib/usernames";

export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User,
  options?: {
    signupReferrer?: string | null;
  },
) {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.username) {
    return existingProfile;
  }

  const baseUsername = usernameFromEmail(user.email);
  let username = existingProfile?.username || baseUsername;
  let suffix = 1;

  while (true) {
    const { data: conflict } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
    if (!conflict || conflict.id === user.id) {
      break;
    }
    suffix += 1;
    username = `${baseUsername}-${suffix}`;
  }

  const provider =
    (user.app_metadata?.provider as string | undefined) ??
    (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes("google")
      ? "google"
      : "email");

  const signupReferrer =
    options?.signupReferrer ??
    ((user.user_metadata?.signup_referrer as string | undefined) ?? null);

  const payload = {
    id: user.id,
    username,
    email: user.email,
    full_name:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    auth_provider: provider,
    signup_referrer: signupReferrer,
  };

  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, username")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return profile;
}
