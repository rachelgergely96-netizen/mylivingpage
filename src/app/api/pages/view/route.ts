import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { syncPageHostingState } from "@/lib/hosting-state";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getClientIp, hashSecurityIdentifier } from "@/lib/security/request";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

const routeTrustLevel = "public_write";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pageId?: string;
      variantId?: string | null;
      variantLabel?: string | null;
      shareScenario?: string | null;
      shareLinkId?: string | null;
    };
    if (!body.pageId) {
      return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
    }

    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const supabase = createServiceRoleSupabaseClient();
    const { data: page } = await supabase
      .from("pages")
      .select("id, user_id, owner_id, status, visibility")
      .eq("id", body.pageId)
      .maybeSingle();

    if (!page || (page.status !== "live" && page.visibility !== "public")) {
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

    const syncedPage = await syncPageHostingState(supabase, page, {
      plan: ownerProfile?.plan ?? null,
      billing_cohort: ownerProfile?.billing_cohort ?? null,
      hosting_trial_started_at: ownerProfile?.hosting_trial_started_at ?? null,
    });

    if (syncedPage.changed || (syncedPage.page.status !== "live" && syncedPage.page.visibility !== "public")) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    if (user?.id && pageOwnerId === user.id) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const rateLimit = await enforceRateLimit({
      request,
      policy: "public_page_view",
      route: "/api/pages/view",
    });
    if (rateLimit.limited) {
      return rateLimit.response;
    }

    const headersList = await headers();
    const rawIp = getClientIp(headersList) ?? "unknown";
    const hashedIp = hashSecurityIdentifier(rawIp);
    const country = headersList.get("x-vercel-ip-country") ?? null;

    const dedupeCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentView } = await supabase
      .from("page_views")
      .select("id")
      .eq("page_id", body.pageId)
      .eq("viewer_ip", hashedIp)
      .gte("viewed_at", dedupeCutoff);

    if (recentView && recentView.length > 0) {
      await trackEvent(pageOwnerId, "page.share_link.opened", {
        page_id: body.pageId,
        page_view_id: recentView[0].id,
        variant_id: body.variantId ?? null,
        variant_label: body.variantLabel ?? null,
        scenario: body.shareScenario ?? null,
        share_link_id: body.shareLinkId ?? null,
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
        page_id: body.pageId,
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

    await supabase.rpc("increment_page_views", { page_id: body.pageId });
    await trackEvent(pageOwnerId, "page.share_link.opened", {
      page_id: body.pageId,
      page_view_id: insertedView.id,
      variant_id: body.variantId ?? null,
      variant_label: body.variantLabel ?? null,
      scenario: body.shareScenario ?? null,
      share_link_id: body.shareLinkId ?? null,
      deduped: false,
    });

    return NextResponse.json({ ok: true, pageViewId: insertedView.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to track view." }, { status: 500 });
  }
}
