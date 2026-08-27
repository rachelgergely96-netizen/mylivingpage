import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import { requireRecentReauthentication } from "@/lib/auth/reauthentication";
import { readUtf8BodyWithLimit } from "@/lib/security/request-body";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const routeTrustLevel = "authenticated_user";
const MAX_PASSWORD_CHANGE_BODY_BYTES = 16 * 1024;

/** POST /api/account/change-password — update the user's password */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again to continue." },
      { status: 401 },
    );
  }

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

  const bodyResult = await readUtf8BodyWithLimit(
    request,
    MAX_PASSWORD_CHANGE_BODY_BYTES,
  );
  if (!bodyResult.ok && bodyResult.reason === "too_large") {
    return NextResponse.json(
      { error: "Request payload is too large." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyResult.ok ? bodyResult.text : "") as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const payload = body as { password?: unknown; currentPassword?: unknown };
  const password = typeof payload.password === "string" ? payload.password : "";

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const reauthentication = await requireRecentReauthentication(
    supabase,
    user,
    payload.currentPassword,
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
