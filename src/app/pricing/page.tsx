import type { Metadata } from "next";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import GuideLinkGrid from "@/components/marketing/GuideLinkGrid";
import SiteHeader from "@/components/marketing/SiteHeader";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import {
  ATS_READINESS_DISCLOSURE,
  FREE_PRODUCT_FEATURE_GROUPS,
} from "@/lib/marketing-samples";
import {
  getAbsoluteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/site";

const canonicalUrl = getAbsoluteUrl("/pricing");

export const metadata: Metadata = {
  title: `Simple Pricing: Free | ${SITE_NAME}`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: `Simple Pricing: Free | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    url: canonicalUrl,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Simple Pricing: Free | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
  },
};

export default async function PricingPage() {
  const site = await getRequestLegalSite();

  return (
    <div className="site-shell" data-site-ui>
      <SiteHeader
        brandName={site.brandName}
        links={[
          { href: "/examples", label: "Examples" },
          { href: "/guides", label: "Guides" },
          { href: "/pricing", label: "Free", current: true },
          { href: "/login", label: "Sign in" },
        ]}
        cta={{
          href: "/signup?ref=pricing_nav&next=/create",
          label: "Create my free page",
          mobileLabel: "Start free",
        }}
      />

      <main id="main-content" className="site-container py-14 sm:py-20">
        <section className="site-panel-raised px-5 py-10 text-center sm:px-10 sm:py-14">
          <p className="site-eyebrow">Simple pricing: free</p>
          <h1 className="site-page-title mx-auto mt-4 max-w-4xl">{SITE_TAGLINE}.</h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-site-secondary sm:text-lg">
            {SITE_DESCRIPTION}
          </p>
          <p className="mx-auto mt-5 max-w-2xl border-l-2 border-site-success pl-4 text-left text-sm leading-6 text-site-secondary">
            No credit card. No trial expiration. No hidden publishing, hosting, or download fee.
          </p>
        </section>

        <section aria-label="Everything included for free" className="mt-8 grid gap-5 lg:grid-cols-3">
          {FREE_PRODUCT_FEATURE_GROUPS.map((group, index) => {
            const featured = index === FREE_PRODUCT_FEATURE_GROUPS.length - 1;

            return (
              <article
                key={group.name}
                className={`flex h-full flex-col p-6 sm:p-7 ${
                  featured ? "site-panel-raised border-site-action" : "site-panel"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="site-eyebrow">{group.eyebrow}</p>
                    <h2 className="site-section-title mt-2 text-[2rem]">{group.name}</h2>
                  </div>
                  {featured ? <span className="site-badge">Included</span> : null}
                </div>

                <p className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-site-text">Free</p>
                <p className="mt-4 text-sm leading-6 text-site-secondary">{group.body}</p>

                <ul className="mt-6 flex-1 space-y-3 text-sm text-site-secondary">
                  {group.features.map((item) => (
                    <li key={`${group.name}-${item}`} className="flex items-start gap-3">
                      <span aria-hidden="true" className="mt-0.5 font-bold text-site-success">
                        &#10003;
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/signup?ref=pricing_free_${index + 1}&next=/create`}
                  className={`site-button mt-8 w-full ${
                    featured ? "site-button-primary" : "site-button-secondary"
                  }`}
                >
                  Create my free page
                </Link>
              </article>
            );
          })}
        </section>

        <section className="site-callout mt-8 p-5 text-sm sm:p-6">
          <p className="leading-7">
            No card. No trial. No paid plan is required or newly offered. Build and publish one
            Living Page, then keep the same link, ATS-ready PDF, and share card current as your
            experience grows.
          </p>
          <p className="mt-3 text-xs leading-6 text-site-muted">
            Already have a legacy subscription? It may continue until canceled in account
            settings. Your free access remains after cancellation.
          </p>
          <p className="mt-3 text-xs leading-6 text-site-muted">{ATS_READINESS_DISCLOSURE}</p>
        </section>

        <GuideLinkGrid
          eyebrow="Guides"
          title="Learn the mechanics before you publish."
          description="The product is free. These guides help you tighten the Resume PDF, sharpen recruiter search language, and understand when a Living Page adds value beyond an attachment."
          className="mt-14 sm:mt-20"
        />
      </main>

      <SiteLegalFooter siteId={site.id} />
    </div>
  );
}
