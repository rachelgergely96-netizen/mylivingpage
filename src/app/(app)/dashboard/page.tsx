import React from "react";
import type { Metadata } from "next";
import { getAccountAccessState } from "@/lib/account-access";
import {
  buildPageProofSummary,
  SHARE_INTENT_EVENT_NAMES,
} from "@/lib/analytics/proofSummary";
import { PRO_PLAN_PRICE, STARTER_PLAN_PRICE } from "@/lib/billing";
import {
  isPubliclyAvailablePage,
  syncPageHostingState,
} from "@/lib/hosting-state";
import { MAX_PAGES_PER_ACCOUNT } from "@/lib/plans";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import type { PageRecord } from "@/types/resume";
import DashboardSignalDesk from "@/components/dashboard/DashboardSignalDesk";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * How far back the dashboard reads raw rows. Comfortably wider than the 7-day
 * proof window so "last viewed" stays meaningful on a quiet page, and bounded
 * so a busy one cannot make the page slow.
 */
const DASHBOARD_ACTIVITY_WINDOW_DAYS = 90;
const DASHBOARD_ACTIVITY_ROW_LIMIT = 2000;

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

interface DashboardPageProps {
  searchParams?: Promise<{
    welcome?: string | string[];
  }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const welcomeBackRequested = resolvedSearchParams.welcome === "1";
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
      select:
        "full_name, username, plan, billing_cohort, hosting_trial_started_at",
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
  // The proof card reports a 7-day window and the most recent view; it never
  // reads further back than that. Unbounded, these queries pulled every view
  // ever recorded and reduced them in JS, so dashboard load time grew with how
  // well the page was doing — slowest for exactly the people it is working for.
  const activityWindowStart = new Date(
    Date.now() - DASHBOARD_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const [pageViewsResult, eventsResult] = pageIds.length
    ? await Promise.all([
        supabase
          .from("page_views")
          .select("page_id, viewed_at, user_agent, engaged_seconds")
          .in("page_id", pageIds)
          .gte("viewed_at", activityWindowStart)
          .order("viewed_at", { ascending: false })
          .limit(DASHBOARD_ACTIVITY_ROW_LIMIT),
        supabase
          .from("events")
          .select("event_name, created_at, metadata")
          .eq("user_id", user?.id ?? "")
          .in("event_name", [
            ...SHARE_INTENT_EVENT_NAMES,
            "page.offline_view_attempted",
          ])
          .gte("created_at", activityWindowStart)
          .order("created_at", { ascending: false })
          .limit(DASHBOARD_ACTIVITY_ROW_LIMIT),
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
  const offlineAttemptAtByPageId = new Map<string, string>();
  for (const event of events) {
    if (event.event_name !== "page.offline_view_attempted") {
      continue;
    }

    const metadataPageId = event.metadata?.page_id;
    const eventPageId =
      typeof metadataPageId === "string"
        ? metadataPageId
        : pageIds.length === 1
          ? pageIds[0]
          : null;

    if (
      eventPageId &&
      pageIds.includes(eventPageId) &&
      !offlineAttemptAtByPageId.has(eventPageId)
    ) {
      offlineAttemptAtByPageId.set(eventPageId, event.created_at);
    }
  }
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
      pages={syncedList.map((page) => ({
        offlineAttemptAt: offlineAttemptAtByPageId.get(page.id) ?? null,
        page,
        proof:
          proofByPageId.get(page.id) ??
          buildPageProofSummary({
            pageId: page.id,
            views: [],
            events: [],
          }),
        publicViewAvailable: isPubliclyAvailablePage(page),
      }))}
      publicSlug={publicSlug}
      welcomeBackRequested={welcomeBackRequested}
    />
  );
}
