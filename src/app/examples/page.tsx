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
  title: `Examples | ${SITE_NAME}`,
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

      <main id="main-content" className="site-container-wide py-8 sm:py-10">
        <ExamplesExperience
          sampleGroups={sampleGroups}
          signupHref={getSignupHref("examples_after_apply")}
        />

        <p className="mt-6 border-y border-site-border px-1 py-4 text-sm text-site-secondary">
          Need the résumé vs. page distinction?{" "}
          <Link
            href="/guides/living-page-vs-pdf-resume"
            className="font-semibold text-site-action hover:text-site-action-hover"
          >
            Read the short guide
          </Link>
          .
        </p>

        <section
          id="examples-final-cta"
          className="site-panel-raised mt-6 px-5 py-8 text-center sm:px-10 sm:py-10"
        >
          <p className="site-eyebrow">Ready when you are</p>
          <h2 className="site-section-title mx-auto mt-3 max-w-3xl">
            Turn your résumé into one link.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-site-secondary">
            Private draft first. Publish only when it feels ready.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href={getSignupHref("examples_final_start")} className="site-button site-button-primary">
              Create my free page
            </Link>
          </div>
          <p className="mt-5 text-xs text-site-muted">
            No credit card · No subscription · Private until you publish
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
