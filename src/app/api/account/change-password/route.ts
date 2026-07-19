import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import { requireRecentReauthentication } from "@/lib/auth/reauthentication";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const routeTrustLevel = "authenticated_user";

/** POST /api/account/change-password — update the user's password */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rateLimit = await enforceRateLimit({
      request,
      policy: "password_change",
      route: "/api/account/change-password",
      userId: user.id,
    });
    if (rateLimit.limited) return rateLimit.response;
  } catch {
    return NextResponse.json({ error: "Password changes are temporarily unavailable." }, { status: 503 });
  }

  let body: { password?: string; currentPassword?: unknown };
  try {
    body = (await request.json()) as { password?: string; currentPassword?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const password = body.password ?? "";

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const reauthentication = await requireRecentReauthentication(
    supabase,
    user,
    body.currentPassword,
  );
  if (!reauthentication.ok) {
    return NextResponse.json(
      { error: reauthentication.error, code: reauthentication.code },
      { status: reauthentication.status },
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return NextResponse.json({ error: "Unable to update the password. Try a different password." }, { status: 400 });
  }

  trackEvent(user.id, "account.password_change");

  return NextResponse.json({ success: true });
}
