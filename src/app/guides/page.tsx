import type { Metadata } from "next";
import Link from "next/link";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import GuideLinkGrid from "@/components/marketing/GuideLinkGrid";
import LandingNav from "@/components/marketing/LandingNav";
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";
import { GUIDES } from "@/lib/guides";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import { getAbsoluteUrl, SITE_NAME } from "@/lib/site";

const title = `Resume PDF and Living Page Guides | ${SITE_NAME}`;
const description =
  "Answer-first guides on checking your Resume PDF, improving search visibility, and using a Living Page alongside your PDF.";
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
    <div className="profile-shell relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />

      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-[rgba(147,197,253,0.2)] bg-[rgba(5,16,34,0.9)] shadow-[0_4px_18px_rgba(2,6,23,0.3)] backdrop-blur-xl">
          <LandingNav />
          <div className="border-t border-[rgba(147,197,253,0.12)] bg-[rgba(6,18,37,0.64)]">
            <div className="mx-auto flex min-h-10 w-full max-w-7xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6 md:px-10">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[rgba(240,244,255,0.52)]">
                Directory / Guides
              </span>
              <div className="flex items-center gap-3">
                <Link href="/examples" className="profile-link hidden text-xs sm:inline-flex">
                  Examples
                </Link>
                <Link
                  href={getSignupHref("guides_nav_start")}
                  className="profile-link text-xs font-semibold"
                >
                  Start From My Resume
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
          <ProfileWindow
            title="journal://resume-guides"
            status={<span className="profile-status">{GUIDES.length} entries</span>}
            contentClassName="p-5 sm:p-7 md:p-8"
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)] lg:items-start">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#93C5FD]">
                  Guides
                </p>
                <h1 className="mt-3 max-w-4xl font-heading text-4xl font-bold leading-[1.04] tracking-[-0.035em] text-[#F0F4FF] sm:text-5xl">
                  Use the right guide at the right moment in the funnel.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-[rgba(240,244,255,0.72)] sm:text-lg">
                  Start with the information you already use. First make sure the Resume PDF reads
                  cleanly, then make sure the right terms are visible, then decide how to use a
                  Living Page after a human clicks.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    href={getSignupHref("guides_start_here")}
                    className="gold-pill px-6 py-3 text-sm font-semibold"
                  >
                    Start From My Resume
                  </Link>
                  <Link href="/pricing" className="profile-action">
                    See What&apos;s Included
                  </Link>
                </div>
              </div>

              <ProfilePanel
                title="Journal info"
                meta="Read in order"
                contentClassName="p-0"
                as="aside"
              >
                <dl className="profile-meta-grid">
                  <dt className="profile-meta-label">Entries</dt>
                  <dd className="profile-meta-value">{GUIDES.length} practical guides</dd>
                  <dt className="profile-meta-label">Start with</dt>
                  <dd className="profile-meta-value">Resume PDF readability</dd>
                  <dt className="profile-meta-label">Then check</dt>
                  <dd className="profile-meta-value">Recruiter search language</dd>
                  <dt className="profile-meta-label">Finish with</dt>
                  <dd className="profile-meta-value">When to share a Living Page</dd>
                </dl>
              </ProfilePanel>
            </div>
          </ProfileWindow>

          <GuideLinkGrid
            eyebrow="Start here"
            title="Three practical guides, in the order active applicants usually need them"
            description="Guide one helps you check the file. Guide two helps you match recruiter search behavior. Guide three shows where a Living Page fits after the click."
            className="mt-10"
          />

          <section className="mt-10 pb-12 text-center sm:pb-16">
            <ProfileWindow
              title="journal://next-step"
              status={<span className="profile-status">Ready when you are</span>}
              contentClassName="px-5 py-9 sm:px-8 sm:py-11"
            >
              <h2 className="font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl">
                Ready to start from the information you already use?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[rgba(240,244,255,0.68)]">
                Upload your info once, publish a clearer page, and keep the Resume PDF aligned to
                the same saved content.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={getSignupHref("guides_final_start")}
                  className="gold-pill px-6 py-3 text-sm font-semibold"
                >
                  Start From My Resume
                </Link>
                <Link href="/examples" className="profile-action">
                  See Sample Pages
                </Link>
              </div>
            </ProfileWindow>
          </section>
        </main>

        <SiteLegalFooter siteId={site.id} />
      </div>
    </div>
  );
}
