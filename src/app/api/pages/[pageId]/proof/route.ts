import { NextResponse } from "next/server";
import {
  buildPageProofResponse,
  buildPageProofSummary,
  SHARE_OUTCOME_EVENT_NAME,
  SHARE_INTENT_EVENT_NAMES,
} from "@/lib/analytics/proofSummary";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

const routeTrustLevel = "authenticated_user";

async function getAuthUserId() {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  return user?.id ?? null;
}

async function fetchOwnedPage(pageId: string, userId: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("id", pageId)
    .eq("owner_id", userId)
    .maybeSingle();

  return page;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const { pageId } = await params;
  const userId = await getAuthUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = await fetchOwnedPage(pageId, userId);
  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const supabase = createServiceRoleSupabaseClient();
  const [{ data: views }, { data: events }] = await Promise.all([
    supabase
      .from("page_views")
      .select("page_id, viewed_at, user_agent, engaged_seconds")
      .eq("page_id", pageId)
      .order("viewed_at", { ascending: false }),
    supabase
      .from("events")
      .select("event_name, created_at, metadata")
      .eq("user_id", userId)
      .in("event_name", [...SHARE_INTENT_EVENT_NAMES, SHARE_OUTCOME_EVENT_NAME])
      .order("created_at", { ascending: false }),
  ]);

  const response = buildPageProofResponse(
    buildPageProofSummary({
      pageId,
      views: (views ?? []) as Array<{
        page_id: string;
        viewed_at: string;
        user_agent: string | null;
        engaged_seconds: number | null;
      }>,
      events: (events ?? []) as Array<{
        event_name: string;
        created_at: string;
        metadata: Record<string, unknown> | null;
      }>,
    }),
  );

  await trackEvent(userId, "page.activation.proof_checked", {
    page_id: pageId,
    loop_state: response.loopState,
    last_share_scenario: response.lastShareScenario,
    first_view_after_latest_share_at: response.firstViewAfterLatestShareAt,
  }).catch(() => undefined);

  return NextResponse.json(response);
}
