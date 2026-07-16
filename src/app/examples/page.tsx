import type { Metadata } from "next";
import Link from "next/link";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import SamplePageCard from "@/components/marketing/SamplePageCard";
import JsonLd from "@/components/seo/JsonLd";
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";
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
  const profileCount = sampleGroups.reduce((total, group) => total + group.samples.length, 0);

  return (
    <div className="profile-shell relative isolate min-h-screen overflow-x-hidden">
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
        <header className="sticky top-0 z-50 border-b border-[rgba(125,170,255,0.22)] bg-[rgba(6,18,37,0.94)] shadow-[0_4px_0_rgba(2,6,23,0.28)]">
          <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 md:px-10">
            <Link href="/" className="font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl">
              my<span className="text-[#60A5FA]">living</span>page
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/" className="profile-link hidden text-sm font-semibold sm:inline-flex">
                Back Home
              </Link>
              <Link
                href={getSignupHref("examples_nav_start")}
                className="gold-pill px-4 py-2.5 text-xs font-semibold sm:px-5"
              >
                Create Your Page (Free)
              </Link>
            </div>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
          <ProfileWindow
            title="directory://sample-pages"
            status={<span className="profile-status">{profileCount} profiles listed</span>}
            contentClassName="p-5 sm:p-7 md:p-8"
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)] lg:items-start">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#93C5FD]">
                  Sample pages
                </p>
                <h1 className="mt-3 max-w-4xl font-heading text-4xl font-bold leading-[1.04] tracking-[-0.035em] text-[#F0F4FF] sm:text-5xl">
                  See how a living resume can look when it becomes more than a file.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-[rgba(240,244,255,0.72)] sm:text-lg">
                  These are scenario demos, not customer testimonials. Use them to see how different
                  follow-up moments can be framed once someone opens your link and wants faster
                  context.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    href={getSignupHref("examples_after_apply")}
                    className="gold-pill px-6 py-3 text-sm font-semibold"
                  >
                    Create Your Page (Free)
                  </Link>
                  <Link href="/pricing" className="profile-action">
                    See What&apos;s Included
                  </Link>
                </div>
              </div>

              <ProfilePanel
                title="Directory info"
                meta="Public preview"
                contentClassName="p-0"
                as="aside"
              >
                <dl className="profile-meta-grid">
                  <dt className="profile-meta-label">Profiles</dt>
                  <dd className="profile-meta-value">{profileCount} fictional examples</dd>
                  <dt className="profile-meta-label">Purpose</dt>
                  <dd className="profile-meta-value">See the page before you build yours</dd>
                  <dt className="profile-meta-label">Price</dt>
                  <dd className="profile-meta-value">$0, no card required</dd>
                  <dt className="profile-meta-label">Publishing</dt>
                  <dd className="profile-meta-value">Private until you choose Publish</dd>
                </dl>
              </ProfilePanel>
            </div>
          </ProfileWindow>

          <div className="mt-10 space-y-10 sm:mt-12 sm:space-y-12">
            {sampleGroups.map((group) => (
              <section key={group.id} aria-labelledby={`sample-group-${group.id}`}>
                <ProfileWindow
                  as="div"
                  title={`category://${group.id}`}
                  status={`${group.samples.length} profile${group.samples.length === 1 ? "" : "s"}`}
                  contentClassName="p-4 sm:p-5 md:p-6"
                >
                  <div className="mb-6 grid gap-2 border-b border-[rgba(125,170,255,0.14)] pb-5 md:grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)] md:items-end md:gap-8">
                    <h2
                      id={`sample-group-${group.id}`}
                      className="font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl"
                    >
                      {group.title}
                    </h2>
                    <p className="text-sm leading-7 text-[rgba(240,244,255,0.66)]">
                      {group.description}
                    </p>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    {group.samples.map((sample) => (
                      <SamplePageCard
                        key={sample.id}
                        sample={sample}
                        anchorId={sample.id}
                        interactivePreview
                        previewHeight={360}
                        signupHref={getSignupHref(`examples_${sample.id}`)}
                      />
                    ))}
                  </div>
                </ProfileWindow>
              </section>
            ))}
          </div>

          <section className="mt-12 sm:mt-16" aria-labelledby="examples-guides-heading">
            <ProfileWindow
              title="bulletins://resume-guides"
              status={`${seoGuides.length} posts`}
              contentClassName="p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 border-b border-[rgba(125,170,255,0.14)] pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-3xl">
                  <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#93C5FD]">
                    Guides
                  </p>
                  <h2
                    id="examples-guides-heading"
                    className="mt-2 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl"
                  >
                    Read the guide sequence behind these examples.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-[rgba(240,244,255,0.68)]">
                    Use the guides in order: check whether the Resume PDF reads cleanly, make sure
                    the search terms are explicit, then decide how to use a page after the click.
                  </p>
                </div>
                <Link href="/guides" className="profile-link shrink-0 text-sm font-semibold">
                  Browse all resume and recruiter guides
                </Link>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {seoGuides.map((guide) => (
                  <ProfilePanel
                    key={guide.slug}
                    title={guide.decisionStage}
                    meta={guide.readTime}
                    contentClassName="p-4"
                    as="article"
                  >
                    <h3>
                      <Link
                        href={`/guides/${guide.slug}`}
                        className="profile-link font-heading text-2xl font-bold leading-tight"
                      >
                        {guide.title}
                      </Link>
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.66)]">
                      {guide.hubSummary}
                    </p>
                  </ProfilePanel>
                ))}
              </div>
            </ProfileWindow>
          </section>

          <section className="mt-12 pb-12 text-center sm:mt-16 sm:pb-16">
            <ProfileWindow
              title="create://your-profile"
              status={<span className="profile-status">Free forever</span>}
              contentClassName="px-5 py-9 sm:px-8 sm:py-11"
            >
              <h2 className="font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl">
                Ready to create one page you can actually send?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[rgba(240,244,255,0.68)]">
                Add your details once. Then publish one page that is easier to scan in follow-ups,
                referrals, recruiter outreach, and every other moment when a clean link is more
                useful than another attachment.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={getSignupHref("examples_final_start")}
                  className="gold-pill px-6 py-3 text-sm font-semibold"
                >
                  Create Your Page (Free)
                </Link>
                <Link href="/" className="profile-action">
                  Back to Home
                </Link>
              </div>
            </ProfileWindow>
          </section>
        </main>
      </div>
    </div>
  );
}
