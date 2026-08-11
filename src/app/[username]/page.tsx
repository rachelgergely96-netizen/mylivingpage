import type { Metadata } from "next";
import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import MadeWithBadge from "@/components/MadeWithBadge";
import PageOwnerBar from "@/components/PageOwnerBar";
import PublicPageActionDock from "@/components/PublicPageActionDock";
import LivingPageSectionRail from "@/components/public/LivingPageSectionRail";
import RecruiterSkimPanel from "@/components/public/RecruiterSkimPanel";
import ResumeLayout from "@/components/ResumeLayout";
import JsonLd from "@/components/seo/JsonLd";
import ThemeCanvas from "@/components/ThemeCanvas";
import ViewTracker from "@/components/ViewTracker";
import { getAccountAccessState } from "@/lib/account-access";
import { isPubliclyAvailablePage } from "@/lib/hosting-state";
import { getLivingPageSectionIds } from "@/lib/living-page-sections";
import { isPubliclyReachablePage, isSearchIndexablePage } from "@/lib/page-visibility";
import {
  applyPageVariant,
  buildRecruiterSkimModel,
  buildVariantHref,
  getPageVariant,
} from "@/lib/page-variants";
import { fetchPublicLivePage } from "@/lib/pages/fetchPublicLivePage";
import { buildLivingPageJsonLd } from "@/lib/seo/living-page-json-ld";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import { THEME_IDS, type ThemeId } from "@/themes/types";

const VALID_THEMES: Set<string> = new Set(THEME_IDS);
const getPublicPage = cache(async (username: string) => {
  const supabase = createServiceRoleSupabaseClient();
  return fetchPublicLivePage(supabase, username);
});
const getOfflinePageContext = cache(async (username: string) => {
  const supabase = createServiceRoleSupabaseClient();
  return fetchOfflinePageContext(username, supabase);
});

export const dynamic = "force-dynamic";

interface PublicPageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ v?: string; s?: string; sl?: string }>;
}

/**
 * The "this page is offline" state, for a URL that is legitimately reserved.
 *
 * This used to be gated on `publicHostingAllowed` — i.e. on a lapsed
 * subscription — which every access path now grants unconditionally, so the
 * screen had become unreachable. It is now driven by the owner's own
 * visibility choice, which is what the copy always described.
 *
 * A username with no page, or a page that was never published, still 404s:
 * only a URL its owner deliberately took down earns the offline screen.
 */
