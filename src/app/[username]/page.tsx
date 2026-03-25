import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import MadeWithBadge from "@/components/MadeWithBadge";
import PageOwnerBar from "@/components/PageOwnerBar";
import PublicPageActionDock from "@/components/PublicPageActionDock";
import RecruiterSkimPanel from "@/components/public/RecruiterSkimPanel";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import ViewTracker from "@/components/ViewTracker";
import { getAccountAccessState } from "@/lib/account-access";
import {
  applyPageVariant,
  buildRecruiterSkimModel,
  buildVariantHref,
  getPageVariant,
} from "@/lib/page-variants";
import { fetchPublicLivePage } from "@/lib/pages/fetchPublicLivePage";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import { THEME_IDS, type ThemeId } from "@/themes/types";

const VALID_THEMES: Set<string> = new Set(THEME_IDS);

export const dynamic = "force-dynamic";

interface PublicPageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ v?: string; s?: string; sl?: string }>;
}

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

  const access = getAccountAccessState({
    plan: profile.plan ?? null,
    billing_cohort: profile.billing_cohort ?? null,
    hosting_trial_started_at: profile.hosting_trial_started_at ?? null,
    stripe_subscription_status: profile.stripe_subscription_status ?? null,
    stripe_trial_ends_at: profile.stripe_trial_ends_at ?? null,
  });

  if (access.publicHostingAllowed) {
    return null;
  }

  const { data: page } = await supabase
    .from("pages")
    .select("id, resume_data, published_at, user_id, owner_id")
    .or(`owner_id.eq.${profile.id},user_id.eq.${profile.id}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!page || !page.published_at) {
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
    access,
    ownerId: profile.id,
  };
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  noStore();
  const { username } = await params;
  const supabase = createServiceRoleSupabaseClient();
  const page = await fetchPublicLivePage(supabase, username);
  if (!page) {
    return {
      title: SITE_NAME,
      description: "Living digital pages for professionals.",
    };
  }

  const resume = page.resume_data;
  const title = `${resume.name} - ${resume.headline} | ${SITE_NAME}`;
  const description = resume.summary || `${resume.name}'s professional profile on ${SITE_NAME}.`;
  const url = absoluteUrl(`/${username}`);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
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
  const supabase = createServiceRoleSupabaseClient();
  const page = await fetchPublicLivePage(supabase, username);
  const publicPageAvailable =
    page?.visibility === "public" || (page?.visibility == null && page?.status === "live");

  if (!page || !publicPageAvailable) {
    const offlineContext = await fetchOfflinePageContext(username, supabase);

    if (!offlineContext) {
      notFound();
    }

    await trackEvent(offlineContext.ownerId, "page.offline_view_attempted", {
      page_id: offlineContext.page.id,
      username,
    }).catch(() => undefined);

    const pageName = offlineContext.page.resume_data?.name?.trim() || username;

    return (
      <main className="min-h-screen bg-[#08111C] px-4 py-12 text-[#F0F4FF] sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-[rgba(59,130,246,0.2)] bg-[rgba(10,22,40,0.76)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10">
          <p className="text-xs uppercase tracking-[0.22em] text-[#3B82F6]">Page unavailable</p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-5xl">
            {pageName}&rsquo;s page is being updated.
          </h1>
          <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.7)]">
            This link was live before and can be reactivated anytime. The owner can turn hosting
            back on from their MyLivingPage settings when they are ready to share it again.
          </p>
          <div className="mt-6 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
            The URL stays reserved so the page can come back without changing the link.
          </div>
        </div>
      </main>
    );
  }

  const themeId = (VALID_THEMES.has(page.theme_id) ? page.theme_id : "cosmic") as ThemeId;
  const pageUserId = page.user_id ?? page.owner_id ?? "";
  const selectedVariant = getPageVariant(page.page_config, resolvedSearchParams.v ?? null);
  const variantResumeData = applyPageVariant(page.resume_data, selectedVariant);
  const recruiterSkim = buildRecruiterSkimModel(page.resume_data, selectedVariant);
  const variantAwarePath = buildVariantHref(`/${username}`, {
    variantId: selectedVariant?.id ?? null,
  });
  const variantAwareUrl = absoluteUrl(variantAwarePath as `/${string}`);
  const { data: ownerProfile } = await fetchProfileWithHostingAccess<{
    plan?: string | null;
    username?: string | null;
    stripe_subscription_status?: string | null;
    stripe_trial_ends_at?: string | null;
  }>({
    supabase,
    select: "plan, username",
    matchField: "username",
    matchValue: username,
  });
  const ownerAccess = getAccountAccessState({
    plan: ownerProfile?.plan ?? null,
    billing_cohort: ownerProfile?.billing_cohort ?? null,
    hosting_trial_started_at: ownerProfile?.hosting_trial_started_at ?? null,
    stripe_subscription_status: ownerProfile?.stripe_subscription_status ?? null,
    stripe_trial_ends_at: ownerProfile?.stripe_trial_ends_at ?? null,
  });

  return (
    <main className="min-h-screen">
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
      >
        <PageOwnerBar pageId={page.id} pageUserId={pageUserId}>
          <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.58)_100%)]">
            <div
              data-analytics-scroll-root="true"
              className="h-full overflow-y-auto scrollbar-hide"
            >
              {recruiterSkim ? (
                <RecruiterSkimPanel
                  pageId={page.id}
                  publicPath={variantAwarePath}
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
      <PublicPageActionDock
        pageId={page.id}
        pageUserId={pageUserId}
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
            ? "Open Page Analytics"
            : "Open Dashboard"
        }
        avoidBadge
      />
      <MadeWithBadge />
    </main>
  );
}
