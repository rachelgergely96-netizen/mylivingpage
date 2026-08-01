import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

const routeTrustLevel = "authenticated_user";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Your session has expired. Sign in again to continue." },
        { status: 401 },
      );
    }

    await trackEvent(user.id, "billing.checkout.disabled", {});

    return NextResponse.json(
      {
        error: "Paid plans are no longer offered. Publishing is free for every account.",
        code: "billing_disabled",
      },
      { status: 410 },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to verify account." },
      { status: 500 },
    );
  }
}
