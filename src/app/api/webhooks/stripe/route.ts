import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { recordLegalAcceptance } from "@/lib/legal/acceptance";
import {
  createSupabaseBillingRepository,
  processStripeWebhookEvent,
} from "@/lib/billing/stripeWebhook";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

export async function POST(req: NextRequest) {
  const receivedAt = new Date();
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
    await trackEvent(null, "billing.webhook.failed", {
      event_type: "signature_verification",
      error: message,
    });
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleSupabaseClient();
  try {
    await processStripeWebhookEvent({
      event,
      repository: createSupabaseBillingRepository(supabase),
      recordLegalAcceptance,
      trackEvent,
      processedAt: receivedAt,
    });
  } catch (error) {
    await trackEvent(null, "billing.webhook.failed", {
      event_type: event.type,
      error: error instanceof Error ? error.message : "Unknown error",
      latency_ms: Math.max(0, receivedAt.getTime() - event.created * 1000),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
