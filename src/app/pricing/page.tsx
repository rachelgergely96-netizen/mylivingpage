import type { Metadata } from "next";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import LandingNav from "@/components/marketing/LandingNav";
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";
import { GUIDES } from "@/lib/guides";
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
  const seoGuides = GUIDES.slice(0, 3);
  const site = await getRequestLegalSite();

  return (
    <div className="profile-shell relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />

      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-[rgba(147,197,253,0.2)] bg-[rgba(5,16,34,0.9)] shadow-[0_4px_18px_rgba(2,6,23,0.3)] backdrop-blur-xl">
          <LandingNav />
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
          <ProfileWindow
            title="account://free-plan"
            status={<span className="profile-status">Available now</span>}
            contentClassName="p-5 sm:p-7 md:p-8"
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-start">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#93C5FD]">
                  Simple pricing: free
                </p>
                <h1 className="mt-3 font-heading text-4xl font-bold leading-[1.04] tracking-[-0.035em] text-[#F0F4FF] sm:text-5xl">
                  {SITE_TAGLINE}.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-[rgba(240,244,255,0.7)]">
                  {SITE_DESCRIPTION}
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    href="/signup?ref=pricing_free&next=/create"
                    className="gold-pill px-6 py-3 text-sm font-semibold"
                  >
                    Build My Free Resume
                  </Link>
                  <Link href="/examples" className="profile-action">
                    See Sample Pages
                  </Link>
                </div>
              </div>

              <ProfilePanel
                title="Account details"
                meta="No tier selection"
                contentClassName="p-0"
                as="aside"
              >
                <div className="border-b border-[rgba(125,170,255,0.14)] px-4 py-5 text-center">
                  <p className="font-heading text-6xl font-bold text-[#F0F4FF]">$0</p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-[#93C5FD]">
                    Forever
                  </p>
                </div>
                <dl className="profile-meta-grid">
                  <dt className="profile-meta-label">Credit card</dt>
                  <dd className="profile-meta-value">Not required</dd>
                  <dt className="profile-meta-label">Trial</dt>
                  <dd className="profile-meta-value">None</dd>
                  <dt className="profile-meta-label">Paid plan</dt>
                  <dd className="profile-meta-value">None</dd>
                  <dt className="profile-meta-label">Publishing</dt>
                  <dd className="profile-meta-value">You choose when it goes live</dd>
                </dl>
              </ProfilePanel>
            </div>
          </ProfileWindow>

          <ProfileWindow
            title="membership://everything-included"
            status="All features unlocked"
            className="mt-10"
            contentClassName="p-5 sm:p-6 md:p-7"
          >
            <div className="border-b border-[rgba(125,170,255,0.14)] pb-6">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#93C5FD]">
                Everything included
              </p>
              <h2 className="mt-2 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl">
                One complete living-resume toolkit.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[rgba(240,244,255,0.68)]">
                No tiers to compare and no features held back. Build once, then use the format that
                fits the moment.
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {FREE_PRODUCT_FEATURE_GROUPS.map((group) => (
                <ProfilePanel
                  key={group.name}
                  title={group.name}
                  meta="Included"
                  contentClassName="flex h-full flex-col p-4 sm:p-5"
                  as="article"
                >
                  <p className="text-sm leading-7 text-[rgba(240,244,255,0.68)]">{group.body}</p>
                  <ul className="mt-4 space-y-2.5 border-t border-[rgba(125,170,255,0.12)] pt-4 text-sm text-[rgba(240,244,255,0.8)]">
                    {group.features.map((item) => (
                      <li key={`${group.name}-${item}`} className="flex items-start gap-2.5">
                        <span className="mt-0.5 text-[#86EFAC]" aria-hidden="true">
                          &#10003;
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </ProfilePanel>
              ))}
            </div>

            <ProfilePanel
              title="Account promise"
              meta="$0 means $0"
              className="mt-6"
              contentClassName="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              as="div"
            >
              <div>
                <p className="font-semibold text-[#F0F4FF]">No card. No trial. No paid plan.</p>
                <p className="mt-1 text-sm leading-6 text-[rgba(240,244,255,0.66)]">
                  Nothing publishes until you choose, and you can update your page whenever you
                  want.
                </p>
              </div>
              <Link
                href="/signup?ref=pricing_free&next=/create"
                className="gold-pill shrink-0 px-6 py-3 text-center text-sm font-semibold"
              >
                Build My Free Resume
              </Link>
            </ProfilePanel>

            <p className="mt-5 text-xs leading-6 text-[rgba(240,244,255,0.58)]">
              {ATS_READINESS_DISCLOSURE}
            </p>
          </ProfileWindow>

          <section className="mt-10 pb-12 sm:pb-16" aria-labelledby="pricing-guides-heading">
            <ProfileWindow
              title="bulletins://learn-before-you-publish"
              status={`${seoGuides.length} posts`}
              contentClassName="p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 border-b border-[rgba(125,170,255,0.14)] pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-3xl">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#93C5FD]">
                    Guides
                  </p>
                  <h2
                    id="pricing-guides-heading"
                    className="mt-2 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl"
                  >
                    Learn the mechanics before you publish.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.68)]">
                    The product is free. These guides help you tighten the Resume PDF, sharpen
                    recruiter search language, and understand when a Living Page adds value beyond
                    an attachment.
                  </p>
                </div>
                <Link href="/guides" className="profile-link shrink-0 text-sm font-semibold">
                  Browse all guides
                </Link>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {seoGuides.map((guide) => (
                  <ProfilePanel
                    key={guide.slug}
                    title={guide.decisionStage}
                    meta={guide.readTime}
                    contentClassName="p-4"
                    as="article"
                  >
                    <h3>
                      <Link
                        href={`/guides/${guide.slug}`}
                        className="profile-link font-heading text-2xl font-bold leading-tight"
                      >
                        {guide.title}
                      </Link>
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.68)]">
                      {guide.hubSummary}
                    </p>
                  </ProfilePanel>
                ))}
              </div>
            </ProfileWindow>
          </section>
        </main>

        <SiteLegalFooter siteId={site.id} />
      </div>
    </div>
  );
}
