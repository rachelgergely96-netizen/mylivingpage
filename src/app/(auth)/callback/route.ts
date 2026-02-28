import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { usernameFromEmail } from "@/lib/usernames";

function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return "/dashboard";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));
  const redirectUrl = new URL(next, requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const errorRedirect = new URL("/login", requestUrl.origin);
    errorRedirect.searchParams.set("error", error.message);
    return NextResponse.redirect(errorRedirect);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const admin = createServiceRoleSupabaseClient();
    const baseUsername = usernameFromEmail(user.email);
    let username = baseUsername;
    let suffix = 1;

    while (true) {
      const { data: existing } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
      if (!existing || existing.id === user.id) {
        break;
      }
      suffix += 1;
      username = `${baseUsername}-${suffix}`;
    }

    // Determine auth provider
    const provider =
      (user.app_metadata?.provider as string | undefined) ??
      (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes("google")
        ? "google"
        : "email");

    // Read signup referrer from user metadata (set during signUp)
    const signupReferrer = (user.user_metadata?.signup_referrer as string | undefined) ?? null;

    await admin.from("profiles").upsert(
      {
        id: user.id,
        username,
        email: user.email,
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        auth_provider: provider,
        signup_referrer: signupReferrer,
      },
      {
        onConflict: "id",
      },
    );

    // Increment sign-in count
    await admin.rpc("increment_sign_in_count", { uid: user.id });
  }

  return NextResponse.redirect(redirectUrl);
}
