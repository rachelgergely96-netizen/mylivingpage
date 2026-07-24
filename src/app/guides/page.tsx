import type { Metadata } from "next";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import GuideLinkGrid from "@/components/marketing/GuideLinkGrid";
import SiteHeader from "@/components/marketing/SiteHeader";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import { getAbsoluteUrl, SITE_NAME } from "@/lib/site";

const title = `Resume PDF and Living Page Guides | ${SITE_NAME}`;
const description =
  "Answer-first guides on checking your Resume PDF, improving search visibility, and using a Living Page alongside your PDF.";
const canonicalUrl = getAbsoluteUrl("/guides");

function getSignupHref(ref: string) {
  return `/signup?ref=${ref}&next=/create`;
}

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title,
    description,
    url: canonicalUrl,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default async function GuidesPage() {
  const site = await getRequestLegalSite();

  return (
    <div className="site-shell" data-site-ui>
      <SiteHeader
        brandName={site.brandName}
        links={[
          { href: "/examples", label: "Examples" },
          { href: "/guides", label: "Guides", current: true },
          { href: "/pricing", label: "Free" },
          { href: "/login", label: "Sign in" },
        ]}
        cta={{
          href: getSignupHref("guides_nav_start"),
          label: "Create my free page",
          mobileLabel: "Start free",
        }}
      />

      <main id="main-content" className="site-container py-12 sm:py-16">
        <section className="site-panel-raised px-5 py-10 sm:px-10 sm:py-12">
          <p className="site-eyebrow">Guides</p>
          <h1 className="site-page-title mt-4 max-w-4xl">
            Use the right guide at the right moment in the funnel.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-site-secondary sm:text-lg">
            Start with the information you already use. First make sure the Resume PDF reads
            cleanly, then make sure the right terms are visible, then decide how to use a Living
            Page after a human clicks.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={getSignupHref("guides_start_here")} className="site-button site-button-primary">
              Create my free page
            </Link>
            <Link href="/pricing" className="site-button site-button-secondary">
              See what&apos;s included
            </Link>
          </div>
        </section>

        <GuideLinkGrid
          eyebrow="Start here"
          title="Three practical guides, in the order active applicants usually need them"
          description="Guide one helps you check the file. Guide two helps you match recruiter search behavior. Guide three shows where a Living Page fits after the click."
          className="mt-12"
        />

        <section className="site-panel-raised mt-14 px-5 py-10 text-center sm:mt-20 sm:px-10 sm:py-12">
          <h2 className="site-section-title">
            Ready to start from the information you already use?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-site-secondary">
            Upload your info once, publish a clearer page, and keep the Resume PDF aligned to the
            same saved content.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={getSignupHref("guides_final_start")} className="site-button site-button-primary">
              Create my free page
            </Link>
            <Link href="/examples" className="site-button site-button-secondary">
              See sample pages
            </Link>
          </div>
        </section>
      </main>

      <SiteLegalFooter siteId={site.id} />
    </div>
  );
}