async function fetchOfflinePageContext(
  username: string,
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
) {
  const { data: profile } = await fetchProfileWithHostingAccess<{
    id: string;
    plan?: string | null;
    stripe_subscription_status?: string | null;
    stripe_trial_ends_at?: string | null;
  }>({
    supabase,
    select: "id, plan",
    matchField: "username",
    matchValue: username,
  });

  if (!profile) {
    return null;
  }

  const { data: page } = await supabase
    .from("pages")
    .select(
      "id, resume_data, published_at, status, visibility, search_indexable, user_id, owner_id",
    )
    .or(`owner_id.eq.${profile.id},user_id.eq.${profile.id}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!page || !page.published_at || isPubliclyReachablePage(page)) {
    return null;
  }

  return {
    page: page as {
      id: string;
      resume_data: { name?: string | null } | null;
      published_at: string | null;
      user_id?: string | null;
      owner_id?: string | null;
    },
    ownerId: profile.id,
  };
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  noStore();
  const { username } = await params;
  const page = await getPublicPage(username);
  if (!page) {
    // Dead usernames must be real 404s; keep fallback metadata only for the
    // legitimate offline-owner state (page exists but hosting is paused).
    const offlineContext = await getOfflinePageContext(username);
    if (!offlineContext) {
      notFound();
    }

    // Offline is withheld from the sitemap, but a crawler that already knows
    // the URL would otherwise index the interstitial itself.
    return {
      title: "Page offline",
      description: "Living digital pages for professionals.",
      robots: { index: false, follow: false },
    };
  }

  const resume = page.resume_data;
  const pageTitle = `${resume.name} - ${resume.headline}`;
  const title = `${pageTitle} | ${SITE_NAME}`;
  const description = resume.summary || `${resume.name}'s professional profile on ${SITE_NAME}.`;
  const url = absoluteUrl(`/${username}`);

  // "Link only" pages stay openable but ask search engines to stand down. The
  // sitemap already withholds them; this covers the crawler that finds the URL
  // some other way.
  const indexable = isSearchIndexablePage(page);

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: url,
    },
    ...(indexable ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicLivingPage({
  params,
  searchParams,
}: PublicPageProps) {
  noStore();
  const [{ username }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const page = await getPublicPage(username);
  const publicPageAvailable = isPubliclyAvailablePage(page);

  if (!page || !publicPageAvailable) {
    const offlineContext = await getOfflinePageContext(username);

    if (!offlineContext) {
      notFound();
    }

    await trackEvent(offlineContext.ownerId, "page.offline_view_attempted", {
      page_id: offlineContext.page.id,
      username,
    }).catch(() => undefined);

    const offlineAuthClient = await createServerSupabaseClient();
    const { data: { user: offlineViewer } } = await offlineAuthClient.auth.getUser();
    const isOfflineOwner = offlineViewer?.id === offlineContext.ownerId;
    const pageName = offlineContext.page.resume_data?.name?.trim() || username;

    return (
      <main className="site-shell px-4 py-12 sm:px-6 sm:py-16" data-site-ui>
        <div className="site-panel-raised mx-auto max-w-3xl p-6 sm:p-10">
          <p className="site-eyebrow">Page unavailable</p>
          <h1 className="site-page-title mt-3">
            This page is offline right now.
          </h1>
          {isOfflineOwner ? (
            <p className="site-muted mt-4 text-base leading-7">
              You set this page to offline. Everything you wrote is still here — put it back
              online from your settings whenever you are ready to share it again.
            </p>
          ) : (
            <p className="site-muted mt-4 text-base leading-7">
              {pageName}&rsquo;s link was live before and can come back anytime. Only they can
              put it back online.
            </p>
          )}
          <div className="site-callout mt-6 p-4 text-sm leading-6">
            The URL stays reserved so the page can come back without changing the link.
          </div>
          <div className="mt-8">
            {isOfflineOwner ? (
              <Link
                href="/dashboard/settings#visibility"
                className="site-button site-button-primary"
              >
                Put your page back online
              </Link>
            ) : (
              <Link href="/" className="site-nav-link gap-1.5">
                Go to MyLivingPage
                <span aria-hidden="true">&rarr;</span>
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  const themeId = (VALID_THEMES.has(page.theme_id) ? page.theme_id : "cosmic") as ThemeId;
  const pageUserId = page.user_id ?? page.owner_id ?? "";
  const authClient = await createServerSupabaseClient();
  const { data: { user: viewer } } = await authClient.auth.getUser();
  const isOwner = viewer?.id === pageUserId;
  const selectedVariant = getPageVariant(page.page_config, resolvedSearchParams.v ?? null);
  const variantResumeData = applyPageVariant(page.resume_data, selectedVariant);
  const recruiterSkim = buildRecruiterSkimModel(page.resume_data, selectedVariant);
  const variantAwarePath = buildVariantHref(`/${username}`, {
    variantId: selectedVariant?.id ?? null,
  });
  const variantAwareUrl = absoluteUrl(variantAwarePath as `/${string}`);
  // The owner's feature access used to be fetched here on every public view,
  // purely to decide the share-card and analytics affordances. Every
  // getAccountAccessState path now grants both unconditionally, so this was a
  // blocking round trip per recruiter visit that could only ever return the
  // same answer. Resolved from the shared constant instead.
  const ownerAccess = getAccountAccessState({ plan: null });
  const livingPageSectionIds = getLivingPageSectionIds(variantResumeData);

  return (
    <main className="min-h-screen">
      {/* Structured data always describes the canonical, unfiltered page —
          variants filter the visible layout but not the person's identity.
          Withheld entirely on "link only" pages: publishing a machine-readable
          Person record is the opposite of what that state is asking for. */}
      {isSearchIndexablePage(page) ? (
        <JsonLd
          data={buildLivingPageJsonLd({
            page,
            resume: page.resume_data,
            url: absoluteUrl(`/${username}`),
          })}
        />
      ) : null}
      <ViewTracker
        pageId={page.id}
        variantId={selectedVariant?.id ?? null}
        variantLabel={selectedVariant?.label ?? null}
        shareScenario={resolvedSearchParams.s ?? null}
        shareLinkId={resolvedSearchParams.sl ?? null}
      />
      <ThemeCanvas
        themeId={themeId}
        height="100dvh"
        className="rounded-none min-h-screen"
        mobileAmbientMotion
        motionAware
        maxFps={60}
      >
        <PageOwnerBar pageId={page.id} isOwner={isOwner}>
          <div className="h-full">
            {/*
              Reserve room for the fixed action dock + "made with" badge so the
              final section stays readable at full scroll. Sized to clear the
              tallest stack: signed-out = lifted dock + badge (lifted through
              tablet, so the taller padding holds until lg); signed-in owner =
              unlifted dock carrying the extra share-card button.
            */}
            <div
              data-analytics-scroll-root="true"
              className="h-full overflow-y-auto scrollbar-hide pb-[calc(env(safe-area-inset-bottom,0px)+8.5rem)] lg:pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)]"
            >
              <LivingPageSectionRail sectionIds={livingPageSectionIds} />
              {/* publicPath is the base path, not the variant-aware one: the
                  panel only renders on ?v= views, and its link promises the
                  full, unfiltered page rather than a reload of this view. */}
              {recruiterSkim ? (
                <RecruiterSkimPanel
                  pageId={page.id}
                  publicPath={`/${username}`}
                  resumeData={variantResumeData}
                  variantLabel={recruiterSkim.variantLabel}
                  variantId={selectedVariant?.id ?? null}
                  collapsedChips={recruiterSkim.collapsedChips}
                  roleHeading={recruiterSkim.roleHeading}
                  summary={recruiterSkim.summary}
                  featuredProject={recruiterSkim.featuredProject}
                  ctaEmphasis={recruiterSkim.ctaEmphasis}
                />
              ) : null}
              <ResumeLayout
                data={variantResumeData}
                useExternalScrollRoot
              />
            </div>
          </div>
        </PageOwnerBar>
      </ThemeCanvas>
      {/* avoidBadge: the badge only renders for signed-out viewers, so only
          lift the dock for them; signed-in owners keep the natural offset. */}
      <PublicPageActionDock
        pageId={page.id}
        isOwner={isOwner}
        slug={page.slug}
        themeId={themeId}
        resumeData={variantResumeData}
        variantId={selectedVariant?.id ?? null}
        liveUrl={variantAwareUrl}
        shareCardEnabled={ownerAccess.shareCardAllowed}
        analyticsHref={
          ownerAccess.analyticsTier === "full"
            ? `/dashboard/analytics/${page.id}`
            : "/dashboard"
        }
        analyticsCtaLabel={
          ownerAccess.analyticsTier === "full"
            ? "Open page analytics"
            : "Open dashboard"
        }
        avoidBadge={!viewer}
      />
      <MadeWithBadge isSignedIn={Boolean(viewer)} />
    </main>
  );
}
