import {
  PRO_PLAN_PRICE,
  getExpectedProPlanStripeSnapshot,
  getStripePriceDriftMessages,
  type StripePriceSnapshot,
} from "@/lib/billing";
import {
  buildAdminUserRows,
  listAllAuthUsers,
  summarizeAdminUserRisk,
  type AdminProfileRow,
} from "@/lib/admin-user-review";
import { getLegalConfigIssues } from "@/lib/legal/status";
import { RATE_LIMIT_POLICIES, type RateLimitPolicyName } from "@/lib/security/rate-limit";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import {
  isTurnstileConfigured,
  isTurnstileMissingInProduction,
} from "@/lib/turnstile";

interface EventRow {
  event_name: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
}

interface StripePriceStatus {
  actual: StripePriceSnapshot | null;
  driftMessages: string[];
  errorMessage: string | null;
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const valueClassName =
    tone === "danger"
      ? "text-[#ff8e8e]"
      : tone === "warning"
        ? "text-[#fbbf24]"
        : tone === "success"
          ? "text-[#4ade80]"
          : "text-[#93C5FD]";

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <p className={`font-mono text-2xl font-bold sm:text-3xl ${valueClassName}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
        {label}
      </p>
    </div>
  );
}

function EventFeed({
  title,
  emptyLabel,
  events,
}: {
  title: string;
  emptyLabel: string;
  events: EventRow[];
}) {
  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
        {title}
      </p>
      <div className="space-y-2.5">
        {events.length === 0 ? (
          <p className="text-sm text-[rgba(240,244,255,0.35)]">{emptyLabel}</p>
        ) : (
          events.map((event, index) => (
            <div
              key={`${event.created_at}-${index}`}
              className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[#F0F4FF]">{event.event_name}</p>
                <p className="shrink-0 text-[10px] font-mono text-[rgba(240,244,255,0.32)]">
                  {new Date(event.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {new Date(event.created_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {event.metadata && Object.keys(event.metadata).length > 0 ? (
                <p className="mt-1 truncate font-mono text-[10px] text-[rgba(240,244,255,0.32)]">
                  {JSON.stringify(event.metadata)}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

async function getStripePriceStatus(): Promise<StripePriceStatus> {
  const configuredPriceId = process.env.STRIPE_PRICE_ID ?? null;
  if (!configuredPriceId || !process.env.STRIPE_SECRET_KEY) {
    return {
      actual: null,
      driftMessages: [],
      errorMessage:
        "Stripe price verification is unavailable because STRIPE_PRICE_ID or STRIPE_SECRET_KEY is missing.",
    };
  }

  try {
    const price = await getStripe().prices.retrieve(configuredPriceId, {
      expand: ["product"],
    });
    const actual: StripePriceSnapshot = {
      id: price.id,
      active: price.active,
      amountCents: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval ?? null,
      intervalCount: price.recurring?.interval_count ?? null,
      productName:
        typeof price.product === "string" || "deleted" in price.product
          ? null
          : price.product.name ?? null,
    };

    return {
      actual,
      driftMessages: getStripePriceDriftMessages(
        actual,
        getExpectedProPlanStripeSnapshot(configuredPriceId),
      ),
      errorMessage: null,
    };
  } catch (error) {
    return {
      actual: null,
      driftMessages: [],
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unable to verify Stripe price configuration.",
    };
  }
}

export const dynamic = "force-dynamic";

export default async function AdminOpsPage() {
  const supabase = createServiceRoleSupabaseClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDayCutoff = sevenDaysAgo.toISOString();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDayCutoff = thirtyDaysAgo.toISOString();

  const [
    { count: webhookFailureCount },
    { count: publishFailureCount },
    { count: publishFallbackCount },
    { count: authCallbackFailureCount },
    { count: parseFailureCount },
    { count: parseRateLimitCount },
    { count: rateLimitBlockedCount },
    { data: processedWebhookRows },
    { data: recentBillingRows },
    { data: recentFailureRows },
    { data: recentRateLimitRows },
    { data: profiles },
    authUsers,
    stripePriceStatus,
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "billing.webhook.failed")
      .gte("created_at", sevenDayCutoff),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "page.publish.failed")
      .gte("created_at", sevenDayCutoff),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "page.publish.db_fallback_used")
      .gte("created_at", thirtyDayCutoff),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "auth.callback.failed")
      .gte("created_at", sevenDayCutoff),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "resume.parse.failed")
      .gte("created_at", sevenDayCutoff),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "resume.parse.rate_limited")
      .gte("created_at", sevenDayCutoff),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "security.rate_limit.blocked")
      .gte("created_at", sevenDayCutoff),
    supabase
      .from("events")
      .select("event_name, metadata, created_at, user_id")
      .eq("event_name", "billing.webhook.processed")
      .gte("created_at", sevenDayCutoff)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("events")
      .select("event_name, metadata, created_at, user_id")
      .in("event_name", [
        "billing.checkout.session_created",
        "billing.portal.session_created",
        "billing.plan.upgraded",
        "billing.plan.downgraded",
        "billing.webhook.processed",
        "billing.webhook.failed",
      ])
      .order("created_at", { ascending: false })
      .limit(16),
    supabase
      .from("events")
      .select("event_name, metadata, created_at, user_id")
      .in("event_name", [
        "billing.checkout.session_failed",
        "billing.portal.session_failed",
        "billing.webhook.failed",
        "page.publish.failed",
        "auth.callback.failed",
        "resume.parse.failed",
      ])
      .order("created_at", { ascending: false })
      .limit(16),
    supabase
      .from("events")
      .select("event_name, metadata, created_at, user_id")
      .eq("event_name", "security.rate_limit.blocked")
      .order("created_at", { ascending: false })
      .limit(16),
    supabase
      .from("profiles")
      .select("id, username, full_name, email, avatar_url, plan, created_at, auth_provider, last_sign_in_at, sign_in_count, signup_referrer"),
    listAllAuthUsers(supabase),
    getStripePriceStatus(),
  ]);

  const processedWebhooks = (processedWebhookRows ?? []) as EventRow[];
  const recentBillingEvents = (recentBillingRows ?? []) as EventRow[];
  const recentFailureEvents = (recentFailureRows ?? []) as EventRow[];
  const recentRateLimitEvents = (recentRateLimitRows ?? []) as EventRow[];
  const legalIssues = getLegalConfigIssues();
  const adminUsers = buildAdminUserRows({
    profiles: ((profiles ?? []) as AdminProfileRow[]),
    pages: [],
    authUsers,
  });
  const riskSummary = summarizeAdminUserRisk(adminUsers);
  const turnstileConfigured = isTurnstileConfigured();
  const turnstileMissingInProduction = isTurnstileMissingInProduction();
  const blockedPolicies = recentRateLimitEvents.reduce<Record<string, number>>((acc, event) => {
    const policy = typeof event.metadata?.policy === "string" ? event.metadata.policy : null;
    if (!policy) {
      return acc;
    }
    acc[policy] = (acc[policy] ?? 0) + 1;
    return acc;
  }, {});
  const topBlockedPolicy = Object.entries(blockedPolicies)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0] ?? null;
  const topBlockedPolicyLabel = topBlockedPolicy
    ? `${RATE_LIMIT_POLICIES[topBlockedPolicy[0] as RateLimitPolicyName]?.label ?? topBlockedPolicy[0]} x${topBlockedPolicy[1]}`
    : "Clear";

  const latencyValues = processedWebhooks.flatMap((event) =>
    typeof event.metadata?.latency_ms === "number" ? [event.metadata.latency_ms] : [],
  );
  const averageWebhookLatencyMs = latencyValues.length
    ? Math.round(latencyValues.reduce((sum, latency) => sum + latency, 0) / latencyValues.length)
    : 0;
  const latestWebhookLatencyMs =
    typeof processedWebhooks[0]?.metadata?.latency_ms === "number"
      ? processedWebhooks[0].metadata.latency_ms
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:px-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Admin</p>
        <h1 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
          Operations
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[rgba(240,244,255,0.55)]">
          Release health for billing, publishing, auth callbacks, bot pressure on public endpoints, and public legal readiness.
        </p>
      </div>

      {turnstileMissingInProduction ? (
        <div className="mb-6 rounded-2xl border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] px-5 py-4 text-sm text-[rgba(255,248,220,0.88)]">
          Production is missing `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Email signup hardening is not active until Turnstile is configured in both the app env and Supabase Auth CAPTCHA settings.
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-10 sm:gap-4">
        <StatCard
          label="Webhook Failures (7d)"
          value={webhookFailureCount ?? 0}
          tone={(webhookFailureCount ?? 0) > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Publish Failures (7d)"
          value={publishFailureCount ?? 0}
          tone={(publishFailureCount ?? 0) > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Publish DB Fallback (30d)"
          value={publishFallbackCount ?? 0}
          tone={(publishFallbackCount ?? 0) > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Auth Callback Failures (7d)"
          value={authCallbackFailureCount ?? 0}
          tone={(authCallbackFailureCount ?? 0) > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Parse Failures (7d)"
          value={parseFailureCount ?? 0}
          tone={(parseFailureCount ?? 0) > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Parse Rate Limited (7d)"
          value={parseRateLimitCount ?? 0}
          tone={parseRateLimitCount ? "default" : "success"}
        />
        <StatCard
          label="Suspicious Signups (7d)"
          value={riskSummary.suspiciousSignupsLast7Days}
          tone={riskSummary.suspiciousSignupsLast7Days > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Unconfirmed > 24h"
          value={riskSummary.unconfirmedPastGrace}
          tone={riskSummary.unconfirmedPastGrace > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Rate Limit Blocks (7d)"
          value={rateLimitBlockedCount ?? 0}
          tone={(rateLimitBlockedCount ?? 0) > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Abuse Hotspot"
          value={topBlockedPolicyLabel}
          tone={topBlockedPolicy ? "warning" : "success"}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-card rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
                Stripe Price Health
              </p>
              <h2 className="mt-2 font-heading text-xl font-semibold text-[#F0F4FF]">
                {PRO_PLAN_PRICE.productName}
              </h2>
              <p className="mt-1 text-sm text-[rgba(240,244,255,0.52)]">
                Expected {PRO_PLAN_PRICE.displayLabel}, {PRO_PLAN_PRICE.currency.toUpperCase()}, recurring {PRO_PLAN_PRICE.interval}.
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${
                stripePriceStatus.errorMessage || stripePriceStatus.driftMessages.length
                  ? "border-[rgba(245,158,11,0.35)] text-[#fbbf24]"
                  : "border-[rgba(74,222,128,0.35)] text-[#4ade80]"
              }`}
            >
              {stripePriceStatus.errorMessage || stripePriceStatus.driftMessages.length
                ? "Needs Attention"
                : "Aligned"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.38)]">
                Latest Webhook Latency
              </p>
              <p className="mt-2 font-mono text-2xl text-[#93C5FD]">
                {latestWebhookLatencyMs ?? 0} ms
              </p>
              <p className="mt-1 text-xs text-[rgba(240,244,255,0.35)]">
                Average over the last {processedWebhooks.length} processed webhook events: {averageWebhookLatencyMs} ms
              </p>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.38)]">
                Stripe Snapshot
              </p>
              {stripePriceStatus.actual ? (
                <div className="mt-2 space-y-1 text-sm text-[rgba(240,244,255,0.62)]">
                  <p>Price ID: <span className="font-mono text-[#F0F4FF]">{stripePriceStatus.actual.id}</span></p>
                  <p>Amount: <span className="font-mono text-[#F0F4FF]">{stripePriceStatus.actual.amountCents ?? "missing"} cents</span></p>
                  <p>Product: <span className="font-mono text-[#F0F4FF]">{stripePriceStatus.actual.productName ?? "missing"}</span></p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[rgba(240,244,255,0.42)]">
                  Stripe snapshot unavailable.
                </p>
              )}
            </div>
          </div>

          {stripePriceStatus.errorMessage ? (
            <p className="mt-4 rounded-xl border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-sm text-[#fbbf24]">
              {stripePriceStatus.errorMessage}
            </p>
          ) : stripePriceStatus.driftMessages.length ? (
            <div className="mt-4 rounded-xl border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-sm text-[rgba(255,248,220,0.82)]">
              <p className="font-medium text-[#fbbf24]">Stripe pricing drift detected</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {stripePriceStatus.driftMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.08)] px-4 py-3 text-sm text-[#4ade80]">
              Stripe matches the app&apos;s current Pro pricing contract.
            </p>
          )}
        </section>

        <section className="glass-card rounded-2xl p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
            Legal Configuration
          </p>
          <h2 className="mt-2 font-heading text-xl font-semibold text-[#F0F4FF]">
            Public policy values
          </h2>
          <p className="mt-2 text-sm text-[rgba(240,244,255,0.52)]">
            These env-backed values are rendered on the public legal pages and should be finalized before broader launch.
          </p>

          {legalIssues.length === 0 ? (
            <p className="mt-4 rounded-xl border border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.08)] px-4 py-3 text-sm text-[#4ade80]">
              Legal contact fields are fully configured.
            </p>
          ) : (
            <div className="mt-4 rounded-xl border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] px-4 py-3">
              <p className="text-sm font-medium text-[#fbbf24]">
                {legalIssues.length} legal env values still need real production data.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[rgba(255,248,220,0.82)]">
                {legalIssues.map((issue) => (
                  <li key={issue.envKey}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.38)]">
                Signup CAPTCHA
              </p>
              <span
                className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${
                  turnstileConfigured
                    ? "border-[rgba(74,222,128,0.35)] text-[#4ade80]"
                    : "border-[rgba(245,158,11,0.35)] text-[#fbbf24]"
                }`}
              >
                {turnstileConfigured ? "Configured" : "Missing"}
              </span>
            </div>
            <p className="mt-2 text-sm text-[rgba(240,244,255,0.52)]">
              Email signup uses Cloudflare Turnstile only when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is present.
            </p>
            {!turnstileConfigured ? (
              <p className="mt-2 text-sm text-[#fbbf24]">
                Add the site key to the app env and enable Cloudflare Turnstile in Supabase Auth CAPTCHA settings.
              </p>
            ) : null}
          </div>

          <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.38)]">
              Production Auth Checklist
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[rgba(240,244,255,0.56)]">
              <li>Email confirmation remains enabled in Supabase Auth.</li>
              <li>Turnstile is configured in app env and Supabase Auth CAPTCHA settings.</li>
              <li>Supabase Auth provider rate limits stay at default or stricter values.</li>
              <li>Playwright and integration secrets remain staging-only.</li>
            </ul>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <EventFeed
          title="Recent Billing Events"
          emptyLabel="No billing events recorded yet."
          events={recentBillingEvents}
        />
        <EventFeed
          title="Recent Failures"
          emptyLabel="No tracked failures in the sampled window."
          events={recentFailureEvents}
        />
        <EventFeed
          title="Recent Abuse Controls"
          emptyLabel="No recent rate-limit blocks."
          events={recentRateLimitEvents}
        />
      </div>
    </main>
  );
}
