import { NextResponse } from "next/server";
import { getAccountAccessState } from "@/lib/account-access";
import {
  EDITOR_LAYOUT_PREVIEW_PAGE_ID,
  isEditorPreviewEnabled,
} from "@/lib/editor-preview";
import { syncPageHostingState } from "@/lib/hosting-state";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import { isPlainJsonObject } from "@/lib/security/page-write";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";

const routeTrustLevel = "authenticated_user";

/** GET /api/profile — fetch the authenticated user's profile */
export async function GET(request: Request) {
  const isCredentialFreeEditorPreview =
    isEditorPreviewEnabled() &&
    request.headers.get("x-editor-preview-page") ===
      EDITOR_LAYOUT_PREVIEW_PAGE_ID;
  if (isCredentialFreeEditorPreview) {
    const plan = "spark";
    return NextResponse.json({
      id: EDITOR_LAYOUT_PREVIEW_PAGE_ID,
      username: "preview",
      full_name: "Avery Sample",
      email: null,
      avatar_url: null,
      plan,
      created_at: "2026-01-01T00:00:00.000Z",
      billing_cohort: "legacy_freemium",
      hosting_trial_started_at: null,
      stripe_subscription_status: null,
      stripe_trial_ends_at: null,
      accountAccess: getAccountAccessState({
        plan,
        billing_cohort: "legacy_freemium",
      }),
      latestPage: null,
      hasLivingPage: true,
      signup_referrer: null,
      hasPassword: false,
    });
  }

  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again to continue." },
      { status: 401 },
    );
  }

  const supabase = createServiceRoleSupabaseClient();
  const { data: profile, error } = await fetchProfileWithHostingAccess<{
    id: string;
    username: string | null;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    plan: string | null;
    created_at: string;
    signup_referrer?: string | null;
  }>({
    supabase,
    select:
      "id, username, full_name, email, avatar_url, plan, created_at, signup_referrer",
    matchField: "id",
    matchValue: user.id,
    single: true,
  });

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Include auth provider info so the UI knows whether to show password change
  const providers = user.app_metadata?.providers as string[] | undefined;
  const hasPassword = providers?.includes("email") ?? !!user.email;
  const { data: latestPage, error: latestPageError } = await supabase
    .from("pages")
    .select(
      "id, status, visibility, search_indexable, published_at, owner_id, user_id",
    )
    .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const syncedPage = latestPage
    ? await syncPageHostingState(supabase, latestPage, {
        plan: profile.plan,
        billing_cohort: profile.billing_cohort,
        hosting_trial_started_at: profile.hosting_trial_started_at,
        stripe_subscription_status: profile.stripe_subscription_status,
        stripe_trial_ends_at: profile.stripe_trial_ends_at,
      })
    : null;

  return NextResponse.json({
    ...profile,
    accountAccess: getAccountAccessState({
      plan: profile.plan,
      billing_cohort: profile.billing_cohort,
      hosting_trial_started_at: profile.hosting_trial_started_at,
      stripe_subscription_status: profile.stripe_subscription_status,
      stripe_trial_ends_at: profile.stripe_trial_ends_at,
    }),
    latestPage: syncedPage?.page ?? null,
    hasLivingPage: latestPageError ? null : Boolean(latestPage),
    signup_referrer:
      profile.signup_referrer ?? ((user.user_metadata?.signup_referrer as string | undefined) ?? null),
    hasPassword,
  });
}

/** PATCH /api/profile — update full_name */
export async function PATCH(request: Request) {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again to continue." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!isPlainJsonObject(body)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.full_name === "string") {
    const name = body.full_name.trim();
    if (name.length > 100) {
      return NextResponse.json({ error: "Name must be 100 characters or fewer." }, { status: 400 });
    }
    updates.full_name = name;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });

  return NextResponse.json({ success: true });
}
