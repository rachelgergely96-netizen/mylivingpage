import type { Metadata } from "next";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import GuideLinkGrid from "@/components/marketing/GuideLinkGrid";
import SamplePageCard from "@/components/marketing/SamplePageCard";
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
        ]}
        cta={{
          href: getSignupHref("examples_nav_start"),
          label: "Create Your Page (Free)",
          mobileLabel: "Build free",
        }}
      />

      <main id="main-content" className="site-container py-12 sm:py-16">
        <section className="site-panel-raised px-5 py-10 sm:px-10 sm:py-12">
          <p className="site-eyebrow">Sample pages</p>
          <h1 className="site-page-title mt-4 max-w-4xl">
            See what the decision page can look like once someone is considering you.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-site-secondary sm:text-lg">
            These are scenario demos, not customer testimonials. Use them to see how different
            follow-up moments can be framed once someone opens your link and wants faster context.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={getSignupHref("examples_after_apply")} className="site-button site-button-primary">
              Create Your Page (Free)
            </Link>
            <Link href="/pricing" className="site-button site-button-secondary">
              See What&apos;s Included
            </Link>
          </div>
        </section>

        <div className="mt-12 space-y-14 sm:mt-16 sm:space-y-20">
          {sampleGroups.map((group) => (
            <section key={group.id} aria-labelledby={`${group.id}-heading`}>
              <div className="mb-8 max-w-3xl border-l-2 border-site-action pl-4">
                <h2 id={`${group.id}-heading`} className="site-eyebrow">
                  {group.title}
                </h2>
                <p className="mt-3 text-base leading-7 text-site-secondary">{group.description}</p>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {group.samples.map((sample) => (
                  <SamplePageCard
                    key={sample.id}
                    sample={sample}
                    anchorId={sample.id}
                    interactivePreview={false}
                    previewHeight={500}
                    signupHref={getSignupHref(`examples_${sample.id}`)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <GuideLinkGrid
          eyebrow="Guides"
          title="Read the guide sequence behind these examples."
          description="Use the guides in order: check whether the Resume PDF reads cleanly, make sure the search terms are explicit, then decide how to use a page after the click."
          className="mt-14 sm:mt-20"
        />

        <section className="site-panel-raised mt-14 px-5 py-10 text-center sm:mt-20 sm:px-10 sm:py-12">
          <h2 className="site-section-title">Ready to create one page you can actually send?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-site-secondary">
            Upload your info once. Then publish one page that is easier for people to scan in
            follow-ups, referrals, recruiter outreach, and any other moment someone is deciding
            whether to move forward.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={getSignupHref("examples_final_start")} className="site-button site-button-primary">
              Create Your Page (Free)
            </Link>
            <Link href="/" className="site-button site-button-secondary">
              Back to Home
            </Link>
          </div>
        </section>
      </main>

      <SiteLegalFooter siteId={site.id} />
    </div>
  );
}
