import { NextResponse } from "next/server";
import { getAccountAccessState } from "@/lib/account-access";
import { sanitizePageVariants } from "@/lib/page-variants";
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
    .eq("owner_id", userId)
    .maybeSingle();
  return { page, error };
}

export async function GET(_request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { page, error } = await fetchOwnedPage(pageId, userId);
  if (error) {
    return NextResponse.json(
      { error: "Page access is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  return NextResponse.json(page);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const bodySizeError = validatePageWriteBodySize(request);
  if (bodySizeError) {
    return NextResponse.json({ error: bodySizeError }, { status: 413 });
  }

  const { pageId } = await params;
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { page, error: pageLookupError } = await fetchOwnedPage(pageId, userId);
  if (pageLookupError) {
    return NextResponse.json(
      { error: "Page access is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const parsedBody = await request.json().catch(() => null);
  if (!isPlainJsonObject(parsedBody)) {
    return NextResponse.json({ error: "Invalid page payload." }, { status: 400 });
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

  const publishesPage = body.status === "live" && body.visibility === "public";
  const unpublishesPage = body.status === "draft" && body.visibility === "private";
  const changesPublicationState = "status" in body || "visibility" in body;
  if (changesPublicationState && !publishesPage && !unpublishesPage) {
    return NextResponse.json(
      {
        error:
          "Publication state must be either live and public, or draft and private.",
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
      return NextResponse.json(
        { error: `The "${body.theme_id}" theme is not available for this account.` },
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

  if (publishesPage || unpublishesPage) {
    updates.status = body.status;
    updates.visibility = body.visibility;
    updates.published_at = publishesPage ? new Date().toISOString() : page.published_at;
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
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { page, error: pageLookupError } = await fetchOwnedPage(pageId, userId);
  if (pageLookupError) {
    return NextResponse.json(
      { error: "Page access is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const supabase = createServiceRoleSupabaseClient();
  const { error: deleteError } = await supabase.from("pages").delete().eq("id", pageId);
  if (deleteError) return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });

  return NextResponse.json({ success: true });
}
