import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { recordLegalAcceptance } from "@/lib/legal/acceptance";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/legal-version";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleSupabaseClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
      const metadataUserId =
        typeof session.metadata?.supabase_user_id === "string"
          ? session.metadata.supabase_user_id
          : null;

      if (customerId) {
        await supabase
          .from("profiles")
          .update({ plan: "pro" })
          .eq("stripe_customer_id", customerId);
      }

      let userId = metadataUserId;
      if (!userId && customerId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle<{ id: string }>();
        userId = profile?.id ?? null;
      }

      if (userId) {
        const metadataTermsVersion =
          typeof session.metadata?.terms_version === "string"
            ? session.metadata.terms_version
            : TERMS_VERSION;
        const metadataPrivacyVersion =
          typeof session.metadata?.privacy_version === "string"
            ? session.metadata.privacy_version
            : PRIVACY_VERSION;
        const acceptedAt = new Date(
          (session.created ?? event.created) * 1000,
        ).toISOString();

        try {
          await recordLegalAcceptance({
            userId,
            source: "checkout",
            acceptedAt,
            termsVersion: metadataTermsVersion,
            privacyVersion: metadataPrivacyVersion,
          });
        } catch (acceptanceError) {
          console.error(
            "Failed to record checkout legal acceptance",
            acceptanceError,
          );
        }

        await trackEvent(userId, "plan.upgrade", { plan: "pro" }).catch(() => {});
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

      if (customerId) {
        const isActive =
          subscription.status === "active" ||
          subscription.status === "trialing";
        await supabase
          .from("profiles")
          .update({ plan: isActive ? "pro" : "spark" })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

      if (customerId) {
        await supabase
          .from("profiles")
          .update({ plan: "spark" })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
