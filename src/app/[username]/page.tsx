import type { Metadata } from "next";
import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import MadeWithBadge from "@/components/MadeWithBadge";
import PageOwnerBar from "@/components/PageOwnerBar";
import PublicPageActionDock from "@/components/PublicPageActionDock";
import LivingPageSectionRail from "@/components/public/LivingPageSectionRail";
import RecruiterSkimPanel from "@/components/public/RecruiterSkimPanel";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import ViewTracker from "@/components/ViewTracker";
import { isPubliclyAvailablePage } from "@/lib/hosting-state";
import { getLivingPageSectionIds } from "@/lib/living-page-sections";
import {
  applyPageVariant,
  buildRecruiterSkimModel,
  buildVariantHref,
  getPageVariant,
} from "@/lib/page-variants";
import { fetchPublicLivePage } from "@/lib/pages/fetchPublicLivePage";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { THEME_IDS, type ThemeId } from "@/themes/types";

const VALID_THEMES: Set<string> = new Set(THEME_IDS);
const getPublicPage = cache(async (username: string) => {
  const supabase = createServiceRoleSupabaseClient();
  return fetchPublicLivePage(supabase, username);
});

export const dynamic = "force-dynamic";

interface PublicPageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ v?: string; s?: string; sl?: string }>;
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  noStore();
  const { username } = await params;
  const page = await getPublicPage(username);
  if (!page) {
    return {
      title: SITE_NAME,
      description: "Living digital pages for professionals.",
      robots: { index: false, follow: false },
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
  const page = await getPublicPage(username);
  const publicPageAvailable = isPubliclyAvailablePage(page);

  if (!page || !publicPageAvailable) {
    notFound();
  }

  const themeId = (VALID_THEMES.has(page.theme_id) ? page.theme_id : "cosmic") as ThemeId;
  const pageUserId = page.owner_id ?? page.user_id ?? "";
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
  const livingPageSectionIds = getLivingPageSectionIds(variantResumeData);

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
        motionAware
        maxFps={30}
      >
        <PageOwnerBar pageId={page.id} isOwner={isOwner}>
          <div className="h-full">
            <div
              data-analytics-scroll-root="true"
              className="h-full overflow-y-auto scrollbar-hide"
            >
              <LivingPageSectionRail sectionIds={livingPageSectionIds} />
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
              <footer className="resume-theme mx-auto flex max-w-4xl justify-end px-4 pb-24 sm:px-6 md:px-8">
                <a
                  href={`mailto:${process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL ?? "support@mylivingpage.com"}?subject=${encodeURIComponent(`Report public page /${page.slug}`)}`}
                  rel="nofollow"
                  className="resume-theme-link text-xs underline underline-offset-4"
                >
                  Report this page
                </a>
              </footer>
            </div>
          </div>
        </PageOwnerBar>
      </ThemeCanvas>
      <PublicPageActionDock
        pageId={page.id}
        isOwner={isOwner}
        slug={page.slug}
        themeId={themeId}
        resumeData={variantResumeData}
        variantId={selectedVariant?.id ?? null}
        liveUrl={variantAwareUrl}
        shareCardEnabled
        analyticsHref={`/dashboard/analytics/${page.id}`}
        analyticsCtaLabel="Open Page Analytics"
        avoidBadge
      />
      <MadeWithBadge isSignedIn={Boolean(viewer)} />
    </main>
  );
}
