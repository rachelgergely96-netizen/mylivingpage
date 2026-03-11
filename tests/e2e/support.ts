import { Buffer } from "node:buffer";
import { createClient } from "@supabase/supabase-js";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import Stripe from "stripe";
import { DEMO_PAGES } from "../../src/lib/demo-data";
import { PRIVACY_VERSION, TERMS_VERSION } from "../../src/lib/legal/legal-version";

export interface ProfileFixture {
  id: string;
  username: string;
  email: string | null;
  plan: string;
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
    .select("id, username, email, plan, stripe_customer_id, avatar_url")
    .eq("email", appAuthEmail)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to fetch Playwright profile.");
  }

  return data as ProfileFixture;
}

export async function setPlanForProfile(profileId: string, plan: "spark" | "pro") {
  const { error } = await requireSupabaseAdmin()
    .from("profiles")
    .update({ plan })
    .eq("id", profileId);

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
    data: payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response;
}

export async function buildCheckoutCompletedEvent(profile: ProfileFixture): Promise<Stripe.Event> {
  return buildStripeEvent("checkout.session.completed", {
    id: `cs_test_${Date.now()}`,
    object: "checkout.session",
    created: Math.floor(Date.now() / 1000),
    customer: profile.stripe_customer_id,
    metadata: {
      supabase_user_id: profile.id,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
    },
  });
}

export async function buildSubscriptionDeletedEvent(profile: ProfileFixture): Promise<Stripe.Event> {
  return buildStripeEvent("customer.subscription.deleted", {
    id: `sub_test_${Date.now()}`,
    object: "subscription",
    customer: profile.stripe_customer_id,
    status: "canceled",
  });
}

export function getSignupEmailDomain() {
  return signupEmailDomain ?? "";
}
