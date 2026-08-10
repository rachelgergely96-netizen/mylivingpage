import { NextResponse } from "next/server";
import { getAccountAccessState } from "@/lib/account-access";
import { buildEditorPreviewPage } from "@/lib/demo-data";
import {
  EDITOR_LAYOUT_PREVIEW_PAGE_ID,
  isEditorPreviewEnabled,
} from "@/lib/editor-preview";
import { sanitizePageVariants } from "@/lib/page-variants";
import {
  PAGE_VISIBILITY_STATES,
  PAGE_VISIBILITY_WRITES,
} from "@/lib/page-visibility";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import { MAX_FREE_ARCHIVES, isThemeAllowed } from "@/lib/plans";
import {
  isPlainJsonObject,
  validatePageConfigPayload,
  validatePageWriteBodySize,
  validateResumeDataPayload,
} from "@/lib/security/page-write";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import { getTheme } from "@/themes/registry";
import { THEME_IDS } from "@/themes/types";

const routeTrustLevel = "authenticated_user";

/** Authenticate the caller and return their user id, or null */
async function getAuthUserId() {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  return user?.id ?? null;
}

/** Fetch a page by id using service-role (bypasses RLS), verifying ownership */
async function fetchOwnedPage(pageId: string, userId: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { data: page, error } = await supabase
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
    .maybeSingle();
  return { page, error };
}

