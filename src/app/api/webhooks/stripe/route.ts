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

const routeTrustLevel = "signed_webhook";

// Stripe's official Go webhook example caps the raw request body at 65,536 bytes:
// https://docs.stripe.com/error-handling?lang=go
// Keep the same bound so signature verification never buffers an unbounded body.
const STRIPE_WEBHOOK_BODY_LIMIT_BYTES = 65_536;
const STRIPE_SIGNATURE_HEADER_LIMIT = 8 * 1024;

export async function POST(req: NextRequest) {
  const receivedAt = new Date();
  const webhookResult = await assertSignedWebhook<Stripe.Event>({
    request: req,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
    signatureHeaderName: "stripe-signature",
    maxBodyBytes: STRIPE_WEBHOOK_BODY_LIMIT_BYTES,
    maxSignatureLength: STRIPE_SIGNATURE_HEADER_LIMIT,
    verify(payload, signature, secret) {
      return getStripe().webhooks.constructEvent(payload, signature, secret);
    },
  });

  if ("response" in webhookResult) {
    // Unverified traffic must not create analytics rows or initialize a service
    // client; otherwise attackers can turn signature failures into DB writes.
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
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
