import {
  HOSTING_PLAN_PRICE,
  getExpectedHostingPlanStripeSnapshot,
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
import styles from "@/components/admin/AdminExperience.module.css";

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

function formatPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value}%`;
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
      ? "text-site-danger"
      : tone === "warning"
        ? "text-site-warning"
        : tone === "success"
          ? "text-site-success"
          : "text-site-action";

  return (
    <div className="site-panel p-4 sm:p-5">
      <p className={`font-site tabular-nums text-2xl font-bold sm:text-3xl ${valueClassName}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-[11px] font-semibold text-site-muted">
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
    <section className="site-panel p-4 sm:p-5">
      <h2 className="mb-4 text-[11px] font-semibold text-site-muted">
        {title}
      </h2>
      <div className="space-y-2.5">
        {events.length === 0 ? (
          <p className="text-sm text-site-muted">{emptyLabel}</p>
        ) : (
          events.map((event, index) => (
            <div
              key={`${event.created_at}-${index}`}
              className="border border-site-border bg-site-canvas-alt px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-site-text">{event.event_name}</p>
                <time dateTime={event.created_at} className="shrink-0 font-mono text-[10px] text-site-muted">
                  {new Date(event.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {new Date(event.created_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              {event.metadata && Object.keys(event.metadata).length > 0 ? (
                <p className="mt-1 truncate font-mono text-[10px] text-site-muted">
                  {JSON.stringify(event.metadata)}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

async function getStripePriceStatus(): Promise<StripePriceStatus> {
  const configuredPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? null;
  if (!configuredPriceId || !process.env.STRIPE_SECRET_KEY) {
    return {
      actual: null,
      driftMessages: [],
      errorMessage:
        "Stripe price verification is unavailable because STRIPE_PRO_MONTHLY_PRICE_ID or STRIPE_SECRET_KEY is missing.",
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
        getExpectedHostingPlanStripeSnapshot(configuredPriceId),
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
    webhookFailureResult,
    publishFailureResult,
    publishFallbackResult,
    authGoogleStartSuccessResult,
    authGoogleStartFailureResult,
    authCallbackSuccessResult,
    authCallbackFailureResult,
    rateLimitBlockedResult,
    processedWebhookResult,
    authCallbackFailureRowsResult,
    recentAuthResult,
    recentBillingResult,
    recentFailureResult,
    recentRateLimitResult,
    profilesResult,
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
      .eq("event_name", "auth.google.start.succeeded")
      .gte("created_at", sevenDayCutoff),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "auth.google.start.failed")
      .gte("created_at", sevenDayCutoff),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "auth.callback.succeeded")
      .gte("created_at", sevenDayCutoff),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "auth.callback.failed")
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
      .eq("event_name", "auth.callback.failed")
      .gte("created_at", sevenDayCutoff)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("events")
      .select("event_name, metadata, created_at, user_id")
      .in("event_name", [
        "auth.google.start.succeeded",
        "auth.google.start.failed",
        "auth.callback.succeeded",
        "auth.callback.failed",
      ])
      .order("created_at", { ascending: false })
      .limit(16),
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
        "auth.google.start.failed",
        "auth.callback.failed",
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

  const queryError =
    webhookFailureResult.error ??
    publishFailureResult.error ??
    publishFallbackResult.error ??
    authGoogleStartSuccessResult.error ??
    authGoogleStartFailureResult.error ??
    authCallbackSuccessResult.error ??
    authCallbackFailureResult.error ??
    rateLimitBlockedResult.error ??
    processedWebhookResult.error ??
    authCallbackFailureRowsResult.error ??
    recentAuthResult.error ??
    recentBillingResult.error ??
    recentFailureResult.error ??
    recentRateLimitResult.error ??
    profilesResult.error;
  if (queryError) {
    throw new Error("Unable to load system health.");
  }

  const webhookFailureCount = webhookFailureResult.count;
  const publishFailureCount = publishFailureResult.count;
  const publishFallbackCount = publishFallbackResult.count;
  const authGoogleStartSuccessCount = authGoogleStartSuccessResult.count;
  const authGoogleStartFailureCount = authGoogleStartFailureResult.count;
  const authCallbackSuccessCount = authCallbackSuccessResult.count;
  const authCallbackFailureCount = authCallbackFailureResult.count;
  const rateLimitBlockedCount = rateLimitBlockedResult.count;
  const processedWebhooks = (processedWebhookResult.data ?? []) as EventRow[];
  const authCallbackFailures = (authCallbackFailureRowsResult.data ?? []) as EventRow[];
  const recentAuthEvents = (recentAuthResult.data ?? []) as EventRow[];
  const recentBillingEvents = (recentBillingResult.data ?? []) as EventRow[];
  const recentFailureEvents = (recentFailureResult.data ?? []) as EventRow[];
  const recentRateLimitEvents = (recentRateLimitResult.data ?? []) as EventRow[];
  const legalIssues = getLegalConfigIssues();
  const adminUsers = buildAdminUserRows({
    profiles: ((profilesResult.data ?? []) as AdminProfileRow[]),
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
  const authFailureCodes = authCallbackFailures.reduce<Record<string, number>>((acc, event) => {
    const errorCode = typeof event.metadata?.error_code === "string" ? event.metadata.error_code : "unknown";
    acc[errorCode] = (acc[errorCode] ?? 0) + 1;
    return acc;
  }, {});
  const topAuthFailure = Object.entries(authFailureCodes)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0] ?? null;
  const authCallbackCompletionCount =
    (authCallbackSuccessCount ?? 0) + (authCallbackFailureCount ?? 0);
  const authCallbackFailureRate =
    authCallbackCompletionCount > 0
      ? Math.round(((authCallbackFailureCount ?? 0) / authCallbackCompletionCount) * 100)
      : null;
  const authCallbackSuccessRate =
    authCallbackCompletionCount > 0
      ? Math.round(((authCallbackSuccessCount ?? 0) / authCallbackCompletionCount) * 100)
      : null;
  const authStartCompletionRate =
    (authGoogleStartSuccessCount ?? 0) > 0
      ? Math.min(
          100,
          Math.round(
            ((authCallbackCompletionCount ?? 0) / (authGoogleStartSuccessCount ?? 0)) * 100,
          ),
        )
      : null;

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
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageIntro}>
          <p className="site-eyebrow">System / Health</p>
          <h1 className="site-page-title mt-2">System health</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-site-secondary">
            Check billing, publishing, sign-in callbacks, bot pressure, and launch
            configuration without digging through raw event names first.
          </p>
        </div>
      </header>

      {turnstileMissingInProduction ? (
        <div className="site-callout site-callout-warning mb-6 px-5 py-4 text-sm">
          Production is missing `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Email signup hardening is not active until Turnstile is configured in both the app env and Supabase Auth CAPTCHA settings.
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8 sm:gap-4">
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
        <section className="site-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="site-eyebrow text-[11px]">
                Stripe Price Health
              </p>
              <h2 className="site-panel-title mt-2">
                {HOSTING_PLAN_PRICE.productName}
              </h2>
              <p className="site-muted mt-1 text-sm">
                Expected {HOSTING_PLAN_PRICE.displayLabel}, {HOSTING_PLAN_PRICE.currency.toUpperCase()}, recurring {HOSTING_PLAN_PRICE.interval}.
              </p>
            </div>
            <span
              className={`site-badge px-3 py-1 text-[10px] ${
                stripePriceStatus.errorMessage || stripePriceStatus.driftMessages.length
                  ? "site-badge-warning"
                  : "site-badge-success"
              }`}
            >
              {stripePriceStatus.errorMessage || stripePriceStatus.driftMessages.length
                ? "Needs Attention"
                : "Aligned"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="border border-site-border bg-site-canvas-alt p-4">
              <p className="text-[11px] font-semibold text-site-muted">
                Latest Webhook Latency
              </p>
              <p className="mt-2 tabular-nums text-2xl text-site-action">
                {latestWebhookLatencyMs ?? 0} ms
              </p>
              <p className="mt-1 text-xs text-site-muted">
                Average over the last {processedWebhooks.length} processed webhook events: {averageWebhookLatencyMs} ms
              </p>
            </div>
            <div className="border border-site-border bg-site-canvas-alt p-4">
              <p className="text-[11px] font-semibold text-site-muted">
                Stripe Snapshot
              </p>
              {stripePriceStatus.actual ? (
                <div className="mt-2 space-y-1 text-sm text-site-secondary">
                  <p>Price ID: <span className="font-mono text-site-text">{stripePriceStatus.actual.id}</span></p>
                  <p>Amount: <span className="font-mono text-site-text">{stripePriceStatus.actual.amountCents ?? "missing"} cents</span></p>
                  <p>Product: <span className="font-mono text-site-text">{stripePriceStatus.actual.productName ?? "missing"}</span></p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-site-muted">
                  Stripe snapshot unavailable.
                </p>
              )}
            </div>
          </div>

          {stripePriceStatus.errorMessage ? (
            <p className="site-callout site-callout-warning mt-4 px-4 py-3 text-sm text-site-warning">
              {stripePriceStatus.errorMessage}
            </p>
          ) : stripePriceStatus.driftMessages.length ? (
            <div className="site-callout site-callout-warning mt-4 px-4 py-3 text-sm">
              <p className="font-semibold text-site-warning">Stripe pricing drift detected</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {stripePriceStatus.driftMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 border-l-4 border-site-success bg-site-canvas-alt px-4 py-3 text-sm text-site-success">
              Stripe matches the app&apos;s current hosting pricing contract.
            </p>
          )}
        </section>

        <div className="grid gap-4">
          <section className="site-panel p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="site-eyebrow text-[11px]">
                  Google Auth Health
                </p>
                <h2 className="site-panel-title mt-2">
                  OAuth callback completion
                </h2>
                <p className="site-muted mt-2 text-sm">
                  Tracks Google OAuth starts and callback outcomes so we can distinguish real auth regressions from abandoned sign-in attempts.
                </p>
              </div>
              <span
                className={`site-badge px-3 py-1 text-[10px] ${
                  (authCallbackFailureCount ?? 0) > 0
                    ? "site-badge-warning"
                    : "site-badge-success"
                }`}
              >
                {(authCallbackFailureCount ?? 0) > 0 ? "Needs Attention" : "Healthy"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="border border-site-border bg-site-canvas-alt p-4">
                <p className="text-[11px] font-semibold text-site-muted">
                  OAuth Starts (7d)
                </p>
                <p className="mt-2 tabular-nums text-2xl text-site-action">
                  {authGoogleStartSuccessCount ?? 0}
                </p>
                <p className="mt-1 text-xs text-site-muted">
                  Start failures: {authGoogleStartFailureCount ?? 0}
                </p>
              </div>
              <div className="border border-site-border bg-site-canvas-alt p-4">
                <p className="text-[11px] font-semibold text-site-muted">
                  Callback Success Rate (7d)
                </p>
                <p className="mt-2 tabular-nums text-2xl text-site-action">
                  {formatPercent(authCallbackSuccessRate)}
                </p>
                <p className="mt-1 text-xs text-site-muted">
                  Callback fail rate: {formatPercent(authCallbackFailureRate)}
                </p>
              </div>
              <div className="border border-site-border bg-site-canvas-alt p-4">
                <p className="text-[11px] font-semibold text-site-muted">
                  Callback Outcomes (7d)
                </p>
                <p className="mt-2 tabular-nums text-2xl text-site-action">
                  {authCallbackSuccessCount ?? 0}/{authCallbackCompletionCount}
                </p>
                <p className="mt-1 text-xs text-site-muted">
                  Successful callbacks / completed callbacks
                </p>
              </div>
              <div className="border border-site-border bg-site-canvas-alt p-4">
                <p className="text-[11px] font-semibold text-site-muted">
                  Start Completion Rate
                </p>
                <p className="mt-2 tabular-nums text-2xl text-site-action">
                  {formatPercent(authStartCompletionRate)}
                </p>
                <p className="mt-1 text-xs text-site-muted">
                  Completed callbacks / Google OAuth starts
                </p>
              </div>
            </div>

            {topAuthFailure ? (
              <div className="site-callout site-callout-warning mt-4 px-4 py-3 text-sm">
                <p className="font-semibold text-site-warning">
                  Most common callback failure: {topAuthFailure[0]} x{topAuthFailure[1]}
                </p>
                <p className="mt-2 text-site-secondary">
                  {topAuthFailure[0] === "google_signin_expired"
                    ? "Recent PKCE-style callback failures usually mean the browser returned without the verifier cookie state that started the OAuth flow."
                    : "Review the recent auth event feed for the specific callback error metadata and verify the same-browser OAuth return path."}
                </p>
              </div>
            ) : (
              <p className="mt-4 border-l-4 border-site-success bg-site-canvas-alt px-4 py-3 text-sm text-site-success">
                Google OAuth callbacks have completed without tracked failures in the sampled window.
              </p>
            )}
          </section>

          <section className="site-panel p-5 sm:p-6">
            <p className="site-eyebrow text-[11px]">
              Legal Configuration
            </p>
            <h2 className="site-panel-title mt-2">
              Public policy values
            </h2>
            <p className="site-muted mt-2 text-sm">
              These env-backed values are rendered on the public legal pages and should be finalized before broader launch.
            </p>

            {legalIssues.length === 0 ? (
              <p className="mt-4 border-l-4 border-site-success bg-site-canvas-alt px-4 py-3 text-sm text-site-success">
                Legal contact fields are fully configured.
              </p>
            ) : (
              <div className="site-callout site-callout-warning mt-4 px-4 py-3">
                <p className="text-sm font-semibold text-site-warning">
                  {legalIssues.length} legal env values are missing and public legal pages are still using placeholder fallback copy.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-site-secondary">
                  {legalIssues.map((issue) => (
                    <li key={issue.envKey}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 border border-site-border bg-site-canvas-alt p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold text-site-muted">
                  Signup CAPTCHA
                </p>
                <span
                  className={`site-badge px-3 py-1 text-[10px] ${
                    turnstileConfigured
                      ? "site-badge-success"
                      : "site-badge-warning"
                  }`}
                >
                  {turnstileConfigured ? "Configured" : "Missing"}
                </span>
              </div>
              <p className="mt-2 text-sm text-site-secondary">
                Email signup uses Cloudflare Turnstile only when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is present.
              </p>
              {!turnstileConfigured ? (
                <p className="mt-2 text-sm text-site-warning">
                  Add the site key to the app env and enable Cloudflare Turnstile in Supabase Auth CAPTCHA settings.
                </p>
              ) : null}
            </div>

            <div className="mt-4 border border-site-border bg-site-canvas-alt p-4">
              <p className="text-[11px] font-semibold text-site-muted">
                Production Auth Checklist
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-site-secondary">
                <li>Email confirmation remains enabled in Supabase Auth.</li>
                <li>Turnstile is configured in app env and Supabase Auth CAPTCHA settings.</li>
                <li>Supabase Auth provider rate limits stay at default or stricter values.</li>
                <li>Playwright and integration secrets remain staging-only.</li>
              </ul>
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <EventFeed
          title="Recent Auth Events"
          emptyLabel="No recent Google auth events recorded."
          events={recentAuthEvents}
        />
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
