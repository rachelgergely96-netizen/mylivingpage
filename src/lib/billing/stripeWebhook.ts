import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/legal-version";
import { getStoredPlanForSubscriptionStatus, type ManagedPlan } from "@/lib/billing";

export interface BillingRepository {
  updatePlanByCustomerId(customerId: string, plan: ManagedPlan): Promise<void>;
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
    async updatePlanByCustomerId(customerId, plan) {
      await supabase.from("profiles").update({ plan }).eq("stripe_customer_id", customerId);
    },
    async findUserIdByCustomerId(customerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle<{ id: string }>();

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

function getWebhookLatencyMs(eventCreatedSeconds: number, processedAt: Date): number {
  return Math.max(0, processedAt.getTime() - eventCreatedSeconds * 1000);
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

      if (customerId) {
        await repository.updatePlanByCustomerId(customerId, "pro");
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
        await trackEvent(userId, "billing.plan.upgraded", {
          plan: "pro",
          customer_id: customerId,
          event_type: event.type,
        });
      }

      await trackWebhookProcessed(trackEvent, userId, event, processedAt, {
        customer_id: customerId,
        plan: "pro",
      });
      return;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = getSubscriptionCustomerId(subscription);

      if (!customerId) {
        await trackWebhookProcessed(trackEvent, null, event, processedAt, {
          customer_id: null,
          plan: getStoredPlanForSubscriptionStatus(subscription.status),
        });
        return;
      }

      const plan =
        event.type === "customer.subscription.deleted"
          ? "spark"
          : getStoredPlanForSubscriptionStatus(subscription.status);

      await repository.updatePlanByCustomerId(customerId, plan);
      const userId = await repository.findUserIdByCustomerId(customerId);

      await trackEvent(
        userId,
        plan === "pro" ? "billing.plan.upgraded" : "billing.plan.downgraded",
        {
          plan,
          customer_id: customerId,
          event_type: event.type,
          subscription_status: subscription.status,
        },
      );

      await trackWebhookProcessed(trackEvent, userId, event, processedAt, {
        customer_id: customerId,
        plan,
        subscription_status: subscription.status,
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
