import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export async function trackEvent(
  userId: string | null,
  eventName: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    const supabase = createServiceRoleSupabaseClient();
    await supabase.from("events").insert({
      user_id: userId,
      event_name: eventName,
      metadata,
    });
  } catch {
    // Event tracking should never break the main flow
  }
}
