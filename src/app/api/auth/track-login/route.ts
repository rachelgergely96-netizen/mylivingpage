import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";

/** POST /api/auth/track-login — record email/password sign-in */
export async function POST() {
  const authClient = createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceRoleSupabaseClient();

  // Atomically increment sign-in count and update last_sign_in_at
  await supabase.rpc("increment_sign_in_count", { uid: user.id });

  // Set auth_provider to 'email' if not already set
  await supabase
    .from("profiles")
    .update({ auth_provider: "email" })
    .eq("id", user.id)
    .is("auth_provider", null);

  return NextResponse.json({ ok: true });
}
