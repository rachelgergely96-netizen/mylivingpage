import { Buffer } from "node:buffer";
import { createClient } from "@supabase/supabase-js";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import Stripe from "stripe";
import { PUBLISH_CC_TRIAL_BILLING_COHORT } from "../../src/lib/account-access";
import type {
  AnalyticsSectionId,
  AnalyticsTargetKey,
} from "../../src/lib/analytics/constants";
import { DEMO_PAGES } from "../../src/lib/demo-data";
import { PRIVACY_VERSION, TERMS_VERSION } from "../../src/lib/legal/legal-version";
import type { PageConfig } from "../../src/types/resume";

export interface ProfileFixture {
  id: string;
  username: string;
  email: string | null;
  plan: string;
  billing_cohort: string | null;
  stripe_subscription_status: string | null;
  stripe_trial_ends_at: string | null;
  stripe_customer_id: string | null;
  avatar_url: string | null;
}

export interface PageFixture {
  id: string;
  owner_id: string | null;
  user_id: string | null;
  slug: string;
  views: number | null;
}

export interface PageEngagementState {
  pageViewId: string | null;
  engagedSeconds: number;
  maxScrollDepthPct: number;
  primarySection: AnalyticsSectionId | null;
  hadOutboundClick: boolean;
  interactions: Array<{
    target_key: AnalyticsTargetKey;
    target_label: string | null;
    click_count: number | null;
  }>;
}

export interface PageAnalyticsSeedInput {
  viewedAt: string;
  viewerIp: string;
  referrer?: string | null;
  userAgent?: string | null;
  country?: string | null;
  engagedSeconds?: number | null;
  maxScrollDepthPct?: number | null;
  primarySection?: AnalyticsSectionId | null;
  hadOutboundClick?: boolean;
  clicks?: Array<{
    targetKey: AnalyticsTargetKey;
    targetLabel?: string | null;
    clickCount?: number;
  }>;
}

const samplePage = DEMO_PAGES[0];
const signupEmailDomain = process.env.PLAYWRIGHT_SIGNUP_EMAIL_DOMAIN;
const expectSignupConfirmation =
  process.env.PLAYWRIGHT_EXPECT_SIGNUP_CONFIRMATION === "1";
const appAuthEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const appAuthPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;
const googleEmail = process.env.PLAYWRIGHT_GOOGLE_EMAIL;
const googlePassword = process.env.PLAYWRIGHT_GOOGLE_PASSWORD;
const supabaseUrl =
  process.env.PLAYWRIGHT_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey =
  process.env.PLAYWRIGHT_STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret =
  process.env.PLAYWRIGHT_STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;
const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9VHtQAAAAASUVORK5CYII=";

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const stripeClient =
  stripeSecretKey && stripeWebhookSecret
    ? new Stripe(stripeSecretKey, {
        apiVersion: "2026-02-25.clover",
        typescript: true,
      })
    : null;

export const canRunSignupConfirmation = Boolean(
  signupEmailDomain && expectSignupConfirmation,
);
export const canRunAuthenticatedFlows = Boolean(appAuthEmail && appAuthPassword);
export const canRunAdminFixtureFlows = Boolean(
  canRunAuthenticatedFlows && supabaseAdmin,
);
export const canRunBillingFlows = Boolean(canRunAdminFixtureFlows && stripeClient);
export const canRunGoogleOAuthFlows = Boolean(googleEmail && googlePassword);
export const canRunFailureInjectionFlows =
  process.env.ENABLE_E2E_FAILURE_INJECTION === "1" && canRunAuthenticatedFlows;

function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error("Missing Playwright Supabase service-role configuration.");
  }

  return supabaseAdmin;
}

function requireStripeClient() {
  if (!stripeClient || !stripeWebhookSecret) {
    throw new Error("Missing Playwright Stripe configuration.");
  }

  return { stripeClient, stripeWebhookSecret };
}

export function getGoogleCredentials() {
  return {
    email: googleEmail ?? "",
    password: googlePassword ?? "",
  };
}

