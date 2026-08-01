import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { trackEvent } from "@/lib/track-event";

const routeTrustLevel = "authenticated_user";

export async function POST() {
  const startedAt = Date.now();
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

    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email ?? "",
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard/settings`,
    });

    await trackEvent(user.id, "billing.portal.session_created", {
      customer_id: customerId,
      portal_session_id: session.id,
      latency_ms: Date.now() - startedAt,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    await trackEvent(null, "billing.portal.session_failed", {
      latency_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Could not open the billing portal. Please try again." },
      { status: 500 },
    );
  }
}
