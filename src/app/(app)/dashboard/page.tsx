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
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";

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
  const hasPublicProfile = syncedList.some((page) => isPubliclyAvailablePage(page));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 md:px-10">
      <ProfileWindow
        title="My profile home"
        status={
          hasPublicProfile ? (
            <span className="profile-status">Profile live</span>
          ) : (
            <span>{list.length ? "Private workspace" : "Setup mode"}</span>
          )
        }
        className="mb-6 sm:mb-8"
        contentClassName="grid gap-5 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5"
      >
        <div className="profile-avatar-frame flex h-16 w-16 items-center justify-center bg-[linear-gradient(145deg,#1d4ed8,#071427)] sm:h-20 sm:w-20">
          <span className="font-heading text-2xl font-bold text-[#EFF6FF] sm:text-3xl">
            {(displayName || "M").slice(0, 1).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">
            Your personal profile
          </p>
          <h1 className="mt-1.5 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl md:text-4xl">
            {displayName ? (
              <>
                Welcome back, <span className="text-[#60A5FA]">{displayName}</span>
              </>
            ) : (
              "Your Living Page"
            )}
          </h1>
          <p className="mt-2 truncate font-mono text-xs text-[rgba(191,219,254,0.62)] sm:text-sm">
            {publicSlug ? `mylivingpage.com/${publicSlug}` : "Your public link appears when you publish"}
          </p>
        </div>
        {!list.length ? (
          <Link
            href="/create"
            className="gold-pill inline-flex min-h-11 items-center justify-center self-start px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] sm:self-auto sm:px-6 sm:py-3"
          >
            Create Your Page
          </Link>
        ) : (
          <Link href="/dashboard/settings" className="profile-action self-start sm:self-auto">
            Manage Public URL
          </Link>
        )}
      </ProfileWindow>

      {!list.length ? (
        <ProfileWindow
          title="Profile setup"
          status="Private until you publish"
          contentClassName="p-5 sm:p-7"
        >
          <div className="max-w-3xl">
            <h2 className="mt-3 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
              Your first living resume is three simple stages away.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.62)]">
              Your work stays private while you build. Add what matters, preview every output, and publish only when you are ready.
            </p>
          </div>
          <ProfilePanel title="Your setup checklist" meta="3 stages" className="mt-6" contentClassName="p-0">
            <ol className="grid md:grid-cols-3 md:divide-x md:divide-[rgba(255,255,255,0.07)]">
              {[
                ["01", "Add details", "Six short sections with clear prompts and local draft saving."],
                ["02", "Design and check", "Choose a polished theme and review your ATS readiness."],
                ["03", "Publish and share", "Use your live link, PDF, and QR-ready share card."],
              ].map(([number, title, body]) => (
                <li key={number} className="border-b border-[rgba(255,255,255,0.07)] p-4 last:border-b-0 md:border-b-0">
                  <p className="font-mono text-[10px] text-[#93C5FD]">{number}</p>
                  <p className="mt-2 font-semibold text-[#F0F4FF]">{title}</p>
                  <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.55)]">{body}</p>
                </li>
              ))}
            </ol>
          </ProfilePanel>
          <Link
            href="/create"
            className="gold-pill mt-6 inline-flex px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_34px_rgba(59,130,246,0.3)]"
          >
            Build My Resume
          </Link>
        </ProfileWindow>
      ) : (
        <section className="grid gap-3">
          {!accountAccess.isLegacyAccount ? (
            <div className="rounded-2xl border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)] px-4 py-3 text-sm text-[rgba(240,244,255,0.74)]">
              {accountAccess.hasPaidSubscription ? (
                <>
                  Your living resume is free and remains available regardless of billing. An
                  existing {accountAccess.publicPlanLabel} subscription at {activePaidPlanPriceLabel} is still on file.{" "}
                  <Link href="/dashboard/settings" className="text-[#93C5FD] hover:text-[#BFDBFE]">
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
            <div className="rounded-2xl border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-sm text-[rgba(240,244,255,0.72)]">
              Someone tried to open your page while it was offline
              {formatRelativeTime(offlineAttemptEvents[0]?.created_at)
                ? ` ${formatRelativeTime(offlineAttemptEvents[0]?.created_at)}`
                : ""}. Use the Publish button on the page card below when you are ready to
              restore the link.
            </div>
          ) : null}
          <div className="rounded-2xl border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.08)] px-4 py-3 text-sm text-[rgba(240,244,255,0.68)]">
            V1 supports one public page per account. Edit your current page, or delete it before creating a replacement.
          </div>
          {list.length > MAX_PAGES_PER_ACCOUNT ? (
            <div className="rounded-2xl border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-sm text-[rgba(240,244,255,0.72)]">
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
              <ProfileWindow
                key={page.id}
                as="article"
                title="Your living profile"
                status={
                  publicViewAvailable ? (
                    <span className="profile-status">Live</span>
                  ) : (
                    <span>{page.status ?? page.visibility ?? "Private"}</span>
                  )
                }
                contentClassName="grid gap-3 p-4 sm:gap-4 sm:p-5 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center"
              >
                <div>
                  <p className="font-heading text-lg text-[#F0F4FF] sm:text-2xl">{page.resume_data?.name ?? "Untitled"}</p>
                  <p className="text-sm text-[rgba(240,244,255,0.45)]">
                    /{publicSlug ?? page.slug} - {page.resume_data?.headline ?? "No headline"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.3)]">Theme</p>
                  <p className="text-sm capitalize text-[rgba(240,244,255,0.75)]">{page.theme_id}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.3)]">People Who Looked</p>
                  <p className="font-mono text-sm text-[#93C5FD]">{page.views ?? 0}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.3)]">Status</p>
                  <p className="text-sm capitalize text-[rgba(240,244,255,0.75)]">
                    {page.status ?? (page.visibility === "public" ? "live" : page.visibility) ?? "-"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {publicViewAvailable ? (
                    <Link
                      href={`/${publicSlug ?? page.slug}`}
                      className="rounded-full border border-[rgba(59,130,246,0.35)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:text-[#93C5FD] sm:px-4 sm:py-2"
                    >
                      View
                    </Link>
                  ) : <PublishPageButton pageId={page.id} />}
                  <Link
                    href={`/dashboard/edit/${page.id}/living-page`}
                    className="rounded-full border border-[rgba(255,255,255,0.15)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] sm:px-4 sm:py-2"
                  >
                    Edit Page
                  </Link>
                  <Link
                    href={`/dashboard/edit/${page.id}/living-page#ats-readiness`}
                    className="rounded-full border border-[rgba(255,255,255,0.15)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] sm:px-4 sm:py-2"
                  >
                    Check ATS
                  </Link>
                  <Link
                    href={`/dashboard/analytics/${page.id}`}
                    className="rounded-full border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.12)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[#93C5FD] hover:border-[rgba(59,130,246,0.46)] hover:text-[#BFDBFE] sm:px-4 sm:py-2"
                  >
                    Page Analytics
                  </Link>
                  <DeletePageButton pageId={page.id} />
                </div>
                <ProfilePanel
                  title={proofCopy.eyebrow}
                  meta="Visitor activity"
                  className="md:col-span-full"
                  contentClassName="p-4"
                >
                  <div className="max-w-3xl">
                    <h2 className="font-heading text-lg font-bold text-[#F0F4FF] sm:text-xl">
                      {proofCopy.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.66)]">
                      {proofCopy.body}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {proofCopy.chips.map((chip) => (
                      <span
                        key={`${page.id}-${chip}`}
                        className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[11px] text-[rgba(240,244,255,0.7)]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </ProfilePanel>
              </ProfileWindow>
            );
          })}
        </section>
      )}
    </main>
  );
}