export async function signIn(page: Page) {
  if (!appAuthEmail || !appAuthPassword) {
    throw new Error("Missing PLAYWRIGHT_TEST_EMAIL or PLAYWRIGHT_TEST_PASSWORD.");
  }

  await page.goto("/login");
  await page.getByPlaceholder("Email address").fill(appAuthEmail);
  await page.getByPlaceholder("Password").fill(appAuthPassword);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function fetchCurrentProfile(page: Page): Promise<ProfileFixture> {
  const response = await page.context().request.get("/api/profile");
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ProfileFixture;
}

export async function getProfileFixtureByEmail(): Promise<ProfileFixture> {
  if (!appAuthEmail) {
    throw new Error("Missing PLAYWRIGHT_TEST_EMAIL.");
  }

  const { data, error } = await requireSupabaseAdmin()
    .from("profiles")
    .select(
      "id, username, email, plan, billing_cohort, stripe_subscription_status, stripe_trial_ends_at, stripe_customer_id, avatar_url",
    )
    .eq("email", appAuthEmail)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to fetch Playwright profile.");
  }

  return data as ProfileFixture;
}

export async function setBillingStateForProfile(
  profileId: string,
  input: {
    plan: "spark" | "starter" | "pro";
    billingCohort?: string | null;
    stripeSubscriptionStatus?: string | null;
    stripeTrialEndsAt?: string | null;
    hostingTrialStartedAt?: string | null;
  },
) {
  const { error } = await requireSupabaseAdmin()
    .from("profiles")
    .update({
      plan: input.plan,
      billing_cohort: input.billingCohort ?? PUBLISH_CC_TRIAL_BILLING_COHORT,
      stripe_subscription_status: input.stripeSubscriptionStatus ?? null,
      stripe_trial_ends_at: input.stripeTrialEndsAt ?? null,
      hosting_trial_started_at: input.hostingTrialStartedAt ?? null,
    })
    .eq("id", profileId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function setPlanForProfile(
  profileId: string,
  plan: "spark" | "starter" | "pro",
) {
  await setBillingStateForProfile(profileId, {
    plan,
    stripeSubscriptionStatus:
      plan === "spark" ? null : "active",
    stripeTrialEndsAt: null,
  });
}

export async function clearPagesForProfile(profileId: string) {
  const { error } = await requireSupabaseAdmin()
    .from("pages")
    .delete()
    .or(`owner_id.eq.${profileId},user_id.eq.${profileId}`);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getPageFixtureByOwnerId(ownerId: string): Promise<PageFixture | null> {
  const { data, error } = await requireSupabaseAdmin()
    .from("pages")
    .select("id, owner_id, user_id, slug, views")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PageFixture | null) ?? null;
}

export async function ensureLivePageForProfile(profile: ProfileFixture): Promise<PageFixture> {
  const existing = await getPageFixtureByOwnerId(profile.id);

  const fields = {
    owner_id: profile.id,
    user_id: profile.id,
    slug: profile.username,
    status: "live",
    visibility: "public",
    title: `${samplePage.data.name} Living Page`,
    theme_id: samplePage.themeId,
    resume_data: samplePage.data,
    raw_resume: "",
    page_config: {},
    published_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await requireSupabaseAdmin()
      .from("pages")
      .update(fields)
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }

    return {
      ...existing,
      slug: profile.username,
    };
  }

  const { data, error } = await requireSupabaseAdmin()
    .from("pages")
    .insert(fields)
    .select("id, owner_id, user_id, slug, views")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to seed a live page.");
  }

  return data as PageFixture;
}