export async function GET(_request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;

  // Local/CI editor-preview harness: serve fully-populated demo data for the
  // sentinel id so /dev/editor-preview renders without an auth session. Inert
  // in production (isEditorPreviewEnabled is false on Vercel).
  if (isEditorPreviewEnabled() && pageId === EDITOR_LAYOUT_PREVIEW_PAGE_ID) {
    return NextResponse.json(buildEditorPreviewPage().page);
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again to continue." },
      { status: 401 },
    );
  }

  const { page, error } = await fetchOwnedPage(pageId, userId);
  if (error) {
    return NextResponse.json(
      { error: "Page access is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });

  return NextResponse.json(page);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const bodySizeError = validatePageWriteBodySize(request);
  if (bodySizeError) {
    return NextResponse.json({ error: bodySizeError }, { status: 413 });
  }

  const { pageId } = await params;

  // Editor-preview harness saves nothing; acknowledge so the UI can settle back
  // to a clean "saved" state. Inert in production.
  if (isEditorPreviewEnabled() && pageId === EDITOR_LAYOUT_PREVIEW_PAGE_ID) {
    return NextResponse.json({ success: true });
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again to continue." },
      { status: 401 },
    );
  }

  const { page, error: pageLookupError } = await fetchOwnedPage(pageId, userId);
  if (pageLookupError) {
    return NextResponse.json(
      { error: "Page access is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });

  const parsedBody = await request.json().catch(() => null);
  if (!isPlainJsonObject(parsedBody)) {
    return NextResponse.json(
      { error: "We could not read that save. Refresh the page and try again." },
      { status: 400 },
    );
  }
  const body = parsedBody;

  if ("resume_data" in body) {
    const resumeDataError = validateResumeDataPayload(body.resume_data);
    if (resumeDataError) {
      return NextResponse.json({ error: resumeDataError }, { status: 400 });
    }
  }
  if (
    "theme_id" in body &&
    (typeof body.theme_id !== "string" ||
      !THEME_IDS.includes(body.theme_id as (typeof THEME_IDS)[number]))
  ) {
    return NextResponse.json({ error: "Invalid theme." }, { status: 400 });
  }
  if ("page_config" in body) {
    const pageConfigError = validatePageConfigPayload(body.page_config);
    if (pageConfigError) {
      return NextResponse.json({ error: pageConfigError }, { status: 400 });
    }
  }

  // Publication state is only ever written as one of the three whole states an
  // owner can choose; no caller may compose an arbitrary status/visibility pair.
  const changesPublicationState = "status" in body || "visibility" in body;
  const requestedVisibilityState = PAGE_VISIBILITY_STATES.find((state) => {
    const write = PAGE_VISIBILITY_WRITES[state];
    return body.status === write.status && body.visibility === write.visibility;
  });
  if (changesPublicationState && !requestedVisibilityState) {
    return NextResponse.json(
      {
        error:
          "Publication state must be live and public, live and link, or draft and private.",
      },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleSupabaseClient();
  if ("theme_id" in body || "page_config" in body) {
    const { data: profile, error: profileError } = await fetchProfileWithHostingAccess<{
      plan?: string | null;
    }>({
      supabase,
      select: "plan",
      matchField: "id",
      matchValue: userId,
    });
    if (profileError) {
      return NextResponse.json(
        { error: "Account access is temporarily unavailable." },
        { status: 503 },
      );
    }
    const accountAccess = getAccountAccessState({
      plan: profile?.plan ?? "spark",
      billing_cohort: profile?.billing_cohort ?? null,
      hosting_trial_started_at: profile?.hosting_trial_started_at ?? null,
      stripe_subscription_status: profile?.stripe_subscription_status ?? null,
      stripe_trial_ends_at: profile?.stripe_trial_ends_at ?? null,
    });

    if (
      typeof body.theme_id === "string" &&
      !isThemeAllowed(body.theme_id, accountAccess.allowedThemeIds)
    ) {
      const themeName = getTheme(body.theme_id)?.name ?? "chosen";
      return NextResponse.json(
        {
          error: `The ${themeName} theme is not included in your current plan. Choose another theme or upgrade to keep it.`,
        },
        { status: 403 },
      );
    }

    if (isPlainJsonObject(body.page_config)) {
      const submittedVariants = Array.isArray(body.page_config.variants)
        ? body.page_config.variants.length
        : 0;
      if (submittedVariants > accountAccess.variantLimit) {
        return NextResponse.json(
          { error: "This page configuration includes too many targeted versions." },
          { status: 403 },
        );
      }
      body.page_config = {
        ...body.page_config,
        variants: sanitizePageVariants(
          body.page_config.variants ?? [],
          accountAccess.variantLimit,
        ),
      };
    }
  }

  const allowed = ["resume_data", "theme_id", "page_config"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (requestedVisibilityState) {
    const write = PAGE_VISIBILITY_WRITES[requestedVisibilityState];
    updates.status = write.status;
    updates.visibility = write.visibility;
    // published_at marks when the page first went live and is preserved when it
    // goes offline, so a page can come back without looking newly created.
    updates.published_at =
      requestedVisibilityState === "offline"
        ? page.published_at
        : (page.published_at ?? new Date().toISOString());
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Auto-archive the current version before applying updates
  try {
    // Prune oldest archives if at the limit
    const { count } = await supabase
      .from("page_archives")
      .select("*", { count: "exact", head: true })
      .eq("page_id", pageId);

    if (count !== null && count >= MAX_FREE_ARCHIVES) {
      const { data: oldest } = await supabase
        .from("page_archives")
        .select("id")
        .eq("page_id", pageId)
        .order("archived_at", { ascending: true })
        .limit(count - MAX_FREE_ARCHIVES + 1);

      if (oldest?.length) {
        await supabase
          .from("page_archives")
          .delete()
          .in("id", oldest.map((a: { id: string }) => a.id));
      }
    }

    await supabase.from("page_archives").insert({
      page_id: pageId,
      owner_id: userId,
      resume_data: page.resume_data,
      theme_id: page.theme_id,
      slug: page.slug,
    });

    trackEvent(userId, "page.archive_created", { page_id: pageId });
  } catch {
    // Archive failure should not block the save
  }

  const { error } = await supabase.from("pages").update(updates).eq("id", pageId);
  if (error) {
    await trackEvent(userId, "page.update.failed", {
      page_id: pageId,
      error: error.message,
    });
    return NextResponse.json(
      { error: "Unable to update the page right now." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again to continue." },
      { status: 401 },
    );
  }

  const { page, error: pageLookupError } = await fetchOwnedPage(pageId, userId);
  if (pageLookupError) {
    return NextResponse.json(
      { error: "Page access is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });

  const supabase = createServiceRoleSupabaseClient();
  const { error: deleteError } = await supabase.from("pages").delete().eq("id", pageId);
  if (deleteError) return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });

  return NextResponse.json({ success: true });
}
