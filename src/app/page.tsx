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
  READABILITY_FAILURE_SIGNALS,
  READABILITY_TEST_STEPS,
  SEARCH_OPERATOR_EXAMPLES,
  SEARCH_VISIBILITY_CHECKLIST,
} from "@/lib/marketing-samples";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mylivingpage.com";
const ogDescription =
  "Keep an ATS-safe resume for the machines and one living page recruiters actually remember once they click.";

export const metadata: Metadata = {
  title: "MyLivingPage | Visible to ATS, Memorable to People",
  description: ogDescription,
  alternates: { canonical: appUrl },
  openGraph: {
    title: "MyLivingPage | Visible to ATS, Memorable to People",
    description: ogDescription,
    url: appUrl,
    siteName: "MyLivingPage",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyLivingPage | Visible to ATS, Memorable to People",
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
                Visible to machines. Memorable to people.
              </p>
              <div className="mt-5 max-w-4xl">
                <h1 className="font-heading text-[2.6rem] font-bold leading-[0.96] tracking-[-0.04em] text-[#F0F4FF] sm:text-5xl md:text-6xl lg:text-[4.35rem]">
                  Keep your resume ATS-safe. Send a page people actually remember.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[rgba(240,244,255,0.76)] sm:text-lg sm:leading-8">
                  Your resume still needs clean text, exact titles, and explicit keywords to show up in search. MyLivingPage gives recruiters and hiring managers a faster, clearer page to understand once they click.
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
                Keep your ATS-safe resume for applications. Use one page link everywhere a person can click.
              </p>
            </div>
          </section>

          <section id="visibility" className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 md:px-10">
            <div className="mb-8 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Visibility</p>
              <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.02] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl md:text-5xl">
                First make sure your resume can be read and found.
              </h2>
              <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.66)]">
                Before someone forms an opinion, your resume has to survive two machine layers: clean text extraction and exact search language. MyLivingPage does not replace that resume. It helps the human click feel sharper once you are found.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <article className="glass-card rounded-[1.75rem] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3B82F6]">Readability</p>
                <h3 className="mt-3 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
                  The 30-second readability test
                </h3>
                <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.64)] sm:text-base">
                  If copy and paste fails, some systems may read a broken version of your resume even when the PDF looks polished.
                </p>

                <ol className="mt-6 space-y-3">
                  {READABILITY_TEST_STEPS.map((step, index) => (
                    <li
                      key={step}
                      className="flex items-start gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(59,130,246,0.4)] font-mono text-xs text-[#93C5FD]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="pt-1 text-sm leading-6 text-[rgba(240,244,255,0.72)]">{step}</p>
                    </li>
                  ))}
                </ol>

                <div className="mt-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgba(240,244,255,0.42)]">
                    Check for
                  </p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {READABILITY_FAILURE_SIGNALS.map((signal) => (
                      <li
                        key={signal}
                        className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm leading-6 text-[rgba(240,244,255,0.64)]"
                      >
                        {signal}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>

              <article className="glass-card rounded-[1.75rem] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3B82F6]">Search language</p>
                <h3 className="mt-3 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
                  Recruiter search reality
                </h3>
                <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.64)] sm:text-base">
                  Recruiters often search by exact titles and terms. If your resume implies a skill but never names it, you can be missed before a person ever reads the rest.
                </p>

                <div className="mt-6 space-y-3">
                  {SEARCH_OPERATOR_EXAMPLES.map((item) => (
                    <div
                      key={item.operator}
                      className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#93C5FD]">
                          {item.operator}
                        </span>
                        <code className="rounded-lg bg-[rgba(255,255,255,0.04)] px-3 py-1 font-mono text-xs text-[rgba(240,244,255,0.74)]">
                          {item.example}
                        </code>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.64)]">{item.guidance}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgba(240,244,255,0.42)]">
                    Make sure your resume includes
                  </p>
                  <ul className="mt-3 space-y-2">
                    {SEARCH_VISIBILITY_CHECKLIST.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm leading-6 text-[rgba(240,244,255,0.68)]"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </div>

            <div className="mt-8 glass-card rounded-[1.75rem] border border-[rgba(59,130,246,0.18)] px-6 py-8 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Use both assets well</p>
              <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <h3 className="font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
                    Keep the ATS-safe resume. Give people a better click.
                  </h3>
                  <p className="mt-3 text-base leading-7 text-[rgba(240,244,255,0.64)]">
                    Keep your clean resume for applications, then use MyLivingPage to give recruiters and hiring managers a faster, clearer first impression once they open your link.
                  </p>
                </div>
                <Link
                  href="/signup?ref=landing_visibility_primary"
                  className="gold-pill inline-flex items-center justify-center px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)]"
                >
                  Build My Page Free
                </Link>
              </div>
            </div>
          </section>

          <section id="examples" className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 md:px-10">
            <div className="mb-8 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Sample pages</p>
              <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.02] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl md:text-5xl">
                See what the human click can look like.
              </h2>
              <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.66)]">
                These are sample pages, not testimonials. Use them to see how a living page can clarify your story once your resume has already done the machine work of getting you seen.
              </p>
            </div>

            <LandingSampleShowcase groups={sampleGroups} />

            <div className="mt-8 glass-card rounded-[1.75rem] border border-[rgba(59,130,246,0.18)] px-6 py-8 text-center sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Ready to build yours?</p>
              <h3 className="mt-3 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
                Make the click count.
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-[rgba(240,244,255,0.62)]">
                You do not need a redesign project. Start free, publish when you are ready, and give people a page that is easier to scan than another attachment.
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
                  Your resume gets you surfaced. Your page makes the click count.
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[rgba(240,244,255,0.68)]">
                  A clean resume helps you appear in search. Use your page to give recruiters and hiring managers a faster, clearer first impression once they open it.
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
                From ATS-safe resume to live page in three steps.
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
                    Everything you need to make the click count is free.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.66)]">
                    Start with one living page while keeping your ATS-safe resume for applications, and upgrade later only if you want premium themes, share-ready exports, and a cleaner branded page.
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
                Keep your ATS-safe resume. Give people a better first impression.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[rgba(240,244,255,0.66)]">
                Start with the resume you already use, publish a page that is easier to scan, and keep the same link wherever a recruiter or hiring manager can click.
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
