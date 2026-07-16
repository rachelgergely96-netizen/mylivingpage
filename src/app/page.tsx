import type { Metadata } from "next";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import LandingNav from "@/components/marketing/LandingNav";
import LandingUnifiedShowcase from "@/components/marketing/LandingUnifiedShowcase";
import MobileStickyCta from "@/components/marketing/MobileStickyCta";
import { ProductJourneyPreview } from "@/components/marketing/ProductJourneyPreview";
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";
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

function getLoginHref() {
  return "/login?next=/dashboard";
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
    <div className="profile-shell relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />
      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-[rgba(147,197,253,0.2)] bg-[rgba(5,16,34,0.9)] shadow-[0_4px_18px_rgba(2,6,23,0.3)] backdrop-blur-xl">
          <LandingNav />
        </header>

        <main className="pb-24 md:pb-0">
          <section
            id="hero-section"
            className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl items-start px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-8 md:min-h-[calc(100vh-5rem)] md:items-center md:px-10 md:pb-16 md:pt-10"
          >
            <ProfileWindow
              title="MyLivingPage // free profile builder"
              status={<span className="profile-status text-[#86EFAC]">open</span>}
              className="relative w-full"
              contentClassName="px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10"
            >
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-center lg:gap-10">
                <div>
                  <p className="inline-flex border border-[rgba(96,165,250,0.3)] bg-[rgba(59,130,246,0.11)] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#BFDBFE]">
                    Your professional corner of the internet
                  </p>
                  <div className="mt-5 max-w-4xl">
                    <h1 className="font-heading text-[2.6rem] font-bold leading-[0.96] tracking-[-0.04em] text-[#F0F4FF] sm:text-5xl md:text-6xl lg:text-[4.15rem]">
                      {SITE_TAGLINE}.
                    </h1>
                    <p className="mt-4 max-w-3xl text-base leading-7 text-[rgba(240,244,255,0.76)] sm:text-lg sm:leading-8">
                      {SITE_DESCRIPTION}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {CREDIBILITY_POINTS.map((point) => (
                      <span
                        key={point}
                      className="border border-[rgba(147,197,253,0.16)] bg-[rgba(255,255,255,0.025)] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgba(240,244,255,0.7)]"
                      >
                        {point}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      href={getSignupHref("landing_start_free")}
                      className="gold-pill px-5 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.3)] sm:px-7 sm:py-4"
                    >
                      Build My Free Resume
                    </Link>
                    <Link
                      href={getLoginHref()}
                      className="profile-action px-5 py-3 text-sm sm:px-7 sm:py-4"
                    >
                      Log In
                    </Link>
                    <a
                      href="#demo-section"
                      className="text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
                    >
                      See It in Action
                    </a>
                  </div>

                  <p className="mt-4 max-w-2xl text-sm leading-6 text-[rgba(240,244,255,0.56)]">
                    Start in minutes. No card, trial, or subscription. Nothing goes live until you choose Publish.
                  </p>
                </div>

                <ProductJourneyPreview />
              </div>
            </ProfileWindow>
          </section>

          <LandingUnifiedShowcase />

          <section id="how" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
            <ProfileWindow title="Profile setup // how it works" status="3 simple steps" contentClassName="p-4 sm:p-6">
              <div className="mb-6 max-w-3xl">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#60A5FA]">How it works</p>
                <h2 className="mt-2 font-heading text-[2rem] font-bold leading-[1.04] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl md:text-5xl">
                  Build, preview, share.
                </h2>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {PROCESS_STEPS.map((step, index) => (
                  <ProfilePanel
                    key={step.title}
                    title={`${String(index + 1).padStart(2, "0")} // setup step`}
                    as="article"
                    contentClassName="p-5 sm:p-6"
                  >
                    <h3 className="font-heading text-2xl font-bold text-[#F0F4FF]">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.64)]">{step.body}</p>
                  </ProfilePanel>
                ))}
              </div>
            </ProfileWindow>
          </section>

          <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
            <ProfileWindow title="Account details // $0 forever" status="no credit card" contentClassName="px-5 py-7 sm:px-8 sm:py-9">
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
                      <ProfilePanel
                        key={group.name}
                        title={group.eyebrow}
                        className={`h-full ${
                          index === FREE_PRODUCT_FEATURE_GROUPS.length - 1
                            ? "border-[rgba(96,165,250,0.44)] shadow-[0_0_32px_rgba(59,130,246,0.1)]"
                            : ""
                        }`}
                        contentClassName="p-5"
                      >
                        <h3 className="font-heading text-2xl font-bold text-[#F0F4FF]">
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
                      </ProfilePanel>
                    ))}
                  </div>
                  <div className="border border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.08)] p-4 text-sm leading-6 text-[rgba(240,244,255,0.72)]">
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
            </ProfileWindow>
          </section>

          <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
            <ProfileWindow title="About this site // why it exists" status="built for real job searches" contentClassName="px-5 py-7 sm:px-8 sm:py-9">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Why this exists</p>
                <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.04] tracking-[-0.03em] text-[#F0F4FF] sm:text-4xl">
                  Simple. Professional. Yours.
                </h2>
                <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.66)]">
                  MyLivingPage exists for the gap between a resume attachment and a full personal site: the moment when someone is already interested and wants proof, credibility, and contact paths fast. It is a living resume on the surface, but the real job is helping someone decide to move forward. You control when a page goes live, and the site publishes privacy, security, and deletion details before signup.
                </p>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {TRUST_SIGNALS.map((signal) => (
                  <ProfilePanel
                    key={signal.title}
                    title="Site details"
                    as="article"
                    contentClassName="p-5"
                  >
                    <p className="font-heading text-xl font-bold text-[#F0F4FF]">{signal.title}</p>
                    <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.62)]">{signal.body}</p>
                    <Link
                      href={signal.href}
                      className="mt-4 inline-flex text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
                    >
                      {signal.linkLabel}
                    </Link>
                  </ProfilePanel>
                ))}
              </div>
            </ProfileWindow>
          </section>

          <section id="final-cta" className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24 md:px-10">
            <ProfileWindow title="Create your profile // ready when you are" status={<span className="profile-status text-[#86EFAC]">free</span>} contentClassName="px-6 py-10 text-center sm:px-10 sm:py-12">
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
                  Create Your Living Resume (Free)
                </Link>
                <Link
                  href="/examples"
                  className="profile-action px-6 py-3 text-sm sm:px-8 sm:py-4"
                >
                  Browse Sample Pages
                </Link>
              </div>
            </ProfileWindow>
          </section>
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
