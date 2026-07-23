import AdminSignalDesk from "@/components/admin/AdminSignalDesk";
import {
  buildAdminFeedbackItems,
  type AdminFeedbackEventRow,
} from "@/lib/admin-feedback";
import {
  buildAdminUserRows,
  listAllAuthUsers,
  type AdminPageStatsRow,
  type AdminProfileRow,
} from "@/lib/admin-user-review";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

interface AdminOverviewPageRow extends AdminPageStatsRow {
  slug: string;
  views: number;
  created_at: string;
  resume_data: { name?: string } | null;
}

interface AdminOverviewEventRow extends AdminFeedbackEventRow {
  event_name: string;
}

interface AdminOverviewViewRow {
  viewed_at: string;
}

const FAILURE_EVENT_NAMES = [
  "billing.checkout.session_failed",
  "billing.portal.session_failed",
  "billing.webhook.failed",
  "page.publish.failed",
  "auth.google.start.failed",
  "auth.callback.failed",
] as const;

function buildDailyBuckets(timestamps: string[], days: number) {
  const byDay = timestamps.reduce<Record<string, number>>((counts, timestamp) => {
    const day = timestamp.slice(0, 10);
    counts[day] = (counts[day] ?? 0) + 1;
    return counts;
  }, {});

  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: byDay[key] ?? 0 };
  });
}

function firstNonEmptyText(
  ...values: Array<string | null | undefined>
): string {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) {
      return normalized;
    }
  }

  return "Unknown";
}

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabase = createServiceRoleSupabaseClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const sevenDayCutoff = sevenDaysAgo.toISOString();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
  const ninetyDayCutoff = ninetyDaysAgo.toISOString();

  const [
    profilesResult,
    pageStatsResult,
    recentPagesResult,
    waitlistResult,
    viewsResult,
    recentEventsResult,
    recentFeedbackResult,
    profileCountResult,
    pageCountResult,
    viewCountResult,
    googleUserCountResult,
    activeUserCountResult,
    feedbackSevenDayCountResult,
    failureSevenDayCountResult,
    authUsers,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, username, full_name, email, avatar_url, plan, created_at, auth_provider, last_sign_in_at, sign_in_count, signup_referrer",
      )
      .order("created_at", { ascending: false })
      .returns<AdminProfileRow[]>(),
    supabase
      .from("pages")
      .select("owner_id, user_id, views")
      .returns<AdminPageStatsRow[]>(),
    supabase
      .from("pages")
      .select("slug, views, created_at, resume_data, owner_id, user_id")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<AdminOverviewPageRow[]>(),
    supabase.from("waitlist").select("*", { count: "exact", head: true }),
    supabase
      .from("page_views")
      .select("viewed_at")
      .gte("viewed_at", ninetyDayCutoff)
      .order("viewed_at", { ascending: true })
      .returns<AdminOverviewViewRow[]>(),
    supabase
      .from("events")
      .select("id, event_name, metadata, created_at, user_id")
      .gte("created_at", ninetyDayCutoff)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<AdminOverviewEventRow[]>(),
    supabase
      .from("events")
      .select("id, event_name, metadata, created_at, user_id")
      .eq("event_name", "feedback.submitted")
      .order("created_at", { ascending: false })
      .limit(4)
      .returns<AdminOverviewEventRow[]>(),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("pages").select("*", { count: "exact", head: true }),
    supabase.from("page_views").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("auth_provider", "google"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_sign_in_at", sevenDayCutoff),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "feedback.submitted")
      .gte("created_at", sevenDayCutoff),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .in("event_name", [...FAILURE_EVENT_NAMES])
      .gte("created_at", sevenDayCutoff),
    listAllAuthUsers(supabase),
  ]);

  const queryError =
    profilesResult.error ??
    pageStatsResult.error ??
    recentPagesResult.error ??
    waitlistResult.error ??
    viewsResult.error ??
    recentEventsResult.error ??
    recentFeedbackResult.error ??
    profileCountResult.error ??
    pageCountResult.error ??
    viewCountResult.error ??
    googleUserCountResult.error ??
    activeUserCountResult.error ??
    feedbackSevenDayCountResult.error ??
    failureSevenDayCountResult.error;
  if (queryError) {
    throw new Error("Unable to load the admin overview.");
  }

  const profiles = profilesResult.data ?? [];
  const pageStats = pageStatsResult.data ?? [];
  const recentPages = recentPagesResult.data ?? [];
  const recentViews = viewsResult.data ?? [];
  const recentEvents = recentEventsResult.data ?? [];
  const adminUsers = buildAdminUserRows({
    profiles,
    pages: pageStats,
    authUsers,
    now,
  });
  const accountsToReview = adminUsers.filter(
    (user) => user.botDisposition === "suspicious" || user.isUnconfirmedPastGrace,
  ).length;

  const feedbackItems = buildAdminFeedbackItems({
    events: recentFeedbackResult.data ?? [],
    profiles,
  });
  const feedbackLastSevenDays = feedbackSevenDayCountResult.count ?? 0;
  const failuresLastSevenDays = failureSevenDayCountResult.count ?? 0;
  const totalViews = viewCountResult.count ?? 0;
  const googleUsers = googleUserCountResult.count ?? 0;
  const activeLastSevenDays = activeUserCountResult.count ?? 0;

  return (
    <AdminSignalDesk
      attention={[
        {
          detail: "Messages received in the last 7 days",
          href: "/admin/feedback",
          label: "Feedback",
          value: feedbackLastSevenDays,
        },
        {
          detail: "Sign-in, publishing, or billing failures",
          href: "/admin/ops",
          label: "Failed actions",
          value: failuresLastSevenDays,
        },
        {
          detail: "Suspicious or unconfirmed for more than 24 hours",
          href: "/admin/users",
          label: "Accounts to review",
          value: accountsToReview,
        },
      ]}
      metrics={[
        { label: "Total users", value: profileCountResult.count ?? 0 },
        { label: "Total Living Pages", value: pageCountResult.count ?? 0 },
        { label: "Total page views", value: totalViews },
        { label: "Active in 7 days", value: activeLastSevenDays },
        { label: "Google sign-ins", value: googleUsers },
        { label: "Waitlist names", value: waitlistResult.count ?? 0 },
      ]}
      dailySignups={buildDailyBuckets(
        profiles.map((profile) => profile.created_at),
        30,
      )}
      dailyViews={buildDailyBuckets(
        recentViews.map((view) => view.viewed_at),
        30,
      )}
      latestFeedback={feedbackItems.slice(0, 4)}
      recentActivity={recentEvents.slice(0, 10).map((event) => ({
        createdAt: event.created_at,
        eventName: event.event_name,
      }))}
      recentUsers={profiles.slice(0, 5).map((profile) => ({
        createdAt: profile.created_at,
        displayName: firstNonEmptyText(
          profile.full_name,
          profile.username,
          profile.email,
        ),
        email: profile.email,
        username: profile.username,
      }))}
      recentPages={recentPages.map((page) => ({
        createdAt: page.created_at,
        name: firstNonEmptyText(page.resume_data?.name, page.slug),
        slug: page.slug,
        views: page.views ?? 0,
      }))}
    />
  );
}
