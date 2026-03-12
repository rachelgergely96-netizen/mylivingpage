import type { Metadata } from "next";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import GuideLinkGrid from "@/components/marketing/GuideLinkGrid";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import { getAbsoluteUrl, SITE_NAME } from "@/lib/site";

const title = `ATS Resume and Recruiter Search Guides | ${SITE_NAME}`;
const description =
  "Answer-first guides on ATS readability, recruiter keyword search behavior, and when to use a living page alongside your PDF resume.";
const canonicalUrl = getAbsoluteUrl("/guides");

function getSignupHref(ref: string) {
  return `/signup?ref=${ref}&next=/create`;
}

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title,
    description,
    url: canonicalUrl,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default async function GuidesPage() {
  const site = await getRequestLegalSite();

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />
      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
          <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 md:px-10">
            <Link href="/" className="font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl">
              my<span className="text-[#3B82F6]">living</span>page
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/examples"
                className="hidden text-xs uppercase tracking-[0.18em] text-[rgba(240,244,255,0.56)] transition-colors hover:text-[#93C5FD] sm:inline-flex"
              >
                Examples
              </Link>
              <Link
                href={getSignupHref("guides_nav_start")}
                className="gold-pill px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)]"
              >
                Start From My Resume
              </Link>
            </div>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
          <section className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-10 sm:px-10 sm:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Guides</p>
            <h1 className="mt-3 max-w-4xl font-heading text-4xl font-bold leading-[1.04] tracking-[-0.04em] text-[#F0F4FF] sm:text-5xl md:text-6xl">
              Use the right guide at the right moment in the funnel.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[rgba(240,244,255,0.64)] sm:text-lg">
              Start with the resume you already use. First make sure it can be read, then make sure it can be found, then decide how to use one living page after a human clicks.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={getSignupHref("guides_start_here")}
                className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)]"
              >
                Start From My Resume
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-[rgba(255,255,255,0.18)] px-6 py-3 text-sm text-[rgba(240,244,255,0.76)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
              >
                See Pricing
              </Link>
            </div>
          </section>

          <GuideLinkGrid
            eyebrow="Start here"
            title="Three practical guides, in the order active applicants usually need them"
            description="Guide one helps you check the file. Guide two helps you match recruiter search behavior. Guide three shows where a living page fits after the click."
            className="mt-12"
          />

          <section className="mt-14 text-center sm:mt-20">
            <div className="glass-card rounded-[2rem] border border-[rgba(59,130,246,0.18)] px-6 py-10 sm:px-10 sm:py-12">
              <h2 className="font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl">
                Ready to start from the resume you already use?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[rgba(240,244,255,0.6)]">
                Keep the ATS-safe resume for applications, then use MyLivingPage to publish a clearer page for the moment a recruiter, hiring manager, or referral can click.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={getSignupHref("guides_final_start")}
                  className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)]"
                >
                  Start From My Resume
                </Link>
                <Link
                  href="/examples"
                  className="rounded-full border border-[rgba(255,255,255,0.18)] px-6 py-3 text-sm text-[rgba(240,244,255,0.76)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                >
                  See Sample Pages
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
