import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DashboardSignalDesk from "@/components/dashboard/DashboardSignalDesk";
import AppNavigation from "@/components/ui/AppNavigation";
import { getAccountAccessState } from "@/lib/account-access";
import { DEMO_PAGES } from "@/lib/demo-data";
import {
  isEditorPreviewEnabled,
  PUBLIC_PAGE_PREVIEW_USERNAME,
} from "@/lib/editor-preview";
import type { PageProofSummary } from "@/lib/analytics/proofSummary";
import type { PageRecord } from "@/types/resume";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard Layout Preview | MyLivingPage",
  robots: {
    index: false,
    follow: false,
  },
};

const demo = DEMO_PAGES[0];

const previewPage: PageRecord = {
  id: "dashboard-layout-preview",
  slug: PUBLIC_PAGE_PREVIEW_USERNAME,
  status: "live",
  visibility: "public",
  title: "Avery Sample",
  theme_id: demo.themeId,
  resume_data: demo.data,
  raw_resume: null,
  portfolio_url: null,
  page_config: null,
  views: 42,
  published_at: "2026-07-19T12:00:00.000Z",
  created_at: "2026-07-18T12:00:00.000Z",
  updated_at: "2026-07-22T20:45:00.000Z",
};

const previewProof: PageProofSummary = {
  pageId: previewPage.id,
  status: "proof_landed",
  viewsLast7d: 7,
  mobileViewsLast7d: 3,
  avgEngagedSecondsLast7d: 68,
  shareIntentCountLast7d: 2,
  lastShareAt: "2026-07-22T19:30:00.000Z",
  latestViewAt: "2026-07-22T20:45:00.000Z",
  firstViewAfterLatestShareAt: "2026-07-22T20:02:00.000Z",
  firstViewAfterLatestShareDeviceLabel: "mobile",
  firstViewAfterLatestShareEngagedSeconds: 84,
  lastShareScenario: "recruiter_reply",
  lastShareVariantId: null,
  lastShareVariantLabel: null,
  bestScenarioLast7d: "recruiter_reply",
};

interface DashboardLayoutPreviewPageProps {
  searchParams?: Promise<{
    empty?: string | string[];
    welcome?: string | string[];
  }>;
}

export default async function DashboardLayoutPreviewPage({
  searchParams,
}: DashboardLayoutPreviewPageProps) {
  if (!isEditorPreviewEnabled()) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <div className="site-shell" data-site-ui>
      <header className="site-header">
        <div className="site-container-wide flex h-16 items-center justify-between gap-4">
          <Link href="/" className="site-wordmark shrink-0">
            my<span>living</span>page
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden border border-site-warning px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-site-warning sm:inline-flex">
              Local dashboard preview
            </span>
            <AppNavigation variant="product" />
          </div>
        </div>
      </header>
      <DashboardSignalDesk
        accountAccess={getAccountAccessState({
          billing_cohort: "legacy_freemium",
          plan: null,
        })}
        activePaidPlanPriceLabel="$9.99/mo"
        displayName="Avery"
        maxPagesPerAccount={1}
        pages={
          resolvedSearchParams.empty === "1"
            ? []
            : [
                {
                  offlineAttemptAt: null,
                  page: previewPage,
                  proof: previewProof,
                  publicViewAvailable: true,
                },
              ]
        }
        publicSlug={previewPage.slug}
        welcomeBackRequested={resolvedSearchParams.welcome === "1"}
      />
    </div>
  );
}
