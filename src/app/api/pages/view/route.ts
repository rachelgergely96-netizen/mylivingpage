import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isPubliclyAvailablePage, syncPageHostingState } from "@/lib/hosting-state";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, hashSecurityIdentifier } from "@/lib/security/request";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

const routeTrustLevel = "public_write";
const MAX_VIEW_BODY_BYTES = 8 * 1024;
const SHARE_SCENARIOS = new Set([
  "application_follow_up",
  "recruiter_reply",
  "connection",
]);

function getOptionalText(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : undefined;
}

export async function POST(request: Request) {
  try {
    const declaredLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_VIEW_BODY_BYTES) {
      return NextResponse.json({ error: "View payload is too large." }, { status: 413 });
    }

    const rawBody = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const pageId = getOptionalText(rawBody?.pageId, 64);
    const variantId = getOptionalText(rawBody?.variantId, 80);
    const variantLabel = getOptionalText(rawBody?.variantLabel, 120);
    const shareScenario = getOptionalText(rawBody?.shareScenario, 40);
    const shareLinkId = getOptionalText(rawBody?.shareLinkId, 80);
    if (
      !pageId ||
      !/^[a-z0-9-]+$/i.test(pageId) ||
      [variantId, variantLabel, shareScenario, shareLinkId].some(
        (value) => value === undefined,
      ) ||
      (typeof shareScenario === "string" && !SHARE_SCENARIOS.has(shareScenario))
    ) {
      return NextResponse.json({ error: "Invalid view payload." }, { status: 400 });
    }

    try {
      const rateLimit = await enforceRateLimit({
        request,
        policy: "public_page_view",
        route: "/api/pages/view",
      });
      if (rateLimit.limited) {
        return rateLimit.response;
      }
    } catch {
      return NextResponse.json(
        { error: "Page view tracking is temporarily unavailable." },
        { status: 503 },
      );
    }

    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const supabase = createServiceRoleSupabaseClient();
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("id, user_id, owner_id, status, visibility")
      .eq("id", pageId)
      .maybeSingle();
    if (pageError) {
      throw new Error(pageError.message);
    }

    if (!page || !isPubliclyAvailablePage(page)) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const pageOwnerId = page.owner_id ?? page.user_id ?? null;
    const ownerProfileResult = pageOwnerId
      ? await fetchProfileWithHostingAccess<{
          plan?: string | null;
        }>({
          supabase,
          select: "plan",
          matchField: "id",
          matchValue: pageOwnerId,
        })
      : { data: null };
    const ownerProfile = ownerProfileResult.data;
    if ("error" in ownerProfileResult && ownerProfileResult.error) {
      throw new Error(ownerProfileResult.error.message);
    }

    const syncedPage = await syncPageHostingState(supabase, page, {
      plan: ownerProfile?.plan ?? null,
      billing_cohort: ownerProfile?.billing_cohort ?? null,
      hosting_trial_started_at: ownerProfile?.hosting_trial_started_at ?? null,
    });

    if (syncedPage.changed || !isPubliclyAvailablePage(syncedPage.page)) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    if (user?.id && pageOwnerId === user.id) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const headersList = await headers();
    const rawIp = getClientIp(headersList) ?? "unknown";
    const hashedIp = hashSecurityIdentifier(rawIp);
    const country = headersList.get("x-vercel-ip-country") ?? null;

    const dedupeCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentView, error: recentViewError } = await supabase
      .from("page_views")
      .select("id")
      .eq("page_id", pageId)
      .eq("viewer_ip", hashedIp)
      .gte("viewed_at", dedupeCutoff);
    if (recentViewError) {
      throw new Error(recentViewError.message);
    }

    if (recentView && recentView.length > 0) {
      await trackEvent(pageOwnerId, "page.share_link.opened", {
        page_id: pageId,
        page_view_id: recentView[0].id,
        variant_id: variantId,
        variant_label: variantLabel,
        scenario: shareScenario,
        share_link_id: shareLinkId,
        deduped: true,
      });
      return NextResponse.json({
        ok: true,
        deduped: true,
        pageViewId: recentView[0].id,
      });
    }

    const { data: insertedView, error: insertError } = await supabase
      .from("page_views")
      .insert({
        page_id: pageId,
        viewer_ip: hashedIp,
        referrer: headersList.get("referer"),
        user_agent: headersList.get("user-agent"),
        country,
      })
      .select("id")
      .single();

    if (insertError || !insertedView) {
      throw new Error(insertError?.message ?? "Unable to create page view.");
    }

    const { error: incrementError } = await supabase.rpc("increment_page_views", {
      page_id: pageId,
    });
    if (incrementError) {
      const { error: rollbackError } = await supabase
        .from("page_views")
        .delete()
        .eq("id", insertedView.id);
      if (rollbackError) {
        throw new Error(
          `${incrementError.message}; page-view rollback failed: ${rollbackError.message}`,
        );
      }
      throw new Error(incrementError.message);
    }
    await trackEvent(pageOwnerId, "page.share_link.opened", {
      page_id: pageId,
      page_view_id: insertedView.id,
      variant_id: variantId,
      variant_label: variantLabel,
      scenario: shareScenario,
      share_link_id: shareLinkId,
      deduped: false,
    });

    return NextResponse.json({ ok: true, pageViewId: insertedView.id });
  } catch (error) {
    console.error("page.view.failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json(
      { error: "Unable to track this page view right now." },
      { status: 500 },
    );
  }
}
