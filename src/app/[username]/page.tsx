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
import { buildRecruiterSkimModel, buildVariantHref, getPageVariant } from "@/lib/page-variants";
import { fetchPublicLivePage } from "@/lib/pages/fetchPublicLivePage";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { THEME_IDS, type ThemeId } from "@/themes/types";

const VALID_THEMES: Set<string> = new Set(THEME_IDS);

export const dynamic = "force-dynamic";

interface PublicPageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ v?: string; s?: string; sl?: string }>;
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
    notFound();
  }

  const themeId = (VALID_THEMES.has(page.theme_id) ? page.theme_id : "cosmic") as ThemeId;
  const pageUserId = page.user_id ?? page.owner_id ?? "";
  const selectedVariant = getPageVariant(page.page_config, resolvedSearchParams.v ?? null);
  const recruiterSkim = buildRecruiterSkimModel(page.resume_data, selectedVariant);
  const variantAwarePath = buildVariantHref(`/${username}`, {
    variantId: selectedVariant?.id ?? null,
  });
  const variantAwareUrl = absoluteUrl(variantAwarePath as `/${string}`);

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
              <RecruiterSkimPanel
                pageId={page.id}
                publicPath={variantAwarePath}
                resumeData={recruiterSkim.data}
                variant={selectedVariant}
                variantId={selectedVariant?.id ?? null}
                fitHeading={recruiterSkim.fitHeading}
                proofPoints={recruiterSkim.proofPoints}
                featuredProject={recruiterSkim.featuredProject}
                ctaEmphasis={recruiterSkim.ctaEmphasis}
              />
              <ResumeLayout
                data={recruiterSkim.data}
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
        resumeData={recruiterSkim.data}
        variantId={selectedVariant?.id ?? null}
        liveUrl={variantAwareUrl}
        avoidBadge
      />
      <MadeWithBadge />
    </main>
  );
}
