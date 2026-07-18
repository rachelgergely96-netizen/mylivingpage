import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export async function recordEvent(
  userId: string | null,
  eventName: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    const supabase = createServiceRoleSupabaseClient();
    const { error } = await supabase.from("events").insert({
      user_id: userId,
      event_name: eventName,
      metadata,
    });
    return !error;
  } catch {
    // Event tracking should never break the main flow
    return false;
  }
}

export async function trackEvent(
  userId: string | null,
  eventName: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await recordEvent(userId, eventName, metadata);
}
