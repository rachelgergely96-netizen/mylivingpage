import { NextResponse } from "next/server";
import {
  PUBLISH_CC_TRIAL_BILLING_COHORT,
  getAccountAccessState,
} from "@/lib/account-access";
import { sanitizePageVariants } from "@/lib/page-variants";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import { isThemeAllowed } from "@/lib/plans";
import {
  MAX_PAGE_TITLE_LENGTH,
  MAX_RAW_RESUME_CHARACTERS,
  isPlainJsonObject,
  validatePageConfigPayload,
  validatePageWriteBodySize,
  validateResumeDataPayload,
} from "@/lib/security/page-write";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import { usernameFromEmail } from "@/lib/usernames";
import { getTheme } from "@/themes/registry";
import { THEME_IDS } from "@/themes/types";

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
  const { data: existing, error: existingLookupError } = await supabase
    .from("pages")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (existingLookupError) {
    return {
      error: existingLookupError,
      existingId: null,
      pageId: null,
    };
  }

  const { error } = await supabase.from("pages").upsert(fields, { onConflict: "owner_id" });
  if (error) {
    return { error, existingId: existing?.id ?? null, pageId: existing?.id ?? null };
  }

  const { data: persisted, error: persistedLookupError } = await supabase
    .from("pages")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (persistedLookupError || !persisted?.id) {
    return {
      error:
        persistedLookupError ??
        new Error("Published page could not be read after it was saved."),
      existingId: existing?.id ?? null,
      pageId: null,
    };
  }

  return {
    error: null,
    existingId: existing?.id ?? null,
    pageId: persisted.id,
  };
}

export async function POST(request: Request) {
  try {
    const bodySizeError = validatePageWriteBodySize(request);
    if (bodySizeError) {
      return NextResponse.json({ error: bodySizeError }, { status: 413 });
    }

    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Your session has expired. Sign in again to continue." },
        { status: 401 },
      );
    }

    const parsedBody = await request.json().catch(() => null);
    if (!isPlainJsonObject(parsedBody)) {
      return NextResponse.json(
        { error: "We could not read that save. Refresh the page and try again." },
        { status: 400 },
      );
    }
    const body = parsedBody as unknown as Partial<PublishBody>;
    if (!body.theme_id || !body.resume_data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (
      typeof body.theme_id !== "string" ||
      !THEME_IDS.includes(body.theme_id as (typeof THEME_IDS)[number])
    ) {
      return NextResponse.json({ error: "Invalid theme." }, { status: 400 });
    }

    const resumeDataError = validateResumeDataPayload(body.resume_data);
    if (resumeDataError) {
      return NextResponse.json({ error: resumeDataError }, { status: 400 });
    }
    if (
      body.title !== undefined &&
      (typeof body.title !== "string" || body.title.length > MAX_PAGE_TITLE_LENGTH)
    ) {
      return NextResponse.json({ error: "Page title is invalid." }, { status: 400 });
    }
    if (
      body.raw_resume !== undefined &&
      (typeof body.raw_resume !== "string" ||
        body.raw_resume.length > MAX_RAW_RESUME_CHARACTERS)
    ) {
      return NextResponse.json({ error: "Raw résumé text is invalid." }, { status: 400 });
    }
    if (body.page_config !== undefined) {
      const pageConfigError = validatePageConfigPayload(body.page_config);
      if (pageConfigError) {
        return NextResponse.json({ error: pageConfigError }, { status: 400 });
      }
    }

    const supabase = createServiceRoleSupabaseClient();
    const {
      data: profile,
      error: profileError,
      schema: profileSchema,
    } =
      await fetchProfileWithHostingAccess<{
        plan?: string | null;
        username?: string | null;
      }>({
        supabase,
        select: "plan, username",
        matchField: "id",
        matchValue: user.id,
      });
    if (profileError) {
      await trackEvent(user.id, "page.publish.failed", {
        error: profileError.message,
        stage: "profile-lookup",
      });
      return NextResponse.json(
        { error: "Account access is temporarily unavailable." },
        { status: 503 },
      );
    }

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
      const themeName = getTheme(body.theme_id)?.name ?? "chosen";
      return NextResponse.json(
        {
          error: `The ${themeName} theme is not included in your current plan. Choose another theme or upgrade to keep it.`,
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
              ? "This streamlined résumé does not include targeted versions."
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

      const { error: profileUpsertError } = await supabase.from("profiles").upsert(profileUpsertFields, {
        onConflict: "id",
      });
      if (profileUpsertError) {
        await trackEvent(user.id, "page.publish.failed", {
          error: profileUpsertError.message,
          stage: "profile-upsert",
        });
        return NextResponse.json(
          { error: "Unable to prepare your profile for publishing." },
          { status: 500 },
        );
      }
    }

    const allFields: Record<string, unknown> = {
      user_id: user.id,
      owner_id: user.id,
      slug: username,
      status: "live",
      visibility: "public",
      // Explicit: this upserts over an existing row, which may have been left
      // unindexable when it went offline. Publishing from the create flow means
      // a public page, not a silently link-only one.
      search_indexable: true,
      title: body.title?.trim() || "My Living Page",
      theme_id: body.theme_id,
      resume_data: body.resume_data,
      // Raw imports can contain private details that users removed during review.
      // Persist only the structured, user-approved page data.
      raw_resume: "",
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
      return NextResponse.json(
        { error: "Unable to publish the page right now." },
        { status: 500 },
      );
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
      { error: "Unable to publish the page right now." },
      { status: 500 },
    );
  }
}
