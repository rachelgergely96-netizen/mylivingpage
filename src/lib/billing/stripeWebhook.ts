import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/legal-version";
import {
  PUBLISH_TRIAL_DAYS,
  getPlanFromPriceId,
  getStoredPlanForSubscriptionStatus,
  type BillingPlan,
  type ManagedPlan,
} from "@/lib/billing";

export interface BillingStateUpdate {
  plan: ManagedPlan;
  stripeSubscriptionStatus: string | null;
  stripeTrialEndsAt: string | null;
}

export interface BillingRepository {
  updateBillingStateByCustomerId(
    customerId: string,
    state: BillingStateUpdate,
  ): Promise<void>;
  findUserIdByCustomerId(customerId: string): Promise<string | null>;
}

export interface BillingAcceptanceRecorder {
  (input: {
    userId: string;
    source: "checkout";
    acceptedAt?: string;
    termsVersion?: string;
    privacyVersion?: string;
  }): Promise<void>;
}

export interface BillingEventTracker {
  (userId: string | null, eventName: string, metadata?: Record<string, unknown>): Promise<void>;
}

export interface StripeWebhookProcessInput {
  event: Stripe.Event;
  repository: BillingRepository;
  recordLegalAcceptance: BillingAcceptanceRecorder;
  trackEvent: BillingEventTracker;
  processedAt?: Date;
}

export function createSupabaseBillingRepository(
  supabase: SupabaseClient,
): BillingRepository {
  return {
    async updateBillingStateByCustomerId(customerId, state) {
      const { error } = await supabase
        .from("profiles")
        .update({
          plan: state.plan,
          stripe_subscription_status: state.stripeSubscriptionStatus,
          stripe_trial_ends_at: state.stripeTrialEndsAt,
        })
        .eq("stripe_customer_id", customerId);

      if (error) {
        throw new Error(`Unable to update billing state: ${error.message}`);
      }
    },
    async findUserIdByCustomerId(customerId) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle<{ id: string }>();

      if (error) {
        throw new Error(`Unable to resolve billing customer: ${error.message}`);
      }

      return profile?.id ?? null;
    },
  };
}

function getCheckoutSessionCustomerId(session: Stripe.Checkout.Session): string | null {
  return typeof session.customer === "string"
    ? session.customer
    : session.customer?.id ?? null;
}

function getSubscriptionCustomerId(subscription: Stripe.Subscription): string | null {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id ?? null;
}

function getMetadataUserId(metadata: Stripe.Metadata | null | undefined): string | null {
  return typeof metadata?.supabase_user_id === "string" ? metadata.supabase_user_id : null;
}

function getAcceptedAt(createdAtSeconds: number | null | undefined): string | undefined {
  return createdAtSeconds ? new Date(createdAtSeconds * 1000).toISOString() : undefined;
}

function getIsoDate(createdAtSeconds: number | null | undefined): string | null {
  return createdAtSeconds ? new Date(createdAtSeconds * 1000).toISOString() : null;
}

function getCheckoutTrialEndsAt(createdAtSeconds: number | null | undefined): string | null {
  if (!createdAtSeconds) {
    return null;
  }

  return new Date(
    (createdAtSeconds + PUBLISH_TRIAL_DAYS * 24 * 60 * 60) * 1000,
  ).toISOString();
}

function getWebhookLatencyMs(eventCreatedSeconds: number, processedAt: Date): number {
  return Math.max(0, processedAt.getTime() - eventCreatedSeconds * 1000);
}

function getCheckoutSessionSelectedPlan(
  session: Stripe.Checkout.Session,
): BillingPlan | null {
  return session.metadata?.selected_plan === "starter" ||
    session.metadata?.selected_plan === "pro"
    ? session.metadata.selected_plan
    : null;
}

function getSubscriptionPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null;
}

async function trackWebhookProcessed(
  trackEvent: BillingEventTracker,
  userId: string | null,
  event: Stripe.Event,
  processedAt: Date,
  metadata: Record<string, unknown>,
) {
  await trackEvent(userId, "billing.webhook.processed", {
    event_type: event.type,
    latency_ms: getWebhookLatencyMs(event.created, processedAt),
    ...metadata,
  });
}

