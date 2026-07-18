import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";

const routeTrustLevel = "authenticated_user";

/** POST /api/auth/track-login — record email/password sign-in */
export async function POST() {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceRoleSupabaseClient();

  // Atomically increment sign-in count and update last_sign_in_at
  const { error: incrementError } = await supabase.rpc("increment_sign_in_count", {
    uid: user.id,
  });
  if (incrementError) {
    return NextResponse.json(
      { error: "Unable to record this sign-in." },
      { status: 503 },
    );
  }

  // Set auth_provider to 'email' if not already set
  const { error: providerError } = await supabase
    .from("profiles")
    .update({ auth_provider: "email" })
    .eq("id", user.id)
    .is("auth_provider", null);

  if (providerError) {
    return NextResponse.json(
      { error: "Unable to record this sign-in." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
