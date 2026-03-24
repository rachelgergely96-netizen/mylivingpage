import Link from "next/link";
import { getAccountAccessState } from "@/lib/account-access";
import {
  buildPageProofSummary,
  SHARE_INTENT_EVENT_NAMES,
} from "@/lib/analytics/proofSummary";
import { HOSTING_PLAN_PRICE } from "@/lib/billing";
import { isPubliclyAvailablePage, syncPageHostingState } from "@/lib/hosting-state";
import { MAX_PAGES_PER_ACCOUNT } from "@/lib/plans";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { PageRecord } from "@/types/resume";
import DeletePageButton from "@/components/DeletePageButton";

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

function buildProofPanelCopy(proof: ReturnType<typeof buildPageProofSummary>) {
  const avgReading = formatDurationShort(proof.avgEngagedSecondsLast7d);

  switch (proof.status) {
    case "awaiting_views":
      return {
        eyebrow: "Proof loop",
        title: "Recent share recorded. Waiting for someone to look.",
        body:
          "Once someone opens your page, this page will show that people looked, what device they used, and how long they stayed.",
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
          proof.firstViewAfterLatestShareAt
            ? `Your first post-share look showed up ${formatRelativeTime(proof.firstViewAfterLatestShareAt)}. Open the details to see device mix, referrers, and reading behavior.`
            : "Your page is getting attention after a recent share. Open the details to see what happened after the click.",
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
          proof.latestViewAt
            ? `Latest activity was ${formatRelativeTime(proof.latestViewAt)}. This is where you can quickly see whether your page is still getting looked at between follow-ups.`
            : "Your page has started getting outside traffic. Open the details for the full picture.",
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
          .in("event_name", [...SHARE_INTENT_EVENT_NAMES])
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
      });
      return synced.page as PageRecord;
    }),
  );
  const publicSlug = profile?.username ?? list[0]?.slug ?? null;
  const primaryAnalyticsPage =
    syncedList.find((page) => isPubliclyAvailablePage(page)) ?? syncedList[0] ?? null;
  const trialEndsAt = accountAccess.trialEndsAt
    ? new Date(accountAccess.trialEndsAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 md:px-10">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:mb-8 sm:flex-row sm:items-end sm:gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Your page</p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl md:text-4xl">
            {displayName ? (
              <>
                Welcome back, <span className="text-[#3B82F6]">{displayName}</span>
              </>
            ) : (
              "Your Living Page"
            )}
          </h1>
        </div>
        {!list.length ? (
          <Link
            href="/create"
            className="gold-pill self-start px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] sm:self-auto sm:px-6 sm:py-3"
          >
            Create Your Page
          </Link>
        ) : (
          <Link
            href="/dashboard/settings"
            className="self-start rounded-full border border-[rgba(255,255,255,0.15)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.5)] sm:self-auto sm:px-6 sm:py-3"
          >
            Manage Public URL
          </Link>
        )}
      </div>

      {!list.length ? (
        <section className="glass-card rounded-2xl p-5 text-center sm:p-8">
          <p className="text-sm text-[rgba(240,244,255,0.6)]">No pages yet. Start by creating your first living page.</p>
        </section>
      ) : (
        <section className="grid gap-3">
          {!accountAccess.isLegacyAccount ? (
            <div className="rounded-2xl border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)] px-4 py-3 text-sm text-[rgba(240,244,255,0.74)]">
              {accountAccess.hasPaidSubscription ? (
                <>Monthly hosting is active at {HOSTING_PLAN_PRICE.displayLabel}. Manage it from settings anytime.</>
              ) : accountAccess.requiresSubscription ? (
                <>
                  Your free hosting month has ended and your public page is offline.{" "}
                  <Link href="/dashboard/settings" className="text-[#93C5FD] hover:text-[#BFDBFE]">
                    Continue hosting for {HOSTING_PLAN_PRICE.displayLabel}
                  </Link>
                  .
                </>
              ) : accountAccess.isActiveFreeMonth && trialEndsAt ? (
                <>Your free hosting month is active until {trialEndsAt}. All features stay unlocked while you build.</>
              ) : (
                <>Your free hosting month starts the first time your page goes live. All features are already unlocked while you build.</>
              )}
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
          {primaryAnalyticsPage ? (
            <div className="rounded-2xl border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)] p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#93C5FD]">
                    Page Analytics
                  </p>
                  <h2 className="mt-2 font-heading text-lg font-bold text-[#F0F4FF] sm:text-xl">
                    See when people open your page and what happens next.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.66)]">
                    This is the clear place to review people who looked, device mix, reading time, and follow-up activity after you share your page.
                  </p>
                </div>
                <Link
                  href={`/dashboard/analytics/${primaryAnalyticsPage.id}`}
                  className="self-start rounded-full border border-[rgba(59,130,246,0.32)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#93C5FD] transition-colors hover:border-[rgba(59,130,246,0.46)] hover:text-[#BFDBFE]"
                >
                  Open Page Analytics
                </Link>
              </div>
            </div>
          ) : null}
          {syncedList.map((page) => {
            const publicViewAvailable = isPubliclyAvailablePage(page);
            const proof = proofByPageId.get(page.id) ?? buildPageProofSummary({
              pageId: page.id,
              views: [],
              events: [],
            });
            const proofCopy = buildProofPanelCopy(proof);

            return (
              <article
                key={page.id}
                className="glass-card grid gap-3 rounded-2xl p-4 sm:gap-4 sm:p-5 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center"
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
                  ) : (
                    <Link
                      href="/dashboard/settings"
                      className="rounded-full border border-[rgba(245,158,11,0.24)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[#FCD34D] hover:text-[#FDE68A] sm:px-4 sm:py-2"
                    >
                      Hosting Inactive
                    </Link>
                  )}
                  <Link
                    href={`/dashboard/edit/${page.id}/living-page`}
                    className="rounded-full border border-[rgba(255,255,255,0.15)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] sm:px-4 sm:py-2"
                  >
                    Edit Page
                  </Link>
                  <Link
                    href={`/dashboard/analytics/${page.id}`}
                    className="rounded-full border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.12)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[#93C5FD] hover:border-[rgba(59,130,246,0.46)] hover:text-[#BFDBFE] sm:px-4 sm:py-2"
                  >
                    Page Analytics
                  </Link>
                  <DeletePageButton pageId={page.id} />
                </div>
                <div className="rounded-2xl border border-[rgba(59,130,246,0.16)] bg-[rgba(59,130,246,0.08)] p-4 md:col-span-full">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#93C5FD]">
                        {proofCopy.eyebrow}
                      </p>
                      <h2 className="mt-2 font-heading text-lg font-bold text-[#F0F4FF] sm:text-xl">
                        {proofCopy.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.66)]">
                        {proofCopy.body}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/analytics/${page.id}`}
                      className="self-start rounded-full border border-[rgba(59,130,246,0.32)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#93C5FD] transition-colors hover:border-[rgba(59,130,246,0.46)] hover:text-[#BFDBFE]"
                    >
                      Open Page Analytics
                    </Link>
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
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
