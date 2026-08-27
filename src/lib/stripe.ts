import Stripe from "stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

/**
 * Get an existing Stripe customer ID for a user, or create one and persist it.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const supabase = createServiceRoleSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error("Could not load the billing profile", {
      cause: profileError ?? undefined,
    });
  }

  if (profile.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const customer = await getStripe().customers.create(
    {
      email,
      metadata: { supabase_user_id: userId },
    },
    {
      // Concurrent or retried portal requests must converge on one customer.
      idempotencyKey: `living-page-customer:${userId}`,
    },
  );

  const { data: persistedProfile, error: persistError } = await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId)
    .select("stripe_customer_id")
    .single();

  if (
    persistError ||
    persistedProfile?.stripe_customer_id !== customer.id
  ) {
    throw new Error("Could not save the billing customer", {
      cause: persistError ?? undefined,
    });
  }

  return customer.id;
}
