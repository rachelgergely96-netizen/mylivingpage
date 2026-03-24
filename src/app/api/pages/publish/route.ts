import { NextResponse } from "next/server";
import {
  TRIAL_HOSTING_BILLING_COHORT,
  getAccountAccessState,
} from "@/lib/account-access";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import { FREE_THEMES, isPremiumTheme } from "@/lib/plans";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import { usernameFromEmail } from "@/lib/usernames";

const routeTrustLevel = "authenticated_user";

interface PublishBody {
  title: string;
  theme_id: string;
  resume_data: unknown;
  raw_resume: string;
  page_config?: Record<string, unknown>;
}

async function persistPageRecord(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  userId: string,
  fields: Record<string, unknown>,
) {
  const { data: existing } = await supabase
    .from("pages")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  const { error } = await supabase.from("pages").upsert(fields, { onConflict: "owner_id" });
  if (error) {
    return { error, existingId: existing?.id ?? null, pageId: existing?.id ?? null };
  }

  const { data: persisted } = await supabase
    .from("pages")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  return {
    error: null,
    existingId: existing?.id ?? null,
    pageId: persisted?.id ?? existing?.id ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<PublishBody>;
    if (!body.theme_id || !body.resume_data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    const { data: profile, schema: profileSchema } =
      await fetchProfileWithHostingAccess<{
        plan?: string | null;
        username?: string | null;
      }>({
        supabase,
        select: "plan, username",
        matchField: "id",
        matchValue: user.id,
      });

    const userPlan = profile?.plan ?? "spark";
    const accountAccess = getAccountAccessState({
      plan: userPlan,
      billing_cohort: profile?.billing_cohort ?? null,
      hosting_trial_started_at: profile?.hosting_trial_started_at ?? null,
    });
    const username = profile?.username ?? usernameFromEmail(user.email);

    if (!accountAccess.themeFeaturesUnlocked && isPremiumTheme(body.theme_id)) {
      return NextResponse.json(
        { error: `The "${body.theme_id}" theme requires hosting access. Core themes: ${FREE_THEMES.join(", ")}.` },
        { status: 403 },
      );
    }

    if (accountAccess.requiresSubscription) {
      return NextResponse.json(
        {
          error: "Your free month of live hosting has ended. Continue hosting for $9.99/mo from settings to bring the page back online.",
          code: "subscription_required",
          redirectTo: "/dashboard/settings",
        },
        { status: 402 },
      );
    }

    const now = new Date().toISOString();
    const shouldStartHostingTrial =
      !accountAccess.isLegacyAccount &&
      !accountAccess.hasPaidSubscription &&
      !accountAccess.hasStartedFreeMonth;

    if (!profile?.username) {
      const profileUpsertFields: Record<string, unknown> = {
        id: user.id,
        username,
        email: user.email,
        plan: userPlan,
      };

      if (profileSchema === "full") {
        profileUpsertFields.billing_cohort =
          profile?.billing_cohort ?? TRIAL_HOSTING_BILLING_COHORT;
        profileUpsertFields.hosting_trial_started_at = shouldStartHostingTrial
          ? now
          : profile?.hosting_trial_started_at ?? null;
      }

      await supabase.from("profiles").upsert(profileUpsertFields, {
        onConflict: "id",
      });
    } else if (shouldStartHostingTrial) {
      if (profileSchema === "full") {
        const { error: trialStartError } = await supabase
          .from("profiles")
          .update({ hosting_trial_started_at: now })
          .eq("id", user.id);

        if (trialStartError) {
          throw new Error(trialStartError.message);
        }
      }
    }

    const allFields: Record<string, unknown> = {
      user_id: user.id,
      owner_id: user.id,
      slug: username,
      status: "live",
      visibility: "public",
      title: body.title || "My Living Page",
      theme_id: body.theme_id,
      resume_data: body.resume_data,
      raw_resume: body.raw_resume ?? "",
      published_at: now,
    };

    if (body.page_config !== undefined) {
      allFields.page_config = body.page_config;
    }

    const { error, existingId, pageId } = await persistPageRecord(supabase, user.id, allFields);

    if (error) {
      await trackEvent(user.id, "page.publish.failed", {
        slug: username,
        theme_id: body.theme_id,
        error: error.message,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await trackEvent(user.id, "page.publish", {
      theme_id: body.theme_id,
      slug: username,
      is_update: Boolean(existingId),
    });

    return NextResponse.json({ slug: username, pageId });
  } catch (err) {
    await trackEvent(null, "page.publish.failed", {
      error: err instanceof Error ? err.message : "Publish failed",
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 },
    );
  }
}
