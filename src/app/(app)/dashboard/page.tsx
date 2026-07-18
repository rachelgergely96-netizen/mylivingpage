import React from "react";
import Link from "next/link";
import { getAccountAccessState, type AnalyticsTier } from "@/lib/account-access";
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
import DeletePageButton from "@/components/DeletePageButton";
import PublishPageButton from "@/components/PublishPageButton";

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

function formatDurationShort(seconds: number | null) {
  if (seconds === null || seconds <= 0) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (!minutes) {
    return `${remainder}s`;
  }

  if (!remainder) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainder}s`;
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return null;
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (60 * 1000)));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 48) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function buildProofPanelCopy(
  proof: ReturnType<typeof buildPageProofSummary>,
  analyticsTier: AnalyticsTier,
) {
  const avgReading = formatDurationShort(proof.avgEngagedSecondsLast7d);

  switch (proof.status) {
    case "awaiting_views":
      return {
        eyebrow: "Proof loop",
        title: "Recent share recorded. Waiting for someone to look.",
        body:
          "Once someone opens your page, this proof panel will start showing that people looked and whether tracking is active.",
        chips: [
          `${proof.shareIntentCountLast7d} recent share${proof.shareIntentCountLast7d === 1 ? "" : "s"}`,
          "Tracking is active",
        ],
      };
    case "proof_landed":
      return {
        eyebrow: "Proof landed",
        title: "Someone looked after you shared it.",
        body:
          analyticsTier === "full"
            ? proof.firstViewAfterLatestShareAt
              ? `Your first post-share look showed up ${formatRelativeTime(proof.firstViewAfterLatestShareAt)}. Use the Page Analytics button on this page card to see device mix, referrers, and reading behavior.`
              : "Your page is getting attention after a recent share. Use the Page Analytics button on this page card to see what happened after the click."
            : "Your page is getting attention after a recent share. Open Page Analytics for device mix, referrers, and reading behavior.",
        chips: [
          `${proof.viewsLast7d} looked this week`,
          proof.mobileViewsLast7d > 0 ? `${proof.mobileViewsLast7d} mobile` : "Desktop-heavy so far",
          avgReading ? `${avgReading} avg reading` : "Reading time will appear as people engage",
        ],
      };
    case "active":
      return {
        eyebrow: "Recent activity",
        title: `${proof.viewsLast7d} people looked at your page in the last 7 days.`,
        body:
          analyticsTier === "full"
            ? proof.latestViewAt
              ? `Latest activity was ${formatRelativeTime(proof.latestViewAt)}. Use the Page Analytics button on this page card to check whether your page is still getting looked at between follow-ups.`
              : "Your page has started getting outside traffic. Use the Page Analytics button on this page card for the full picture."
            : proof.latestViewAt
              ? `Latest activity was ${formatRelativeTime(proof.latestViewAt)}. Open Page Analytics for the deeper engagement details.`
              : "Your page has started getting outside traffic. Open Page Analytics for the full picture.",
        chips: [
          proof.mobileViewsLast7d > 0 ? `${proof.mobileViewsLast7d} mobile` : "No mobile views yet",
          avgReading ? `${avgReading} avg reading` : "Reading time fills in automatically",
          proof.shareIntentCountLast7d > 0
            ? `${proof.shareIntentCountLast7d} recent share${proof.shareIntentCountLast7d === 1 ? "" : "s"}`
            : "Share again to spark fresh traffic",
        ],
      };
    default:
      return {
        eyebrow: "Proof loop",
        title: "Share your page to start the proof loop.",
        body:
          "Copy your page link or send the share card. Once someone opens it, this page will turn that click into visible proof.",
        chips: ["People looked", "Mobile mix", "Reading time"],
      };
  }
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
    <main className="site-container py-8 sm:py-12" id="main-content">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:mb-8 sm:flex-row sm:items-end sm:gap-4">
        <div>
          <p className="site-eyebrow">Your page</p>
          <h1 className="site-page-title mt-2">
            {displayName ? (
              <>
                Welcome back, <span className="text-site-action">{displayName}</span>
              </>
            ) : (
              "Your Living Page"
            )}
          </h1>
        </div>
        {!list.length ? (
          <Link
            href="/create"
            className="site-button site-button-primary self-start sm:self-auto"
          >
            Create Your Page
          </Link>
        ) : (
          <Link
            href="/dashboard/settings"
            className="site-button site-button-secondary self-start sm:self-auto"
          >
            Manage Public URL
          </Link>
        )}
      </div>

      {!list.length ? (
        <section className="site-panel p-5 text-center sm:p-8">
          <p className="site-muted text-sm">No pages yet. Start by creating your first Living Page.</p>
        </section>
      ) : (
        <section className="grid gap-3">
          {!accountAccess.isLegacyAccount ? (
            <div className="site-callout px-4 py-3 text-sm">
              {accountAccess.hasPaidSubscription ? (
                <>
                  Your living resume is free and remains available regardless of billing. An
                  existing {accountAccess.publicPlanLabel} subscription at {activePaidPlanPriceLabel} is still on file.{" "}
                  <Link href="/dashboard/settings" className="font-semibold text-site-action hover:text-site-action-hover">
                    Review the subscription
                  </Link>
                  .
                </>
              ) : (
                <>Your living resume, public link, ATS-ready PDF, share card, themes, and analytics are free. No card or subscription is required.</>
              )}
            </div>
          ) : null}
          {offlineAttemptEvents.length > 0 ? (
            <div className="site-callout site-callout-warning px-4 py-3 text-sm">
              Someone tried to open your page while it was offline
              {formatRelativeTime(offlineAttemptEvents[0]?.created_at)
                ? ` ${formatRelativeTime(offlineAttemptEvents[0]?.created_at)}`
                : ""}. Use the Publish button on the page card below when you are ready to
              restore the link.
            </div>
          ) : null}
          <div className="site-callout px-4 py-3 text-sm">
            V1 supports one public page per account. Edit your current page, or delete it before creating a replacement.
          </div>
          {list.length > MAX_PAGES_PER_ACCOUNT ? (
            <div className="site-callout site-callout-warning px-4 py-3 text-sm">
              This account still has legacy extra pages. Your public URL resolves through one username, so remove extras before relying on the page publicly.
            </div>
          ) : null}
          {syncedList.map((page) => {
            const publicViewAvailable = isPubliclyAvailablePage(page);
            const proof = proofByPageId.get(page.id) ?? buildPageProofSummary({
              pageId: page.id,
              views: [],
              events: [],
            });
            const proofCopy = buildProofPanelCopy(proof, accountAccess.analyticsTier);

            return (
              <article
                key={page.id}
                className="site-panel grid gap-4 p-4 sm:p-5 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center"
              >
                <div>
                  <p className="font-site text-lg font-semibold text-site-text sm:text-2xl">{page.resume_data?.name ?? "Untitled"}</p>
                  <p className="text-sm text-site-muted">
                    /{publicSlug ?? page.slug} - {page.resume_data?.headline ?? "No headline"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-site-muted">Theme</p>
                  <p className="text-sm capitalize text-site-secondary">{page.theme_id}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-site-muted">People who looked</p>
                  <p className="font-site text-sm font-semibold tabular-nums text-site-action">{page.views ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-site-muted">Status</p>
                  <p className="text-sm capitalize text-site-secondary">
                    {page.status ?? (page.visibility === "public" ? "live" : page.visibility) ?? "-"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {publicViewAvailable ? (
                    <Link
                      href={`/${publicSlug ?? page.slug}`}
                      className="site-button site-button-secondary px-3 py-2 text-xs sm:px-4"
                    >
                      View
                    </Link>
                  ) : <PublishPageButton pageId={page.id} />}
                  <Link
                    href={`/dashboard/edit/${page.id}/living-page`}
                    className="site-button site-button-primary px-3 py-2 text-xs sm:px-4"
                  >
                    Edit Page
                  </Link>
                  <Link
                    href={`/dashboard/edit/${page.id}/living-page#ats-readiness`}
                    className="site-button site-button-secondary px-3 py-2 text-xs sm:px-4"
                  >
                    Check ATS
                  </Link>
                  <Link
                    href={`/dashboard/analytics/${page.id}`}
                    className="site-button site-button-secondary px-3 py-2 text-xs sm:px-4"
                  >
                    Page Analytics
                  </Link>
                  <DeletePageButton pageId={page.id} />
                </div>
                <div className="-mx-4 -mb-4 border-t border-site-border bg-site-canvas-alt p-4 sm:-mx-5 sm:-mb-5 sm:p-5 md:col-span-full">
                  <div className="max-w-3xl">
                    <p className="site-eyebrow">
                      {proofCopy.eyebrow}
                    </p>
                    <h2 className="site-panel-title mt-2 text-lg sm:text-xl">
                      {proofCopy.title}
                    </h2>
                    <p className="site-muted mt-2 text-sm leading-6">
                      {proofCopy.body}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {proofCopy.chips.map((chip) => (
                      <span
                        key={`${page.id}-${chip}`}
                        className="site-badge"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
