import type { Metadata } from "next";
import Link from "next/link";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import LandingNav from "@/components/marketing/LandingNav";
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

export default function PricingPage() {
  const seoGuides = GUIDES.slice(0, 3);

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />
      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
          <LandingNav />
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

          <section className="glass-card mt-10 overflow-hidden rounded-[2rem] border border-[rgba(96,165,250,0.18)] p-5 shadow-[0_30px_100px_rgba(2,6,23,0.36)] sm:p-8 lg:p-10">
            <div className="flex flex-col gap-6 border-b border-[rgba(255,255,255,0.08)] pb-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#93C5FD]">
                  Everything included
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl">
                  One complete living-resume toolkit.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[rgba(240,244,255,0.64)]">
                  No tiers to compare and no features held back. Build once, then use the format that fits the moment.
                </p>
              </div>
              <div className="sm:text-right">
                <p className="font-heading text-5xl font-bold text-[#F0F4FF]">$0</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.46)]">
                  Forever
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              {FREE_PRODUCT_FEATURE_GROUPS.map((group) => (
                <article
                  key={group.name}
                  className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] p-5 sm:p-6"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#93C5FD]">
                    {group.eyebrow}
                  </p>
                  <h3 className="mt-3 font-heading text-2xl font-bold text-[#F0F4FF]">
                    {group.name}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
                    {group.body}
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm text-[rgba(240,244,255,0.76)]">
                    {group.features.map((item) => (
                      <li key={`${group.name}-${item}`} className="flex items-start gap-2.5">
                        <span className="mt-0.5 text-[#93C5FD]">&#10003;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-4 rounded-3xl border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.08)] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[#F0F4FF]">No card. No trial. No paid plan.</p>
                <p className="mt-1 text-sm text-[rgba(240,244,255,0.58)]">
                  Nothing publishes until you choose, and you can update your page whenever you want.
                </p>
              </div>
              <Link
                href="/signup?ref=pricing_free&next=/create"
                className="gold-pill shrink-0 px-6 py-3 text-center text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_34px_rgba(59,130,246,0.3)]"
              >
                Build My Free Resume
              </Link>
            </div>

            <p className="mt-5 text-xs leading-6 text-[rgba(240,244,255,0.5)]">
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
      </div>
    </div>
  );
}
