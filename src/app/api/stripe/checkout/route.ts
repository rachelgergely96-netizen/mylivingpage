import { NextResponse } from "next/server";
import { PUBLISH_CC_TRIAL_BILLING_COHORT } from "@/lib/account-access";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/legal-version";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import {
  PUBLISH_TRIAL_DAYS,
  getConfiguredPriceIdForPlan,
} from "@/lib/billing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { trackEvent } from "@/lib/track-event";

const routeTrustLevel = "authenticated_user";

interface CheckoutRequestBody {
  plan?: "starter" | "pro";
  source?: "publish" | "settings";
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
    const selectedPlan = body.plan;
    const source = body.source ?? "settings";

    if (selectedPlan !== "starter" && selectedPlan !== "pro") {
      return NextResponse.json(
        { error: "A valid plan is required.", code: "plan_required" },
        { status: 400 },
      );
    }

    const priceId = getConfiguredPriceIdForPlan(selectedPlan);
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured" },
        { status: 500 },
      );
    }

    const { data: profile } = await fetchProfileWithHostingAccess<{
      plan?: string | null;
    }>({
      supabase,
      select: "plan",
      matchField: "id",
      matchValue: user.id,
      single: true,
    });
    const shouldStartTrial =
      profile?.billing_cohort === PUBLISH_CC_TRIAL_BILLING_COHORT &&
      (profile.plan ?? "spark") === "spark";

    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email ?? "",
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const successUrl =
      source === "publish"
        ? `${appUrl}/create?checkout=success&source=publish&plan=${selectedPlan}`
        : `${appUrl}/dashboard/settings?upgraded=true&plan=${selectedPlan}`;
    const cancelUrl =
      source === "publish"
        ? `${appUrl}/create`
        : `${appUrl}/dashboard/settings`;

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        supabase_user_id: user.id,
        selected_plan: selectedPlan,
        checkout_source: source,
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          selected_plan: selectedPlan,
          checkout_source: source,
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
        },
        ...(shouldStartTrial ? { trial_period_days: PUBLISH_TRIAL_DAYS } : {}),
      },
    });

    await trackEvent(user.id, "billing.checkout.session_created", {
      customer_id: customerId,
      price_id: priceId,
      plan: selectedPlan,
      source,
      started_trial: shouldStartTrial,
      checkout_session_id: session.id,
      latency_ms: Date.now() - startedAt,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    await trackEvent(null, "billing.checkout.session_failed", {
      latency_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create checkout session." },
      { status: 500 },
    );
  }
}
