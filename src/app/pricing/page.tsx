import type { Metadata } from "next";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import { GUIDES } from "@/lib/guides";
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
import { getRequestLegalSite } from "@/lib/legal/request-site";

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
  const seoGuides = GUIDES.slice(0, 3);

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />
      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
          <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 md:px-10">
            <Link href="/" className="font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl">
              my<span className="text-[#3B82F6]">living</span>page
            </Link>
            <div className="hidden items-center gap-8 text-xs uppercase tracking-[0.18em] text-[rgba(240,244,255,0.6)] md:flex">
              <Link href="/examples" className="transition-colors hover:text-[#93C5FD]">
                Examples
              </Link>
              <Link href="/#pricing" className="transition-colors hover:text-[#93C5FD]">
                Free
              </Link>
              <Link href="/pricing" className="text-[#93C5FD]">
                What&apos;s Included
              </Link>
            </div>
            <Link
              href="/signup?ref=pricing_nav&next=/create"
              className="gold-pill px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)]"
            >
              Create Your Resume
            </Link>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 md:px-10">
          <section className="text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-[#3B82F6]">Simple pricing: free</p>
            <h1 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-5xl md:text-6xl">
              {SITE_TAGLINE}.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[rgba(240,244,255,0.62)]">
              {SITE_DESCRIPTION}
            </p>
          </section>

          <section className="mt-10 grid gap-5 lg:grid-cols-3">
            {FREE_PRODUCT_FEATURE_GROUPS.map((group, index) => {
              const featured = index === FREE_PRODUCT_FEATURE_GROUPS.length - 1;

              return (
                <article
                  key={group.name}
                  className={`rounded-3xl border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-7 ${
                    featured
                      ? "border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.12)]"
                      : "border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.55)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#93C5FD]">
                        {group.eyebrow}
                      </p>
                      <h2 className="mt-2 font-heading text-3xl font-bold text-[#F0F4FF]">
                        {group.name}
                      </h2>
                    </div>
                    {featured ? (
                      <span className="rounded-full border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.18)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#BFDBFE]">
                        Included
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-5 font-heading text-4xl font-bold text-[#F0F4FF]">Free</p>
                  <p className="mt-4 text-sm leading-6 text-[rgba(240,244,255,0.64)]">
                    {group.body}
                  </p>

                  <ul className="mt-6 space-y-3 text-sm text-[rgba(240,244,255,0.78)]">
                    {group.features.map((item) => (
                      <li key={`${group.name}-${item}`} className="flex items-start gap-2.5">
                        <span className="mt-0.5 text-[#93C5FD]">&#10003;</span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup?ref=pricing_free&next=/create"
                    className={`mt-8 block w-full rounded-full py-3 text-center text-sm font-semibold transition-all duration-300 ${
                      featured
                        ? "gold-pill hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)]"
                        : "border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.04)] text-[#F0F4FF] hover:border-[rgba(59,130,246,0.35)] hover:text-[#BFDBFE]"
                    }`}
                  >
                    Create Your Living Resume
                  </Link>
                </article>
              );
            })}
          </section>

          <section className="mt-8 rounded-3xl border border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.08)] p-5 text-sm text-[rgba(240,244,255,0.74)] sm:p-6">
            <p>
              No card. No trial. No paid plan is required or newly offered. Build and publish one
              living resume, then keep the same link, ATS-ready PDF, and share card current as your
              experience grows.
            </p>
            <p className="mt-3 text-xs leading-6 text-[rgba(240,244,255,0.52)]">
              Already have a legacy subscription? It may continue until canceled in account
              settings. Your free access remains after cancellation.
            </p>
            <p className="mt-3 text-xs leading-6 text-[rgba(240,244,255,0.52)]">
              {ATS_READINESS_DISCLOSURE}
            </p>
          </section>

          <section className="mx-auto mt-16 max-w-5xl sm:mt-20">
            <div className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-8 sm:px-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#3B82F6]">Guides</p>
                  <h2 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl">
                    Learn the mechanics before you publish.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.62)]">
                    The product is free. These guides help you tighten the Resume PDF, sharpen
                    recruiter search language, and understand when a Living Page adds value beyond
                    an attachment.
                  </p>
                </div>
                <Link
                  href="/guides"
                  className="text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
                >
                  Browse all guides
                </Link>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {seoGuides.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-5 transition-all hover:-translate-y-0.5 hover:border-[rgba(59,130,246,0.28)]"
                  >
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Guide</p>
                    <h3 className="mt-3 font-heading text-2xl font-bold text-[#F0F4FF]">
                      {guide.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.6)]">
                      {guide.hubSummary}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>
        <SiteLegalFooter siteId={site.id} />
      </div>
    </div>
  );
}
