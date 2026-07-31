import type { Metadata } from "next";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import ExamplesExperience from "@/components/marketing/ExamplesExperience";
import MobileStickyCta from "@/components/marketing/MobileStickyCta";
import SiteHeader from "@/components/marketing/SiteHeader";
import JsonLd from "@/components/seo/JsonLd";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import { getMarketingSampleGroups } from "@/lib/marketing-samples";
import { getAbsoluteUrl, SITE_NAME } from "@/lib/site";
import { buildCollectionPageStructuredData } from "@/lib/structured-data";

const canonicalUrl = getAbsoluteUrl("/examples");

function getSignupHref(ref: string) {
  return `/signup?ref=${ref}&next=/create`;
}

export const metadata: Metadata = {
  title: "Examples",
  description:
    "Browse sample Living Pages that help recruiters understand you faster after they click.",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: `Examples | ${SITE_NAME}`,
    description:
      "Browse sample Living Pages that help recruiters understand you faster after they click.",
    url: canonicalUrl,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Examples | ${SITE_NAME}`,
    description:
      "Browse sample Living Pages that help recruiters understand you faster after they click.",
  },
};

export default async function ExamplesPage() {
  const site = await getRequestLegalSite();
  const sampleGroups = getMarketingSampleGroups();

  return (
    <div className="site-shell" data-site-ui>
      <JsonLd
        data={buildCollectionPageStructuredData({
          path: "/examples",
          name: "MyLivingPage Sample Pages",
          description:
            "Browse sample Living Pages that help recruiters understand you faster after they click.",
        })}
      />
      <SiteHeader
        brandName={site.brandName}
        links={[
          { href: "/examples", label: "Examples", current: true },
          { href: "/guides", label: "Guides" },
          { href: "/pricing", label: "Free" },
          { href: "/login", label: "Sign in" },
        ]}
        cta={{
          href: getSignupHref("examples_nav_start"),
          label: "Create my free page",
          mobileLabel: "Start free",
        }}
      />

      <main id="main-content" className="site-container-wide py-12 sm:py-16">
        <ExamplesExperience
          sampleGroups={sampleGroups}
          signupHref={getSignupHref("examples_after_apply")}
        />

        <section
          className="mx-auto mt-12 grid max-w-[76rem] gap-5 border-y border-site-border bg-site-surface px-5 py-6 sm:mt-20 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-7"
          aria-labelledby="examples-guides-title"
        >
          <div>
            <p className="site-eyebrow">Need the basics first?</p>
            <h2 id="examples-guides-title" className="site-section-title mt-2 text-[1.75rem]">
              See how a Living Page works with your résumé.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-site-secondary">
              Your résumé still handles applications that require a file. Your page gives people
              a clearer link to open in follow-ups, recruiter conversations, and referrals.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/guides/living-page-vs-pdf-resume"
              className="site-button site-button-secondary"
            >
              Read the short guide
            </Link>
            <Link
              href="/guides"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-site-action transition-colors hover:text-site-action-hover"
            >
              Browse all guides
            </Link>
          </div>
        </section>

        <section
          id="examples-final-cta"
          className="site-panel-raised mx-auto mt-12 max-w-[76rem] px-5 py-10 text-center sm:mt-20 sm:px-10 sm:py-12"
        >
          <p className="site-eyebrow">Start with what you already have</p>
          <h2 className="site-section-title mx-auto mt-3 max-w-3xl">
            Turn your résumé into a page you can send as one link.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-site-secondary">
            Create a private draft, review every detail, and publish only when it feels ready.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={getSignupHref("examples_final_start")} className="site-button site-button-primary">
              Create my free page
            </Link>
            <Link href="/" className="site-button site-button-secondary">
              Back to home
            </Link>
          </div>
          <p className="mt-5 text-xs text-site-muted">
            No credit card. No subscription. Private until you publish.
          </p>
        </section>
      </main>

      <MobileStickyCta
        href={getSignupHref("examples_mobile_start")}
        label="Create my free page"
        supportingText="Free · private until published"
        targetId="examples-hero-intro"
        hideNearId="examples-final-cta"
        dismissStorageKey="mlp-examples-sticky-dismissed"
      />
      <SiteLegalFooter siteId={site.id} />
    </div>
  );
}
