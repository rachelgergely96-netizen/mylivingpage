import type { Metadata } from "next";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import LandingNav from "@/components/marketing/LandingNav";
import SamplePageCard from "@/components/marketing/SamplePageCard";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import {
  COMPARISON_ROWS,
  CREDIBILITY_POINTS,
  getMarketingSamples,
  PRICING_REASSURANCE,
  PROCESS_STEPS,
} from "@/lib/marketing-samples";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mylivingpage.com";
const ogDescription =
  "Turn your resume into a living page you can update in minutes, share everywhere, and use alongside your PDF while you search.";

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

export default function LandingPage() {
  const site = getRequestLegalSite();
  const samples = getMarketingSamples();

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />
      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
          <LandingNav />
        </header>

        <main>
          <section className="mx-auto flex min-h-[86vh] w-full max-w-7xl items-center px-4 py-16 sm:px-6 sm:py-24 md:px-10">
            <div className="glass-card relative w-full overflow-hidden rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-12 shadow-[0_40px_120px_rgba(2,6,23,0.35)] sm:px-10 sm:py-16">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(147,197,253,0.6)] to-transparent" />
              <p className="inline-flex rounded-full border border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.1)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#93C5FD]">
                For active job seekers
              </p>
              <div className="mt-8 max-w-5xl">
                <h1 className="font-heading text-4xl font-bold leading-[1.02] tracking-[-0.04em] text-[#F0F4FF] sm:text-6xl md:text-7xl">
                  Turn your resume into the page they actually remember.
                </h1>
                <p className="mt-6 max-w-3xl text-base leading-8 text-[rgba(240,244,255,0.72)] sm:text-lg">
                  Build one living page you can update in minutes, share everywhere, and keep alongside your PDF while you apply. It is faster to send, easier to maintain, and harder to ignore.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-10">
                <Link
                  href="/signup?ref=landing_hero_primary"
                  className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)] sm:px-8 sm:py-4"
                >
                  Build My Page Free
                </Link>
                <Link
                  href="/examples"
                  className="rounded-full border border-[rgba(255,255,255,0.18)] px-6 py-3 text-sm text-[rgba(240,244,255,0.76)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] sm:px-8 sm:py-4"
                >
                  See Sample Pages
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-[rgba(240,244,255,0.44)]">
                <span className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-4 py-2">Free to start</span>
                <span className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-4 py-2">Keep your PDF</span>
                <span className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-4 py-2">No design skills</span>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6 sm:pb-8 md:px-10">
            <div className="glass-card rounded-[1.75rem] border border-[rgba(255,255,255,0.08)] px-4 py-5 sm:px-6">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {CREDIBILITY_POINTS.map((point) => (
                  <span
                    key={point}
                    className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(240,244,255,0.62)]"
                  >
                    {point}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section id="examples" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
            <div className="mb-10 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Sample pages</p>
              <h2 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl md:text-5xl">
                See what this looks like in real job-search moments.
              </h2>
              <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.62)]">
                These are sample pages, not testimonials. Each one shows how a living page can support a different kind of search without forcing you to rebuild everything from scratch.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {samples.map((sample) => (
                <SamplePageCard
                  key={sample.id}
                  sample={sample}
                  signupHref={`/signup?ref=${sample.ctaRef}`}
                  previewHref={`/examples#${sample.id}`}
                />
              ))}
            </div>
          </section>

          <section id="comparison" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
            <div className="glass-card overflow-hidden rounded-[2rem] border border-[rgba(255,255,255,0.08)]">
              <div className="border-b border-[rgba(255,255,255,0.08)] px-6 py-8 sm:px-10">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Why it works</p>
                <h2 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl md:text-5xl">
                  Better than sending another dead PDF attachment.
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[rgba(240,244,255,0.62)]">
                  You still keep your resume for ATS systems. This is the page that gives the rest of your application a stronger first impression.
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
                    <p className="text-sm leading-7 text-[rgba(240,244,255,0.56)] md:pr-8">{row.resume}</p>
                    <p className="text-sm leading-7 text-[rgba(240,244,255,0.78)] md:border-l md:border-[rgba(255,255,255,0.08)] md:pl-8">{row.livingPage}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="how" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
            <div className="mb-10 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">How it works</p>
              <h2 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl md:text-5xl">
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
                  <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.58)]">{step.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
            <div className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Pricing</p>
                  <h2 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl">
                    Start free now. Upgrade only when you need more polish.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.62)]">
                    The landing page should reduce friction, not force a pricing decision too early. Start with the free page, then move to Pro when the extras matter.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      href="/signup?ref=landing_pricing_primary"
                      className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)]"
                    >
                      Start Free
                    </Link>
                    <Link
                      href="/pricing"
                      className="text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
                    >
                      See full pricing
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:min-w-[420px] lg:max-w-[440px]">
                  <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(240,244,255,0.42)]">Start free</p>
                    <ul className="mt-4 space-y-3 text-sm text-[rgba(240,244,255,0.68)]">
                      {PRICING_REASSURANCE.free.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <span className="mt-0.5 text-[#5BD67C]">&#10003;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-3xl border border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.07)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">Upgrade later</p>
                    <ul className="mt-4 space-y-3 text-sm text-[rgba(240,244,255,0.72)]">
                      {PRICING_REASSURANCE.pro.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <span className="mt-0.5 text-[#93C5FD]">&#10003;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-4xl px-4 pb-16 text-center sm:px-6 sm:pb-24 md:px-10">
            <div className="glass-card rounded-[2rem] border border-[rgba(59,130,246,0.2)] px-6 py-10 sm:px-10 sm:py-12">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Ready when you are</p>
              <h2 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl md:text-5xl">
                Send something better than another attachment.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[rgba(240,244,255,0.62)]">
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
                  className="rounded-full border border-[rgba(255,255,255,0.18)] px-6 py-3 text-sm text-[rgba(240,244,255,0.76)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] sm:px-8 sm:py-4"
                >
                  Browse Sample Pages
                </Link>
              </div>
            </div>
          </section>
        </main>

        <SiteLegalFooter siteId={site.id} />
      </div>
    </div>
  );
}
