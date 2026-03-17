import { NextResponse } from "next/server";
import { normalizeEngagementPayload } from "@/lib/analytics/publicTracking";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

async function parseRequestBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json().catch(() => null);
  }

  const text = await request.text().catch(() => "");
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export const routeTrustLevel = "public_write";

export async function POST(request: Request) {
  try {
    const payload = normalizeEngagementPayload(await parseRequestBody(request));
    if (!payload) {
      return NextResponse.json({ error: "Invalid engagement payload." }, { status: 400 });
    }

    const rateLimit = await enforceRateLimit({
      request,
      policy: "public_page_engagement",
      route: "/api/pages/engagement",
    });
    if (rateLimit.limited) {
      return rateLimit.response;
    }

    const supabase = createServiceRoleSupabaseClient();
    const { data: pageView, error: pageViewError } = await supabase
      .from("page_views")
      .select(
        "id, page_id, engaged_seconds, max_scroll_depth_pct, primary_section, had_outbound_click",
      )
      .eq("id", payload.pageViewId)
      .eq("page_id", payload.pageId)
      .maybeSingle();

    if (pageViewError) {
      throw new Error(pageViewError.message);
    }

    if (!pageView) {
      return NextResponse.json({ error: "Page view not found." }, { status: 404 });
    }

    const previousEngagedSeconds = pageView.engaged_seconds ?? 0;
    const shouldReplacePrimarySection =
      Boolean(payload.primarySection) && payload.engagedSeconds >= previousEngagedSeconds;

    const { error: updateError } = await supabase
      .from("page_views")
      .update({
        engaged_seconds: Math.max(previousEngagedSeconds, payload.engagedSeconds),
        max_scroll_depth_pct: Math.max(
          pageView.max_scroll_depth_pct ?? 0,
          payload.maxScrollDepthPct,
        ),
        primary_section: shouldReplacePrimarySection
          ? payload.primarySection
          : pageView.primary_section,
        had_outbound_click:
          Boolean(pageView.had_outbound_click) || payload.clicks.length > 0,
      })
      .eq("id", payload.pageViewId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (payload.clicks.length > 0) {
      const { error: deleteError } = await supabase
        .from("page_interactions")
        .delete()
        .eq("page_view_id", payload.pageViewId)
        .eq("page_id", payload.pageId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      const { error: insertError } = await supabase.from("page_interactions").insert(
        payload.clicks.map((click) => ({
          page_id: payload.pageId,
          page_view_id: payload.pageViewId,
          target_key: click.targetKey,
          target_label: click.targetLabel,
          click_count: click.count,
        })),
      );

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to record page engagement.",
      },
      { status: 500 },
    );
  }
}
