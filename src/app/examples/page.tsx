import type { Metadata } from "next";
import Link from "next/link";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import SamplePageCard from "@/components/marketing/SamplePageCard";
import JsonLd from "@/components/seo/JsonLd";
import { GUIDES } from "@/lib/guides";
import { getAbsoluteUrl, SITE_NAME } from "@/lib/site";
import { buildCollectionPageStructuredData } from "@/lib/structured-data";
import { getMarketingSampleGroups } from "@/lib/marketing-samples";

const canonicalUrl = getAbsoluteUrl("/examples");

function getSignupHref(ref: string) {
  return `/signup?ref=${ref}&next=/create`;
}

export const metadata: Metadata = {
  title: `Examples | ${SITE_NAME}`,
  description:
    "Browse sample Living Pages that help recruiters understand you faster after they click.",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: `Examples | ${SITE_NAME}`,
    description:
      "Browse sample Living Pages that help recruiters understand you faster after they click.",
    url: canonicalUrl,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Examples | ${SITE_NAME}`,
    description:
      "Browse sample Living Pages that help recruiters understand you faster after they click.",
  },
};

export default function ExamplesPage() {
  const sampleGroups = getMarketingSampleGroups();
  const seoGuides = GUIDES.slice(0, 3);

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden">
      <JsonLd
        data={buildCollectionPageStructuredData({
          path: "/examples",
          name: "MyLivingPage Sample Pages",
          description:
            "Browse sample Living Pages that help recruiters understand you faster after they click.",
        })}
      />
      <CosmicBackground />
      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
          <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 md:px-10">
            <Link href="/" className="font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl">
              my<span className="text-[#3B82F6]">living</span>page
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="hidden text-xs uppercase tracking-[0.18em] text-[rgba(240,244,255,0.56)] transition-colors hover:text-[#93C5FD] sm:inline-flex"
              >
                Back Home
              </Link>
              <Link
                href={getSignupHref("examples_nav_start")}
                className="gold-pill px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)]"
              >
                Start Your Free Month
              </Link>
            </div>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
          <section className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-10 sm:px-10 sm:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Sample pages</p>
            <h1 className="mt-3 max-w-4xl font-heading text-4xl font-bold leading-[1.04] tracking-[-0.04em] text-[#F0F4FF] sm:text-5xl md:text-6xl">
              See what the human click can look like after the application is already in.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[rgba(240,244,255,0.64)] sm:text-lg">
              These are sample pages, not customer testimonials. Use them to see how different follow-up moments can be framed once someone opens your link and wants faster context.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={getSignupHref("examples_after_apply")}
                className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)]"
              >
                Start Your Free Month
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-[rgba(255,255,255,0.18)] px-6 py-3 text-sm text-[rgba(240,244,255,0.76)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
              >
                See Pricing
              </Link>
            </div>
          </section>

          <div className="mt-12 space-y-12 sm:mt-16 sm:space-y-16">
            {sampleGroups.map((group) => (
              <section key={group.id}>
                <div className="mb-8 max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">{group.title}</p>
                  <p className="mt-3 text-base leading-7 text-[rgba(240,244,255,0.6)]">{group.description}</p>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  {group.samples.map((sample) => (
                    <SamplePageCard
                      key={sample.id}
                      sample={sample}
                      anchorId={sample.id}
                      interactivePreview
                      previewHeight={500}
                      signupHref={getSignupHref(`examples_${sample.id}`)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-14 sm:mt-20">
            <div className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-8 sm:px-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Guides</p>
                  <h2 className="mt-3 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl">
                    Read the guide sequence behind these examples.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.62)]">
                    Use the guides in order: check whether the Resume PDF reads cleanly, make sure the search terms are explicit, then decide how to use a page after the click.
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

          <section className="mt-14 text-center sm:mt-20">
            <div className="glass-card rounded-[2rem] border border-[rgba(59,130,246,0.18)] px-6 py-10 sm:px-10 sm:py-12">
              <h2 className="font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl">
                Ready to publish one page and keep the PDF aligned?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[rgba(240,244,255,0.6)]">
                Upload your info once. Then publish one page that is easier for people to scan in follow-ups, referrals, and recruiter outreach.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={getSignupHref("examples_final_start")}
                  className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)]"
                >
                  Start Your Free Month
                </Link>
                <Link
                  href="/"
                  className="rounded-full border border-[rgba(255,255,255,0.18)] px-6 py-3 text-sm text-[rgba(240,244,255,0.76)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
