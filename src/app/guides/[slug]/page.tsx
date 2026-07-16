import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import CosmicBackground from "@/components/marketing/CosmicBackground";
import LandingNav from "@/components/marketing/LandingNav";
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";
import { GUIDES, getGuide } from "@/lib/guides";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import { getAbsoluteUrl, SITE_NAME } from "@/lib/site";
import { buildGuideArticleStructuredData } from "@/lib/structured-data";

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

function getSignupHref(ref: string) {
  return `/signup?ref=${ref}&next=/create`;
}

function formatGuideDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);

  if (!guide) {
    return {
      title: `Guides | ${SITE_NAME}`,
      description: "Practical guides for cleaner Resume PDFs and recruiter-friendly pages.",
    };
  }

  const canonicalUrl = getAbsoluteUrl(`/guides/${guide.slug}`);

  return {
    title: `${guide.title} | ${SITE_NAME}`,
    description: guide.description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${guide.title} | ${SITE_NAME}`,
      description: guide.description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${guide.title} | ${SITE_NAME}`,
      description: guide.description,
    },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuide(slug);
  const site = await getRequestLegalSite();

  if (!guide) {
    notFound();
  }

  const articleJsonLd = buildGuideArticleStructuredData(guide);
  const relatedGuides = guide.related
    .map((relatedSlug) => getGuide(relatedSlug))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return (
    <div className="profile-shell relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />

      <div className="relative z-10">
        <JsonLd data={articleJsonLd} />

        <header className="sticky top-0 z-50 border-b border-[rgba(147,197,253,0.2)] bg-[rgba(5,16,34,0.9)] shadow-[0_4px_18px_rgba(2,6,23,0.3)] backdrop-blur-xl">
          <LandingNav />
          <div className="border-t border-[rgba(147,197,253,0.12)] bg-[rgba(6,18,37,0.64)]">
            <div className="mx-auto flex min-h-10 w-full max-w-7xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6 md:px-10">
              <div className="min-w-0 font-mono text-[10px] uppercase tracking-[0.1em] text-[rgba(240,244,255,0.52)]">
                <Link href="/guides" className="profile-link">
                  Guides
                </Link>
                <span aria-hidden="true"> / </span>
                <span className="hidden sm:inline">{guide.slug}</span>
                <span className="sm:hidden">Article</span>
              </div>
              <Link
                href={getSignupHref(`guide_${guide.slug}_nav`)}
                className="profile-link shrink-0 text-xs font-semibold"
              >
                Start From My Resume
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 md:px-10">
          <ProfileWindow
            as="article"
            title={`journal://${guide.slug}`}
            status={guide.readTime}
            contentClassName="p-5 sm:p-7 md:p-9"
          >
            <header className="border-b border-[rgba(125,170,255,0.14)] pb-7">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#93C5FD]">
                Guide
              </p>
              <h1 className="mt-3 font-heading text-4xl font-bold leading-[1.06] tracking-[-0.035em] text-[#F0F4FF] sm:text-5xl">
                {guide.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-[rgba(240,244,255,0.72)] sm:text-lg">
                {guide.description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[rgba(125,170,255,0.1)] pt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-[rgba(240,244,255,0.58)]">
                <span className="text-[#BFDBFE]">{guide.decisionStage}</span>
                <span>By {guide.author}</span>
                <span>
                  Updated{" "}
                  <time dateTime={guide.updatedAt}>{formatGuideDate(guide.updatedAt)}</time>
                </span>
              </div>
            </header>

            <ProfilePanel
              title="Short answer"
              meta="Start here"
              className="mt-7"
              contentClassName="px-5 py-5 sm:px-6"
              as="aside"
            >
              <p className="text-base leading-8 text-[#F0F4FF]">{guide.answer}</p>
            </ProfilePanel>

            <div className="mt-9 space-y-9">
              {guide.sections.map((section) => (
                <section
                  key={section.title}
                  className="border-t border-[rgba(125,170,255,0.14)] pt-8 first:border-t-0 first:pt-0"
                >
                  <h2 className="font-heading text-3xl font-bold leading-tight text-[#F0F4FF]">
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-4 text-base leading-8 text-[rgba(240,244,255,0.76)]">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>

                  {section.bullets?.length ? (
                    <ul className="mt-5 divide-y divide-[rgba(125,170,255,0.1)] border-y border-[rgba(125,170,255,0.12)]">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-1 py-3.5 text-sm leading-7 text-[rgba(240,244,255,0.74)]"
                        >
                          <span
                            className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-[#60A5FA]"
                            aria-hidden="true"
                          />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </ProfileWindow>

          <section className="mt-8 grid gap-4 lg:grid-cols-3" aria-label="Next steps">
            <ProfilePanel
              title="Build"
              meta="Free"
              contentClassName="p-5"
              as="article"
            >
              <h2>
                <Link
                  href={getSignupHref(`guide_${guide.slug}_build`)}
                  className="profile-link font-heading text-2xl font-bold leading-tight"
                >
                  Start from the resume you already use
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.68)]">
                Start from the information you already use, then publish one page that is easier to
                scan once a person wants more context.
              </p>
            </ProfilePanel>

            <ProfilePanel
              title="Export"
              meta="PDF + QR"
              contentClassName="p-5"
              as="article"
            >
              <h2>
                <Link
                  href={`/pricing?ref=guide_${guide.slug}_pricing`}
                  className="profile-link font-heading text-2xl font-bold leading-tight"
                >
                  See PDF export and QR-ready share card options
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.68)]">
                Use the same uploaded information to create a fresh PDF, a PNG share card, and a
                page link you can keep reusing.
              </p>
            </ProfilePanel>

            <ProfilePanel
              title="Examples"
              meta="Browse profiles"
              contentClassName="p-5"
              as="article"
            >
              <h2>
                <Link
                  href={`/examples?ref=guide_${guide.slug}_examples`}
                  className="profile-link font-heading text-2xl font-bold leading-tight"
                >
                  See sample pages recruiters can scan quickly
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.68)]">
                Review real page shapes for follow-up, recruiter-click, and referral moments before
                you build your own.
              </p>
            </ProfilePanel>
          </section>

          <ProfileWindow
            title="Related guides"
            status={`${relatedGuides.length} entries`}
            className="mt-8"
            contentClassName="grid gap-4 p-4 sm:p-5 md:grid-cols-2"
          >
            {relatedGuides.map((relatedGuide) => (
              <ProfilePanel
                key={relatedGuide.slug}
                title={relatedGuide.decisionStage}
                meta={relatedGuide.readTime}
                contentClassName="p-4 sm:p-5"
                as="article"
              >
                <h2>
                  <Link
                    href={`/guides/${relatedGuide.slug}`}
                    className="profile-link font-heading text-2xl font-bold leading-tight"
                  >
                    {relatedGuide.title}
                  </Link>
                </h2>
                <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.68)]">
                  {relatedGuide.summary}
                </p>
                <Link
                  href={`/guides/${relatedGuide.slug}`}
                  className="profile-link mt-5 inline-flex text-sm font-semibold"
                >
                  Read {relatedGuide.title}
                </Link>
              </ProfilePanel>
            ))}
          </ProfileWindow>
        </main>

        <SiteLegalFooter siteId={site.id} />
      </div>
    </div>
  );
}
