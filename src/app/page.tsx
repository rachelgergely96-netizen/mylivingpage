import type { Metadata } from "next";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import LandingNav from "@/components/marketing/LandingNav";
import LandingUnifiedShowcase from "@/components/marketing/LandingUnifiedShowcase";
import MobileStickyCta from "@/components/marketing/MobileStickyCta";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import {
  ATS_READINESS_DISCLOSURE,
  CREDIBILITY_POINTS,
  FREE_PRODUCT_FEATURE_GROUPS,
  PROCESS_STEPS,
  TRUST_SIGNALS,
} from "@/lib/marketing-samples";
import { getAbsoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

const canonicalUrl = getAbsoluteUrl("/");

function getSignupHref(ref: string) {
  return `/signup?ref=${ref}&next=/create`;
}

export const metadata: Metadata = {
  title: `${SITE_NAME} | ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: canonicalUrl,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
};

export default async function LandingPage() {
  const site = await getRequestLegalSite();

  return (
    <div className="landing-motion relative isolate min-h-screen overflow-x-clip">
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
            <div className="glass-card relative w-full overflow-hidden rounded-[2rem] border border-[rgba(255,255,255,0.1)] px-5 py-6 shadow-[0_40px_120px_rgba(2,6,23,0.35)] sm:px-8 sm:py-8 md:px-10 md:py-10">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(229,183,107,0.5)] to-transparent" />
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)] lg:items-center lg:gap-12">
                <div>
                  <p className="inline-flex rounded-full border border-[rgba(229,183,107,0.28)] bg-[rgba(229,183,107,0.1)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F5D7A2] sm:text-xs sm:tracking-[0.22em]">
                    One page. Many moments.
                  </p>
                  <div className="mt-5 max-w-4xl">
                    <h1 className="font-heading text-[2.6rem] font-bold leading-[0.96] tracking-[-0.04em] text-[#F0F4FF] sm:text-5xl md:text-6xl lg:text-[4.35rem]">
                      {SITE_TAGLINE}.
                    </h1>
                    <p className="mt-5 max-w-3xl text-base leading-7 text-[rgba(240,244,255,0.76)] sm:text-lg sm:leading-8">
                      {SITE_DESCRIPTION}
                    </p>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Link
                      href={getSignupHref("landing_start_free")}
                      className="gold-pill px-5 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.28)] sm:px-7 sm:py-4"
                    >
                      Create Your Page — Free
                    </Link>
                    <a
                      href="#demo-section"
                      className="rounded-full border border-[rgba(255,255,255,0.18)] px-5 py-3 text-sm font-semibold text-[rgba(240,244,255,0.8)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] sm:px-7 sm:py-4"
                    >
                      See How It Adapts
                    </a>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {CREDIBILITY_POINTS.map((point) => (
                      <span
                        key={point}
                        className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(240,244,255,0.64)]"
                      >
                        {point}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 max-w-2xl text-sm leading-6 text-[rgba(240,244,255,0.5)]">
                    Start in minutes. No card, trial, or subscription required.
                  </p>
                </div>

                <aside aria-label="One profile powers every format" className="relative hidden lg:block">
                  <div aria-hidden="true" className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.16),transparent_68%)]" />
                  <div className="relative rounded-[1.75rem] border border-[rgba(255,255,255,0.11)] bg-[rgba(6,14,28,0.68)] p-4 shadow-[0_28px_90px_rgba(2,6,23,0.42)]">
                    <div className="flex items-center justify-between gap-3 px-2 pb-4">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#93C5FD]">One source of truth</p>
                        <p className="mt-1 text-sm font-semibold text-[#F0F4FF]">Avery Sample</p>
                      </div>
                      <span className="rounded-full border border-[rgba(91,214,124,0.22)] bg-[rgba(91,214,124,0.08)] px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-[#86EFAC]">Current</span>
                    </div>
                    <div className="grid gap-2.5">
                      {[
                        ["Living Page", "A clear story people can explore", "01"],
                        ["ATS-ready PDF", "Real text and a clean reading order", "02"],
                        ["Share Card + QR", "A memorable way into the full page", "03"],
                      ].map(([title, body, number]) => (
                        <div key={title} className="group flex items-center gap-4 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.035)] p-4 transition-colors hover:border-[rgba(147,197,253,0.2)] hover:bg-[rgba(59,130,246,0.06)]">
                          <span className="font-mono text-[10px] text-[rgba(147,197,253,0.58)]">{number}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#F0F4FF]">{title}</p>
                            <p className="mt-1 text-xs leading-5 text-[rgba(240,244,255,0.48)]">{body}</p>
                          </div>
                          <span className="ml-auto text-[#93C5FD] opacity-50 transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
                        </div>
                      ))}
                    </div>
                    <p className="px-2 pt-4 text-[10px] leading-5 text-[rgba(240,244,255,0.36)]">Change the source once. Every format stays aligned.</p>
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <div className="landing-focus-wash relative">
            <LandingUnifiedShowcase />

          <section id="how" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
            <div className="mb-8 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">The useful loop</p>
              <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.04] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl md:text-5xl">
                Share it. See it land. Keep it current.
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

          <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
            <div className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Simple pricing: free</p>
                  <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.04] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl">
                    One living resume. One link. One ATS-ready PDF.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.66)]">
                    Build, publish, and keep your living resume current for free. Download the PDF
                    when an application needs a file, then use your link and share card everywhere
                    else.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      href={getSignupHref("landing_pricing_start")}
                      className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)]"
                    >
                      Create Your Living Resume
                    </Link>
                    <Link
                      href="/pricing"
                      className="text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
                    >
                      See everything included
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 lg:min-w-[520px] lg:max-w-[560px]">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {FREE_PRODUCT_FEATURE_GROUPS.map((group, index) => (
                      <div
                        key={group.name}
                        className={`rounded-3xl border p-5 ${
                          index === FREE_PRODUCT_FEATURE_GROUPS.length - 1
                            ? "border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.09)] shadow-[0_0_40px_rgba(59,130,246,0.08)] ring-1 ring-[rgba(59,130,246,0.16)]"
                            : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"
                        }`}
                      >
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">
                          {group.eyebrow}
                        </p>
                        <h3 className="mt-3 font-heading text-2xl font-bold text-[#F0F4FF]">
                          {group.name}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
                          {group.body}
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-[rgba(240,244,255,0.72)]">
                          {group.features.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-0.5 text-[#93C5FD]">&#10003;</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-[rgba(59,130,246,0.16)] bg-[rgba(59,130,246,0.08)] p-4 text-sm leading-6 text-[rgba(240,244,255,0.72)]">
                    Free means free: no credit card, no trial expiration, and no subscription
                    required to publish or keep your page live.
                  </div>
                  <p className="text-xs leading-6 text-[rgba(240,244,255,0.48)]">
                    {ATS_READINESS_DISCLOSURE}
                  </p>
                </div>
              </div>
              <p className="mt-8 text-sm leading-7 text-[rgba(240,244,255,0.54)]">
                Need the PDF basics first? Read the{" "}
                <Link href="/guides/resume-pdf-check?ref=landing_pricing_guides" className="text-[#93C5FD] transition-colors hover:text-[#BFDBFE]">
                  Resume PDF check
                </Link>{" "}
                and the{" "}
                <Link href="/guides/recruiter-search-keywords?ref=landing_pricing_guides" className="text-[#93C5FD] transition-colors hover:text-[#BFDBFE]">
                  recruiter keyword guide
                </Link>
                .
              </p>
            </div>
          </section>

          <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
            <div className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-8 sm:px-10 sm:py-10">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Why this exists</p>
                <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.04] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl">
                  Simple, but never generic.
                </h2>
                <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.66)]">
                  Simplicity should make your value easier to see, not flatten what makes you different. MyLivingPage gives your experience enough structure for software to understand and enough personality for a person to remember—without asking you to build and maintain a full personal website.
                </p>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {TRUST_SIGNALS.map((signal) => (
                  <article
                    key={signal.title}
                    className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5"
                  >
                    <p className="font-heading text-xl font-bold text-[#F0F4FF]">{signal.title}</p>
                    <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.62)]">{signal.body}</p>
                    <Link
                      href={signal.href}
                      className="mt-4 inline-flex text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
                    >
                      {signal.linkLabel}
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="final-cta" className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24 md:px-10">
            <div className="glass-card relative overflow-hidden rounded-[2rem] border border-[rgba(59,130,246,0.2)] px-6 py-10 text-center sm:px-10 sm:py-12">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.2),transparent_52%)]" />
              <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Ready when you are</p>
              <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.04] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl">
                Build it once. Share it anywhere. Keep it current.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[rgba(240,244,255,0.66)]">
                {SITE_DESCRIPTION}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={getSignupHref("landing_final_start")}
                  className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)] sm:px-8 sm:py-4"
                >
                  Create Your Page — Free
                </Link>
                <Link
                  href="/examples"
                  className="rounded-full border border-[rgba(255,255,255,0.18)] px-6 py-3 text-sm text-[rgba(240,244,255,0.8)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] sm:px-8 sm:py-4"
                >
                  Browse Sample Pages
                </Link>
              </div>
              </div>
            </div>
          </section>
          </div>
        </main>

        <SiteLegalFooter siteId={site.id} />
        <MobileStickyCta
          href={getSignupHref("landing_mobile_start")}
          label="Create Your Page"
          targetId="hero-section"
          hideNearId="final-cta"
        />
      </div>
    </div>
  );
}
