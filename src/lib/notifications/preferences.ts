import type { SupabaseClient } from "@supabase/supabase-js";

export interface NotificationPreferences {
  user_id: string;
  first_view_email: boolean;
  repeat_visitor_email: boolean;
  weekly_digest_email: boolean;
  unsubscribe_token: string;
  last_digest_sent_at: string | null;
}

export const NOTIFICATION_PREFERENCE_DEFAULTS = {
  first_view_email: true,
  repeat_visitor_email: true,
  weekly_digest_email: true,
} as const;

export type NotificationPreferenceKey = keyof typeof NOTIFICATION_PREFERENCE_DEFAULTS;

export const NOTIFICATION_PREFERENCE_KEYS = Object.keys(
  NOTIFICATION_PREFERENCE_DEFAULTS,
) as NotificationPreferenceKey[];

export function isNotificationPreferenceKey(
  value: string,
): value is NotificationPreferenceKey {
  return (NOTIFICATION_PREFERENCE_KEYS as string[]).includes(value);
}

/**
 * Preferences are created lazily rather than by an auth trigger, so accounts
 * that predate this table behave identically to new ones (defaults on).
 * Requires a service-role client — RLS restricts the table to its owner and the
 * unsubscribe token column is revoked from browser roles entirely.
 */
export async function ensureNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotificationPreferences | null> {
  const { data: existing, error: readError } = await supabase
    .from("notification_preferences")
    .select(
      "user_id, first_view_email, repeat_visitor_email, weekly_digest_email, unsubscribe_token, last_digest_sent_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    return null;
  }

  if (existing) {
    return existing as NotificationPreferences;
  }

  const { data: created, error: insertError } = await supabase
    .from("notification_preferences")
    .insert({ user_id: userId, ...NOTIFICATION_PREFERENCE_DEFAULTS })
    .select(
      "user_id, first_view_email, repeat_visitor_email, weekly_digest_email, unsubscribe_token, last_digest_sent_at",
    )
    .maybeSingle();

  if (insertError) {
    // A concurrent request may have created the row between the read and the
    // insert; re-read once before giving up.
    const { data: raced } = await supabase
      .from("notification_preferences")
      .select(
        "user_id, first_view_email, repeat_visitor_email, weekly_digest_email, unsubscribe_token, last_digest_sent_at",
      )
      .eq("user_id", userId)
      .maybeSingle();

    return (raced as NotificationPreferences | null) ?? null;
  }

  return (created as NotificationPreferences | null) ?? null;
}
