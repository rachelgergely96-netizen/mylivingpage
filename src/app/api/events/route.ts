import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/track-event";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { eventName?: unknown; metadata?: unknown }
    | null;

  const eventName = typeof body?.eventName === "string" ? body.eventName.trim() : "";
  const metadata = isPlainObject(body?.metadata) ? body.metadata : {};

  if (!eventName || eventName.length > 120 || !/^[a-z0-9._-]+$/i.test(eventName)) {
    return NextResponse.json({ error: "Invalid event name." }, { status: 400 });
  }

  await trackEvent(user.id, eventName, metadata);
  return NextResponse.json({ success: true });
}
