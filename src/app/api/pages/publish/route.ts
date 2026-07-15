import { NextResponse } from "next/server";
import {
  PUBLISH_CC_TRIAL_BILLING_COHORT,
  getAccountAccessState,
} from "@/lib/account-access";
import { sanitizePageVariants } from "@/lib/page-variants";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import { isThemeAllowed } from "@/lib/plans";
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
      stripe_subscription_status: profile?.stripe_subscription_status ?? null,
      stripe_trial_ends_at: profile?.stripe_trial_ends_at ?? null,
    });
    const username = profile?.username ?? usernameFromEmail(user.email);

    if (!isThemeAllowed(body.theme_id, accountAccess.allowedThemeIds)) {
      return NextResponse.json(
        {
          error: `The "${body.theme_id}" theme is not available for this account.`,
        },
        { status: 403 },
      );
    }

    const variants = sanitizePageVariants(
      (body.page_config as { variants?: unknown } | undefined)?.variants ?? [],
      accountAccess.variantLimit,
    );
    const submittedVariants = Array.isArray((body.page_config as { variants?: unknown } | undefined)?.variants)
      ? ((body.page_config as { variants?: unknown[] } | undefined)?.variants?.length ?? 0)
      : 0;

    if (submittedVariants > accountAccess.variantLimit) {
      return NextResponse.json(
        {
          error:
            accountAccess.variantLimit === 0
              ? "This streamlined resume does not include targeted versions."
              : `This account supports ${accountAccess.variantLimit} targeted version${accountAccess.variantLimit === 1 ? "" : "s"}.`,
        },
        { status: 403 },
      );
    }

    const now = new Date().toISOString();

    if (!profile?.username) {
      const profileUpsertFields: Record<string, unknown> = {
        id: user.id,
        username,
        email: user.email,
        plan: userPlan,
      };

      if (profileSchema === "full") {
        profileUpsertFields.billing_cohort =
          profile?.billing_cohort ?? PUBLISH_CC_TRIAL_BILLING_COHORT;
        profileUpsertFields.hosting_trial_started_at =
          profile?.hosting_trial_started_at ?? null;
        profileUpsertFields.stripe_subscription_status =
          profile?.stripe_subscription_status ?? null;
        profileUpsertFields.stripe_trial_ends_at =
          profile?.stripe_trial_ends_at ?? null;
      }

      await supabase.from("profiles").upsert(profileUpsertFields, {
        onConflict: "id",
      });
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
      allFields.page_config = {
        ...(body.page_config ?? {}),
        variants,
      };
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
