import React from "react";
import { getAccountAccessState } from "@/lib/account-access";
import {
  buildPageProofSummary,
  SHARE_INTENT_EVENT_NAMES,
} from "@/lib/analytics/proofSummary";
import { PRO_PLAN_PRICE, STARTER_PLAN_PRICE } from "@/lib/billing";
import { isPubliclyAvailablePage, syncPageHostingState } from "@/lib/hosting-state";
import { MAX_PAGES_PER_ACCOUNT } from "@/lib/plans";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { PageRecord } from "@/types/resume";
import DashboardSignalDesk from "@/components/dashboard/DashboardSignalDesk";

interface DashboardPageViewRow {
  page_id: string;
  viewed_at: string;
  user_agent: string | null;
  engaged_seconds: number | null;
}

interface DashboardEventRow {
  event_name: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export default async function DashboardPage() {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const supabase = createServiceRoleSupabaseClient();

  const [profileResult, { data: pages }] = await Promise.all([
    fetchProfileWithHostingAccess<{
      full_name?: string | null;
      username?: string | null;
      plan?: string | null;
      billing_cohort?: string | null;
      hosting_trial_started_at?: string | null;
      stripe_subscription_status?: string | null;
      stripe_trial_ends_at?: string | null;
    }>({
      supabase,
      select: "full_name, username, plan, billing_cohort, hosting_trial_started_at",
      matchField: "id",
      matchValue: user?.id ?? "",
    }),
    supabase
      .from("pages")
      .select("*")
      .or(`user_id.eq.${user?.id ?? ""},owner_id.eq.${user?.id ?? ""}`)
      .order("created_at", { ascending: false }),
  ]);
  const profile = profileResult.data;

  const displayName = profile?.full_name || profile?.username || null;
  const accountAccess = getAccountAccessState({
    plan: profile?.plan ?? null,
    billing_cohort: profile?.billing_cohort ?? null,
    hosting_trial_started_at: profile?.hosting_trial_started_at ?? null,
    stripe_subscription_status: profile?.stripe_subscription_status ?? null,
    stripe_trial_ends_at: profile?.stripe_trial_ends_at ?? null,
  });
  const list = (pages ?? []) as PageRecord[];
  const pageIds = list.map((page) => page.id);
  const [pageViewsResult, eventsResult] = pageIds.length
    ? await Promise.all([
        supabase
          .from("page_views")
          .select("page_id, viewed_at, user_agent, engaged_seconds")
          .in("page_id", pageIds)
          .order("viewed_at", { ascending: false }),
        supabase
          .from("events")
          .select("event_name, created_at, metadata")
          .eq("user_id", user?.id ?? "")
          .in("event_name", [...SHARE_INTENT_EVENT_NAMES, "page.offline_view_attempted"])
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const pageViews = (pageViewsResult.data ?? []) as DashboardPageViewRow[];
  const events = (eventsResult.data ?? []) as DashboardEventRow[];
  const proofByPageId = new Map(
    pageIds.map((pageId) => [
      pageId,
      buildPageProofSummary({
        pageId,
        views: pageViews,
        events,
      }),
    ]),
  );
  const syncedList = await Promise.all(
    list.map(async (page) => {
      const synced = await syncPageHostingState(supabase, page, {
        plan: profile?.plan ?? null,
        billing_cohort: profile?.billing_cohort ?? null,
        hosting_trial_started_at: profile?.hosting_trial_started_at ?? null,
        stripe_subscription_status: profile?.stripe_subscription_status ?? null,
        stripe_trial_ends_at: profile?.stripe_trial_ends_at ?? null,
      });
      return synced.page as PageRecord;
    }),
  );
  const publicSlug = profile?.username ?? list[0]?.slug ?? null;
  const offlineAttemptEvents = events.filter(
    (event) => event.event_name === "page.offline_view_attempted",
  );
  const activePaidPlanPriceLabel =
    accountAccess.publicPlanLabel === "Starter"
      ? STARTER_PLAN_PRICE.displayLabel
      : PRO_PLAN_PRICE.displayLabel;

  return (
    <DashboardSignalDesk
      accountAccess={accountAccess}
      activePaidPlanPriceLabel={activePaidPlanPriceLabel}
      displayName={displayName}
      maxPagesPerAccount={MAX_PAGES_PER_ACCOUNT}
      offlineAttemptAt={offlineAttemptEvents[0]?.created_at ?? null}
      pages={syncedList.map((page) => ({
        page,
        proof: proofByPageId.get(page.id) ?? buildPageProofSummary({
          pageId: page.id,
          views: [],
          events: [],
        }),
        publicViewAvailable: isPubliclyAvailablePage(page),
      }))}
      publicSlug={publicSlug}
    />
  );
}
