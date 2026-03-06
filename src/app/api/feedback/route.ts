import { NextRequest, NextResponse } from "next/server";
import { trackEvent } from "@/lib/track-event";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = ["bug", "feature", "general"] as const;
type FeedbackType = (typeof ALLOWED_TYPES)[number];

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let message = "";
  let type: FeedbackType = "general";
  let page = "";

  try {
    const body = (await request.json()) as { message?: unknown; type?: unknown; page?: unknown };
    message = typeof body.message === "string" ? body.message.trim() : "";
    type = ALLOWED_TYPES.includes(body.type as FeedbackType) ? (body.type as FeedbackType) : "general";
    page = typeof body.page === "string" ? body.page.trim().slice(0, 200) : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: "Message too long (max 2000 characters)" }, { status: 400 });
  }

  await trackEvent(user.id, "feedback.submitted", { message, type, page });

  return NextResponse.json({ success: true });
}
