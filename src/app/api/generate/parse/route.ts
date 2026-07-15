import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const routeTrustLevel = "authenticated_user";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      error:
        "AI resume parsing is no longer available. Use the guided resume builder instead.",
      code: "parsing_disabled",
      retryable: false,
    },
    { status: 410 },
  );
}