async function recordCheckoutAcceptanceSafely(
  recordLegalAcceptance: BillingAcceptanceRecorder,
  trackEvent: BillingEventTracker,
  userId: string,
  session: Stripe.Checkout.Session,
) {
  try {
    await recordLegalAcceptance({
      userId,
      source: "checkout",
      acceptedAt: getAcceptedAt(session.created ?? null),
      termsVersion:
        typeof session.metadata?.terms_version === "string"
          ? session.metadata.terms_version
          : TERMS_VERSION,
      privacyVersion:
        typeof session.metadata?.privacy_version === "string"
          ? session.metadata.privacy_version
          : PRIVACY_VERSION,
    });
  } catch (error) {
    await trackEvent(userId, "billing.legal_acceptance.record_failed", {
      source: "checkout",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function processStripeWebhookEvent({
  event,
  repository,
  recordLegalAcceptance,
  trackEvent,
  processedAt = new Date(),
}: StripeWebhookProcessInput): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = getCheckoutSessionCustomerId(session);
      const metadataUserId = getMetadataUserId(session.metadata);
      const selectedPlan = getCheckoutSessionSelectedPlan(session);
      const trialEndsAt = getCheckoutTrialEndsAt(session.created ?? null);

      if (customerId && selectedPlan) {
        await repository.updateBillingStateByCustomerId(customerId, {
          plan: selectedPlan,
          stripeSubscriptionStatus: "trialing",
          stripeTrialEndsAt: trialEndsAt,
        });
      }

      let userId = metadataUserId;
      if (!userId && customerId) {
        userId = await repository.findUserIdByCustomerId(customerId);
      }

      if (userId) {
        await recordCheckoutAcceptanceSafely(
          recordLegalAcceptance,
          trackEvent,
          userId,
          session,
        );

        if (selectedPlan) {
          await trackEvent(userId, "billing.plan.upgraded", {
            plan: selectedPlan,
            customer_id: customerId,
            event_type: event.type,
            subscription_status: "trialing",
            trial_ends_at: trialEndsAt,
          });
        }
      }

      await trackWebhookProcessed(trackEvent, userId, event, processedAt, {
        customer_id: customerId,
        plan: selectedPlan ?? "pro",
        subscription_status: "trialing",
        trial_ends_at: trialEndsAt,
      });
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = getSubscriptionCustomerId(subscription);
      const priceId = getSubscriptionPriceId(subscription);
      const mappedPlan = getPlanFromPriceId(priceId);

      if (!customerId) {
        await trackWebhookProcessed(trackEvent, null, event, processedAt, {
          customer_id: null,
          plan: getStoredPlanForSubscriptionStatus(subscription.status, mappedPlan ?? "pro"),
          price_id: priceId,
          subscription_status: subscription.status,
        });
        return;
      }

      const plan =
        event.type === "customer.subscription.deleted"
          ? "spark"
          : getStoredPlanForSubscriptionStatus(
              subscription.status,
              mappedPlan ?? "pro",
            );
      const stripeTrialEndsAt =
        subscription.status === "trialing"
          ? getIsoDate(subscription.trial_end ?? null)
          : null;

      await repository.updateBillingStateByCustomerId(customerId, {
        plan,
        stripeSubscriptionStatus: subscription.status ?? null,
        stripeTrialEndsAt,
      });
      const userId = await repository.findUserIdByCustomerId(customerId);

      await trackEvent(
        userId,
        plan === "spark" ? "billing.plan.downgraded" : "billing.plan.upgraded",
        {
          plan,
          customer_id: customerId,
          event_type: event.type,
          subscription_status: subscription.status,
          price_id: priceId,
          trial_ends_at: stripeTrialEndsAt,
        },
      );

      await trackWebhookProcessed(trackEvent, userId, event, processedAt, {
        customer_id: customerId,
        plan,
        subscription_status: subscription.status,
        price_id: priceId,
        trial_ends_at: stripeTrialEndsAt,
      });
      return;
    }
    default: {
      await trackWebhookProcessed(trackEvent, null, event, processedAt, {
        ignored: true,
      });
    }
  }
}
