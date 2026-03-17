import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { recordLegalAcceptance } from "@/lib/legal/acceptance";
import {
  createSupabaseBillingRepository,
  processStripeWebhookEvent,
} from "@/lib/billing/stripeWebhook";
import { assertSignedWebhook } from "@/lib/security/route-security";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

export const routeTrustLevel = "signed_webhook";

export async function POST(req: NextRequest) {
  const receivedAt = new Date();
  const webhookResult = await assertSignedWebhook<Stripe.Event>({
    request: req,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
    signatureHeaderName: "stripe-signature",
    verify(payload, signature, secret) {
      return getStripe().webhooks.constructEvent(payload, signature, secret);
    },
  });

  if ("response" in webhookResult) {
    const responseBody = (await webhookResult.response.clone().json().catch(() => null)) as
      | { error?: string }
      | null;
    await trackEvent(null, "billing.webhook.failed", {
      event_type: "signature_verification",
      error: responseBody?.error ?? "Unknown error",
    });
    return webhookResult.response;
  }
  const event = webhookResult.value.verified;

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
