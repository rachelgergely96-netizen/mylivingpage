import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

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

      if (customerId) {
        await supabase
          .from("profiles")
          .update({ plan: "pro" })
          .eq("stripe_customer_id", customerId);
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
