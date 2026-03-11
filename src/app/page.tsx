import type { Metadata } from "next";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import LandingNav from "@/components/marketing/LandingNav";
import LandingSampleShowcase from "@/components/marketing/LandingSampleShowcase";
import MobileStickyCta from "@/components/marketing/MobileStickyCta";
import { PRO_PLAN_PRICE } from "@/lib/billing";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import {
  COMPARISON_ROWS,
  CREDIBILITY_POINTS,
  getMarketingSampleGroups,
  PRICING_REASSURANCE,
  PROCESS_STEPS,
} from "@/lib/marketing-samples";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mylivingpage.com";
const ogDescription =
  "Stop being the resume attachment they never open. Build one living page you can keep updating and share everywhere your job search goes.";

export const metadata: Metadata = {
  title: "MyLivingPage | The Page Employers Remember",
  description: ogDescription,
  alternates: { canonical: appUrl },
  openGraph: {
    title: "MyLivingPage | The Page Employers Remember",
    description: ogDescription,
    url: appUrl,
    siteName: "MyLivingPage",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyLivingPage | The Page Employers Remember",
    description: ogDescription,
  },
};

export default async function LandingPage() {
  const site = await getRequestLegalSite();
  const sampleGroups = getMarketingSampleGroups();

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />
      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
          <LandingNav />
        </header>

        <main className="pb-24 md:pb-0">
          <section
            id="hero-section"
            className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl items-start px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-8 md:min-h-[calc(100vh-5rem)] md:items-center md:px-10 md:pb-16 md:pt-10"
          >
            <div className="glass-card relative w-full overflow-hidden rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-5 py-6 shadow-[0_40px_120px_rgba(2,6,23,0.35)] sm:px-8 sm:py-8 md:px-10 md:py-10">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(147,197,253,0.5)] to-transparent" />
              <p className="inline-flex rounded-full border border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.1)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#93C5FD] sm:text-xs sm:tracking-[0.22em]">
                Tired of being another PDF?
              </p>
              <div className="mt-5 max-w-4xl">
                <h1 className="font-heading text-[2.6rem] font-bold leading-[0.96] tracking-[-0.04em] text-[#F0F4FF] sm:text-5xl md:text-6xl lg:text-[4.35rem]">
                  Turn your resume into the page they actually remember.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[rgba(240,244,255,0.76)] sm:text-lg sm:leading-8">
                  Stop being the attachment they never open. Build one professional page you can update in minutes, share with the same link every time, and keep alongside your PDF when an application still requires it.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {CREDIBILITY_POINTS.map((point) => (
                  <span
                    key={point}
                    className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] sm:px-4"
                  >
                    {point}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup?ref=landing_hero_primary"
                  className="gold-pill px-5 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)] sm:px-7 sm:py-4"
                >
                  Build My Page Free
                </Link>
                <Link
                  href="/examples"
                  className="rounded-full border border-[rgba(255,255,255,0.18)] px-5 py-3 text-sm text-[rgba(240,244,255,0.8)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] sm:px-7 sm:py-4"
                >
                  See Sample Pages
                </Link>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-[rgba(240,244,255,0.54)]">
                Use the same link in applications, networking, and follow-ups while keeping your PDF for ATS systems.
              </p>
            </div>
          </section>

          <section id="examples" className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 md:px-10">
            <div className="mb-8 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Sample pages</p>
              <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.02] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl md:text-5xl">
                Explore one job-search scenario at a time.
              </h2>
              <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.66)]">
                These are sample pages, not testimonials. Browse the scenario that feels closest to your search, then see how the same idea could work for your own background.
              </p>
            </div>

            <LandingSampleShowcase groups={sampleGroups} />

            <div className="mt-8 glass-card rounded-[1.75rem] border border-[rgba(59,130,246,0.18)] px-6 py-8 text-center sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Ready to build yours?</p>
              <h3 className="mt-3 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
                Start with the resume you already have.
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-[rgba(240,244,255,0.62)]">
                You do not need a redesign project. Start free, publish when you are ready, and keep improving one link as your search moves.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/signup?ref=landing_samples_mid_cta"
                  className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)]"
                >
                  Build My Page Free
                </Link>
                <Link
                  href="/examples"
                  className="text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
                >
                  Browse all examples
                </Link>
              </div>
            </div>
          </section>

          <section id="comparison" className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 md:px-10">
            <div className="glass-card overflow-hidden rounded-[2rem] border border-[rgba(255,255,255,0.08)]">
              <div className="border-b border-[rgba(255,255,255,0.08)] px-6 py-8 sm:px-10">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Why it works</p>
                <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.04] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl md:text-5xl">
                  Better than sending another dead PDF attachment.
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[rgba(240,244,255,0.68)]">
                  Keep your resume for ATS systems. Use your page to give recruiters and hiring managers a faster, clearer first impression the moment they click.
                </p>
              </div>

              <div className="grid border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(240,244,255,0.42)] md:grid-cols-[1.1fr_1fr_1fr]">
                <div className="px-6 py-4 sm:px-10">Moment</div>
                <div className="border-t border-[rgba(255,255,255,0.08)] px-6 py-4 md:border-l md:border-t-0">Static resume</div>
                <div className="border-t border-[rgba(255,255,255,0.08)] px-6 py-4 text-[#93C5FD] md:border-l md:border-t-0">MyLivingPage</div>
              </div>

              <div>
                {COMPARISON_ROWS.map((row, index) => (
                  <div
                    key={row.label}
                    className={`grid gap-4 px-6 py-6 md:grid-cols-[1.1fr_1fr_1fr] md:gap-0 md:px-10 ${
                      index < COMPARISON_ROWS.length - 1 ? "border-b border-[rgba(255,255,255,0.08)]" : ""
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">{row.label}</p>
                    </div>
                    <p className="text-sm leading-7 text-[rgba(240,244,255,0.64)] md:pr-8">{row.resume}</p>
                    <p className="text-sm leading-7 text-[rgba(240,244,255,0.82)] md:border-l md:border-[rgba(255,255,255,0.08)] md:pl-8">{row.livingPage}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="how" className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 md:px-10">
            <div className="mb-8 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">How it works</p>
              <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.04] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl md:text-5xl">
                From existing resume to live page in three steps.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {PROCESS_STEPS.map((step, index) => (
                <article
                  key={step.title}
                  className="glass-card rounded-3xl border border-[rgba(255,255,255,0.08)] p-6 sm:p-8"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(59,130,246,0.45)] font-mono text-base text-[#93C5FD]">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3 className="font-heading text-2xl font-bold text-[#F0F4FF]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.64)]">{step.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 md:px-10">
            <div className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Pricing</p>
                  <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.04] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl">
                    Everything you need to get noticed is free.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.66)]">
                    Start with one living page, keep your PDF for ATS systems, and upgrade later only if you want premium themes, share-ready exports, and a cleaner branded page.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      href="/signup?ref=landing_pricing_primary"
                      className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)]"
                    >
                      Build My Page Free
                    </Link>
                    <Link
                      href="/pricing"
                      className="text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
                    >
                      See full pricing
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:min-w-[460px] lg:max-w-[480px]">
                  <div className="rounded-3xl border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.09)] p-5 shadow-[0_0_40px_rgba(59,130,246,0.08)] ring-1 ring-[rgba(59,130,246,0.16)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">Start here</p>
                      <span className="rounded-full border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#BFDBFE]">
                        Free
                      </span>
                    </div>
                    <ul className="mt-4 space-y-3 text-sm text-[rgba(240,244,255,0.76)]">
                      {PRICING_REASSURANCE.free.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <span className="mt-0.5 text-[#5BD67C]">&#10003;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/signup?ref=landing_pricing_free_card"
                      className="mt-6 block w-full rounded-full border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.04)] py-3 text-center text-sm font-semibold text-[#F0F4FF] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#BFDBFE]"
                    >
                      Build My Page Free
                    </Link>
                  </div>

                  <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(240,244,255,0.48)]">Upgrade later</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-heading text-4xl font-bold text-[#F0F4FF]">{PRO_PLAN_PRICE.amountLabel}</span>
                      <span className="text-sm text-[rgba(240,244,255,0.42)]">{PRO_PLAN_PRICE.intervalLabel}</span>
                    </div>
                    <ul className="mt-4 space-y-3 text-sm text-[rgba(240,244,255,0.72)]">
                      {PRICING_REASSURANCE.pro.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <span className="mt-0.5 text-[#93C5FD]">&#10003;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/pricing"
                      className="mt-6 block w-full rounded-full border border-[rgba(255,255,255,0.14)] py-3 text-center text-sm font-semibold text-[rgba(240,244,255,0.74)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                    >
                      See full pricing
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-4xl px-4 pb-20 text-center sm:px-6 sm:pb-24 md:px-10">
            <div className="glass-card rounded-[2rem] border border-[rgba(59,130,246,0.2)] px-6 py-10 sm:px-10 sm:py-12">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Ready when you are</p>
              <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.04] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl md:text-[3.2rem]">
                Your next application deserves more than another attachment.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[rgba(240,244,255,0.66)]">
                Start with the resume you already have, publish a page that feels current, and keep the same link everywhere your search goes.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/signup?ref=landing_final_cta"
                  className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)] sm:px-8 sm:py-4"
                >
                  Build My Page Free
                </Link>
                <Link
                  href="/examples"
                  className="rounded-full border border-[rgba(255,255,255,0.18)] px-6 py-3 text-sm text-[rgba(240,244,255,0.8)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] sm:px-8 sm:py-4"
                >
                  Browse Sample Pages
                </Link>
              </div>
            </div>
          </section>
        </main>

        <SiteLegalFooter siteId={site.id} />
        <MobileStickyCta href="/signup?ref=landing_mobile_sticky" label="Build My Page Free" targetId="hero-section" />
      </div>
    </div>
  );
}
