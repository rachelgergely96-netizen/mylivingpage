import { NextResponse } from "next/server";
import {
  NOTIFICATION_PREFERENCE_KEYS,
  ensureNotificationPreferences,
  isNotificationPreferenceKey,
} from "@/lib/notifications/preferences";
import { requireAuthenticatedUser } from "@/lib/security/route-security";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

const routeTrustLevel = "authenticated_user";

/** Never expose `unsubscribe_token` — it is a bearer secret for email links. */
function publicShape(preferences: {
  first_view_email: boolean;
  repeat_visitor_email: boolean;
  weekly_digest_email: boolean;
}) {
  return {
    first_view_email: preferences.first_view_email,
    repeat_visitor_email: preferences.repeat_visitor_email,
    weekly_digest_email: preferences.weekly_digest_email,
  };
}

export async function GET() {
  const authResult = await requireAuthenticatedUser();
  if ("response" in authResult) {
    return authResult.response;
  }

  const supabase = createServiceRoleSupabaseClient();
  const preferences = await ensureNotificationPreferences(
    supabase,
    authResult.value.user.id,
  );

  if (!preferences) {
    return NextResponse.json(
      { error: "Unable to load notification settings." },
      { status: 503 },
    );
  }

  return NextResponse.json(publicShape(preferences));
}

export async function PATCH(request: Request) {
  const authResult = await requireAuthenticatedUser();
  if ("response" in authResult) {
    return authResult.response;
  }

  const userId = authResult.value.user.id;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!isNotificationPreferenceKey(key)) {
      continue;
    }
    if (typeof value !== "boolean") {
      return NextResponse.json(
        { error: `${key} must be true or false.` },
        { status: 400 },
      );
    }
    updates[key] = value;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      {
        error: `Provide at least one of: ${NOTIFICATION_PREFERENCE_KEYS.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleSupabaseClient();
  // Guarantees the row exists before the update, for accounts created before
  // this table shipped.
  const existing = await ensureNotificationPreferences(supabase, userId);
  if (!existing) {
    return NextResponse.json(
      { error: "Unable to save notification settings." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .update(updates)
    .eq("user_id", userId)
    .select("first_view_email, repeat_visitor_email, weekly_digest_email")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Unable to save notification settings." },
      { status: 503 },
    );
  }

  return NextResponse.json(publicShape(data));
}
