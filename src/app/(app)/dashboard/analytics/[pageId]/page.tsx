import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageAnalyticsDashboard from "@/components/analytics/PageAnalyticsDashboard";
import { getAccountAccessState } from "@/lib/account-access";
import {
  DEFAULT_ANALYTICS_RANGE,
  isAnalyticsRangeKey,
} from "@/lib/analytics/constants";
import {
  createUnavailablePageAnalyticsDashboard,
  fetchPageAnalyticsDashboard,
} from "@/lib/analytics/pageAnalytics";
import { getPageVariants } from "@/lib/page-variants";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import type { PageRecord } from "@/types/resume";

interface AnalyticsPageProps {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<{ range?: string }>;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown activity details error";
}

export default async function AnalyticsPage({
  params,
  searchParams,
}: AnalyticsPageProps) {
  const [{ pageId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) notFound();

  const supabase = createServiceRoleSupabaseClient();
  const rangeKey = isAnalyticsRangeKey(resolvedSearchParams.range)
    ? resolvedSearchParams.range
    : DEFAULT_ANALYTICS_RANGE;

  const { data: profile } = await fetchProfileWithHostingAccess<{
    plan?: string | null;
    username?: string | null;
    stripe_subscription_status?: string | null;
    stripe_trial_ends_at?: string | null;
  }>({
    supabase,
    select: "plan, username",
    matchField: "id",
    matchValue: user.id,
  });

  const accountAccess = getAccountAccessState({
    plan: profile?.plan ?? null,
    billing_cohort: profile?.billing_cohort ?? null,
    hosting_trial_started_at: profile?.hosting_trial_started_at ?? null,
    stripe_subscription_status: profile?.stripe_subscription_status ?? null,
    stripe_trial_ends_at: profile?.stripe_trial_ends_at ?? null,
  });

  if (accountAccess.analyticsTier !== "full") {
    redirect("/dashboard");
  }

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)
    .maybeSingle();

  if (!page) notFound();

  const typedPage = page as PageRecord;
  const pageName = typedPage.resume_data?.name ?? "Untitled";
  const publicPath = `/${profile?.username ?? typedPage.slug}`;
  const variantLabels = getPageVariants(typedPage.page_config ?? null).map((variant) => variant.label);
  let analyticsLoadError: string | null = null;
  let analytics = createUnavailablePageAnalyticsDashboard({
    rangeKey,
    allTimeViews: typedPage.views ?? 0,
  });

  try {
    analytics = await fetchPageAnalyticsDashboard({
      supabase,
      pageId,
      rangeKey,
      allTimeViews: typedPage.views ?? 0,
    });
  } catch (error) {
    analyticsLoadError = errorMessage(error);
  }

  await trackEvent(user.id, "analytics.dashboard.viewed", {
    page_id: pageId,
    range_key: rangeKey,
    availability: analytics.state.availability,
  }).catch(() => undefined);

  if (analytics.state.availability !== "full") {
    const eventName =
      analytics.state.availability === "basic"
        ? "analytics.dashboard.degraded"
        : "analytics.dashboard.load_failed";
    const message = analyticsLoadError ?? analytics.state.notice ?? "Details unavailable";

    console.error(eventName, {
      pageId,
      userId: user.id,
      rangeKey,
      availability: analytics.state.availability,
      message,
    });

    await trackEvent(user.id, eventName, {
      page_id: pageId,
      range_key: rangeKey,
      availability: analytics.state.availability,
      message,
    }).catch(() => undefined);
  }

  return (
    <main className="site-container py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <Link
          href="/dashboard"
          className="site-button site-button-secondary mb-3 px-3 py-2 text-xs"
        >
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to Your Page
        </Link>
      </div>

      <PageAnalyticsDashboard
        analytics={analytics}
        pageId={pageId}
        pageName={pageName}
        publicPath={publicPath}
        variantLabels={variantLabels}
      />
    </main>
  );
}
