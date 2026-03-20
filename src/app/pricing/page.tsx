import type { Metadata } from "next";
import Link from "next/link";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import { PRO_PLAN_PRICE } from "@/lib/billing";
import { GUIDES } from "@/lib/guides";
import { PRICING_REASSURANCE } from "@/lib/marketing-samples";
import { getAbsoluteUrl, SITE_NAME } from "@/lib/site";
const canonicalUrl = getAbsoluteUrl("/pricing");

export const metadata: Metadata = {
  title: `Pricing | ${SITE_NAME}`,
  description:
    "One month of free MyLivingPage hosting, then $9.99/month to keep your page live.",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: `Pricing | ${SITE_NAME}`,
    description:
      "One month of free MyLivingPage hosting, then $9.99/month to keep your page live.",
    url: canonicalUrl,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Pricing | ${SITE_NAME}`,
    description:
      "One month of free MyLivingPage hosting, then $9.99/month to keep your page live.",
  },
};

export default function PricingPage() {
  const seoGuides = GUIDES.slice(0, 3);

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />
      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
          <nav className="mx-auto flex h-16 sm:h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 md:px-10">
            <Link href="/" className="font-heading text-xl sm:text-2xl font-bold text-[#F0F4FF]">
              my<span className="text-[#3B82F6]">living</span>page
            </Link>
            <div className="hidden items-center gap-8 text-xs uppercase tracking-[0.18em] text-[rgba(240,244,255,0.6)] md:flex">
              <Link href="/#examples" className="transition-colors hover:text-[#93C5FD]">
                Examples
              </Link>
              <Link href="/#comparison" className="transition-colors hover:text-[#93C5FD]">
                Why It Works
              </Link>
              <Link href="/pricing" className="text-[#93C5FD]">
                Pricing
              </Link>
            </div>
            <Link
              href="/signup?ref=pricing_nav"
              className="gold-pill px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)]"
            >
              Start Your Free Month
            </Link>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24 md:px-10">
          {/* Header */}
          <div className="mb-12 text-center sm:mb-16">
            <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#3B82F6]">Pricing</p>
            <h1 className="font-heading text-3xl font-bold text-[#F0F4FF] sm:text-5xl md:text-6xl">
              One month free, then simple monthly hosting
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[rgba(240,244,255,0.6)]">
              New accounts get one month of free live hosting with every feature unlocked. After that, keep your page live for {PRO_PLAN_PRICE.displayLabel}.
            </p>
          </div>

          <div className="mx-auto max-w-3xl rounded-2xl border border-[rgba(59,130,246,0.3)] bg-[rgba(10,22,40,0.55)] p-6 shadow-[0_0_40px_rgba(59,130,246,0.08)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.18em] text-[#3B82F6]">Hosting</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-4xl font-bold text-[#F0F4FF]">Free for 30 days</span>
                </div>
                <p className="mt-3 text-sm text-[rgba(240,244,255,0.62)]">
                  Start with your current info, publish a live page, and keep every feature unlocked during the first month.
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">Then</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-heading text-4xl font-bold text-[#F0F4FF]">{PRO_PLAN_PRICE.amountLabel}</span>
                  <span className="text-sm text-[rgba(240,244,255,0.4)]">{PRO_PLAN_PRICE.intervalLabel}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">During the free month</p>
                <ul className="mt-4 space-y-3">
                  {PRICING_REASSURANCE.trial.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[rgba(240,244,255,0.74)]">
                      <span className="mt-0.5 text-[#5BD67C]">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">If you want the page to stay live</p>
                <ul className="mt-4 space-y-3">
                  {PRICING_REASSURANCE.subscription.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[rgba(240,244,255,0.74)]">
                      <span className="mt-0.5 text-[#3B82F6]">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Link
              href="/signup?ref=pricing_free_card"
              className="gold-pill mt-8 block w-full py-3 text-center text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)]"
            >
              Start Your Free Month
            </Link>
          </div>

          <section className="mx-auto mt-16 max-w-5xl sm:mt-20">
            <div className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-8 sm:px-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#3B82F6]">Guides</p>
                  <h2 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl">
                    Learn the search mechanics before you compare plans.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.62)]">
                    Pricing only matters after the fundamentals work. These guides explain how to check your Resume PDF, sharpen recruiter search language, and decide where a Living Page fits beside your PDF.
                  </p>
                </div>
                <Link
                  href="/guides"
                  className="text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
                >
                  Browse all resume and recruiter guides
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
                    <h3 className="mt-3 font-heading text-2xl font-bold text-[#F0F4FF]">{guide.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.6)]">{guide.hubSummary}</p>
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