export async function setPageConfigForPage(pageId: string, pageConfig: PageConfig | null) {
  const { error } = await requireSupabaseAdmin()
    .from("pages")
    .update({ page_config: pageConfig })
    .eq("id", pageId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearPageViewState(pageId: string) {
  const supabase = requireSupabaseAdmin();
  const { error: deleteError } = await supabase.from("page_views").delete().eq("page_id", pageId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { error: updateError } = await supabase.from("pages").update({ views: 0 }).eq("id", pageId);
  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function getPageViewState(pageId: string) {
  const supabase = requireSupabaseAdmin();
  const [{ data: page, error: pageError }, { count, error: countError }] = await Promise.all([
    supabase.from("pages").select("views").eq("id", pageId).single(),
    supabase
      .from("page_views")
      .select("*", { count: "exact", head: true })
      .eq("page_id", pageId),
  ]);

  if (pageError) {
    throw new Error(pageError.message);
  }
  if (countError) {
    throw new Error(countError.message);
  }

  return {
    pageViews: (page as { views?: number | null }).views ?? 0,
    pageViewRows: count ?? 0,
  };
}

export async function getLatestPageEngagementState(
  pageId: string,
): Promise<PageEngagementState> {
  const supabase = requireSupabaseAdmin();
  const { data: latestPageView, error: latestViewError } = await supabase
    .from("page_views")
    .select(
      "id, engaged_seconds, max_scroll_depth_pct, primary_section, had_outbound_click, viewed_at",
    )
    .eq("page_id", pageId)
    .order("viewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestViewError) {
    throw new Error(latestViewError.message);
  }

  if (!latestPageView) {
    return {
      pageViewId: null,
      engagedSeconds: 0,
      maxScrollDepthPct: 0,
      primarySection: null,
      hadOutboundClick: false,
      interactions: [],
    };
  }

  const { data: interactions, error: interactionError } = await supabase
    .from("page_interactions")
    .select("target_key, target_label, click_count")
    .eq("page_view_id", latestPageView.id)
    .order("created_at", { ascending: false });

  if (interactionError) {
    throw new Error(interactionError.message);
  }

  return {
    pageViewId: latestPageView.id,
    engagedSeconds: latestPageView.engaged_seconds ?? 0,
    maxScrollDepthPct: latestPageView.max_scroll_depth_pct ?? 0,
    primarySection: (latestPageView.primary_section as AnalyticsSectionId | null) ?? null,
    hadOutboundClick: Boolean(latestPageView.had_outbound_click),
    interactions:
      (interactions as Array<{
        target_key: AnalyticsTargetKey;
        target_label: string | null;
        click_count: number | null;
      }>) ?? [],
  };
}

export async function seedPageAnalyticsHistory(
  pageId: string,
  rows: PageAnalyticsSeedInput[],
) {
  const supabase = requireSupabaseAdmin();

  for (const row of rows) {
    const { data: insertedView, error: insertError } = await supabase
      .from("page_views")
      .insert({
        page_id: pageId,
        viewer_ip: row.viewerIp,
        referrer: row.referrer ?? null,
        user_agent: row.userAgent ?? null,
        country: row.country ?? null,
        viewed_at: row.viewedAt,
        engaged_seconds: row.engagedSeconds ?? null,
        max_scroll_depth_pct: row.maxScrollDepthPct ?? null,
        primary_section: row.primarySection ?? null,
        had_outbound_click: row.hadOutboundClick ?? Boolean(row.clicks?.length),
      })
      .select("id")
      .single();

    if (insertError || !insertedView) {
      throw new Error(insertError?.message ?? "Unable to seed page view.");
    }

    if (row.clicks?.length) {
      const { error: interactionError } = await supabase.from("page_interactions").insert(
        row.clicks.map((click) => ({
          page_id: pageId,
          page_view_id: insertedView.id,
          target_key: click.targetKey,
          target_label: click.targetLabel ?? null,
          click_count: click.clickCount ?? 1,
        })),
      );

      if (interactionError) {
        throw new Error(interactionError.message);
      }
    }
  }

  const { error: updateError } = await supabase
    .from("pages")
    .update({ views: rows.length })
    .eq("id", pageId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function uploadAvatarViaApi(
  page: Page,
  options?: { injectFailure?: boolean },
) {
  return page.context().request.post("/api/avatar", {
    headers: options?.injectFailure
      ? {
          "x-test-avatar-failure": "before-upload",
        }
      : undefined,
    multipart: {
      file: {
        name: "avatar.png",
        mimeType: "image/png",
        buffer: Buffer.from(tinyPngBase64, "base64"),
      },
    },
  });
}

export async function removeAvatarViaApi(page: Page) {
  return page.context().request.delete("/api/avatar");
}

export async function expectAvatarToResolveTo(page: Page, expectedUrl: string) {
  const avatar = page.getByAltText("Avatar");
  await expect
    .poll(async () => {
      const renderedSrc = await avatar.getAttribute("src");
      if (!renderedSrc) {
        return null;
      }

      if (renderedSrc.startsWith("/_next/image")) {
        const resolved = new URL(renderedSrc, page.url());
        return resolved.searchParams.get("url");
      }

      return renderedSrc;
    })
    .toBe(expectedUrl);
}

export function buildStripeEvent(
  type: Stripe.Event.Type,
  dataObject: Record<string, unknown>,
): Stripe.Event {
  return {
    id: `evt_${type.replace(/\./g, "_")}_${Date.now()}`,
    object: "event",
    api_version: "2026-02-25.clover",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: dataObject,
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
    type,
  } as unknown as Stripe.Event;
}

export async function sendStripeWebhook(
  request: APIRequestContext,
  event: Stripe.Event,
) {
  const { stripeClient, stripeWebhookSecret } = requireStripeClient();
  const payload = JSON.stringify(event);
  const signature = stripeClient.webhooks.generateTestHeaderString({
    payload,
    secret: stripeWebhookSecret,
  });

  const response = await request.post("/api/webhooks/stripe", {
    data: Buffer.from(payload),
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
  });

  const responseText = await response.text();
  expect(
    response.ok(),
    `Stripe webhook failed with ${response.status()}: ${responseText}`,
  ).toBeTruthy();
  return response;
}

export async function buildCheckoutCompletedEvent(profile: ProfileFixture): Promise<Stripe.Event> {
  return buildCheckoutCompletedEventForPlan(profile, "starter");
}

export async function buildCheckoutCompletedEventForPlan(
  profile: ProfileFixture,
  selectedPlan: "starter" | "pro",
): Promise<Stripe.Event> {
  return buildStripeEvent("checkout.session.completed", {
    id: `cs_test_${Date.now()}`,
    object: "checkout.session",
    created: Math.floor(Date.now() / 1000),
    customer: profile.stripe_customer_id,
    metadata: {
      supabase_user_id: profile.id,
      selected_plan: selectedPlan,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
    },
  });
}

function getStripePriceIdForPlan(plan: "starter" | "pro") {
  const priceId =
    plan === "starter"
      ? process.env.STRIPE_STARTER_MONTHLY_PRICE_ID
      : process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

  if (!priceId) {
    throw new Error(`Missing Stripe price id for ${plan}.`);
  }

  return priceId;
}

export async function buildSubscriptionUpdatedEvent(
  profile: ProfileFixture,
  input: {
    plan: "starter" | "pro";
    status: "trialing" | "active" | "past_due" | "canceled";
    trialEnd?: string | null;
    eventType?: "customer.subscription.created" | "customer.subscription.updated";
  },
): Promise<Stripe.Event> {
  return buildStripeEvent(input.eventType ?? "customer.subscription.updated", {
    id: `sub_test_${Date.now()}`,
    object: "subscription",
    customer: profile.stripe_customer_id,
    status: input.status,
    trial_end: input.trialEnd ? Math.floor(new Date(input.trialEnd).getTime() / 1000) : null,
    items: {
      data: [
        {
          price: {
            id: getStripePriceIdForPlan(input.plan),
          },
        },
      ],
    },
  });
}

export async function buildSubscriptionDeletedEvent(
  profile: ProfileFixture,
  plan: "starter" | "pro" = "pro",
): Promise<Stripe.Event> {
  return buildStripeEvent("customer.subscription.deleted", {
    id: `sub_test_${Date.now()}`,
    object: "subscription",
    customer: profile.stripe_customer_id,
    status: "canceled",
    items: {
      data: [
        {
          price: {
            id: getStripePriceIdForPlan(plan),
          },
        },
      ],
    },
  });
}

export function getSignupEmailDomain() {
  return signupEmailDomain ?? "";
}
