import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import CosmicBackground from "@/components/marketing/CosmicBackground";
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
    <div className="relative isolate min-h-screen overflow-x-hidden">
      <CosmicBackground />
      <div className="relative z-10">
        <JsonLd data={articleJsonLd} />

        <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
          <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 md:px-10">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl">
                my<span className="text-[#3B82F6]">living</span>page
              </Link>
              <Link
                href="/guides"
                className="hidden text-xs uppercase tracking-[0.18em] text-[rgba(240,244,255,0.56)] transition-colors hover:text-[#93C5FD] sm:inline-flex"
              >
                Guides
              </Link>
            </div>
            <Link
              href={getSignupHref(`guide_${guide.slug}_nav`)}
              className="gold-pill px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)]"
            >
              Start From My Resume
            </Link>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
          <article className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-10 sm:px-10 sm:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Guide</p>
            <h1 className="mt-3 font-heading text-4xl font-bold leading-[1.04] tracking-[-0.04em] text-[#F0F4FF] sm:text-5xl">
              {guide.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[rgba(240,244,255,0.66)] sm:text-lg">
              {guide.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.45)]">
              <span className="rounded-full border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] px-3 py-1.5 text-[#93C5FD]">
                {guide.decisionStage}
              </span>
              <span className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5">
                By {guide.author}
              </span>
              <span className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5">
                Updated <time dateTime={guide.updatedAt}>{formatGuideDate(guide.updatedAt)}</time>
              </span>
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)] px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">Short answer</p>
              <p className="mt-3 text-base leading-8 text-[#F0F4FF]">{guide.answer}</p>
            </div>

            <div className="mt-10 space-y-10">
              {guide.sections.map((section) => (
                <section key={section.title}>
                  <h2 className="font-heading text-3xl font-bold text-[#F0F4FF]">{section.title}</h2>
                  <div className="mt-4 space-y-4 text-base leading-8 text-[rgba(240,244,255,0.66)]">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {section.bullets?.length ? (
                    <ul className="mt-5 space-y-2">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm leading-7 text-[rgba(240,244,255,0.68)]"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </article>

          <section className="mt-10 grid gap-4 lg:grid-cols-3">
            <Link
              href={getSignupHref(`guide_${guide.slug}_build`)}
              className="glass-card rounded-[1.75rem] border border-[rgba(59,130,246,0.18)] px-6 py-6 transition-all hover:-translate-y-0.5 hover:border-[rgba(59,130,246,0.35)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">Build</p>
              <h2 className="mt-3 font-heading text-2xl font-bold text-[#F0F4FF]">Start from the resume you already use</h2>
              <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.62)]">
                Start from the information you already use, then publish one page that is easier to scan once a person wants more context.
              </p>
            </Link>
            <Link
              href={`/pricing?ref=guide_${guide.slug}_pricing`}
              className="glass-card rounded-[1.75rem] border border-[rgba(255,255,255,0.08)] px-6 py-6 transition-all hover:-translate-y-0.5 hover:border-[rgba(59,130,246,0.24)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">Export</p>
              <h2 className="mt-3 font-heading text-2xl font-bold text-[#F0F4FF]">See PDF export and QR-ready share card options</h2>
              <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.62)]">
                Use the same uploaded information to create a fresh PDF, a PNG share card, and a page link you can keep reusing.
              </p>
            </Link>
            <Link
              href={`/examples?ref=guide_${guide.slug}_examples`}
              className="glass-card rounded-[1.75rem] border border-[rgba(255,255,255,0.08)] px-6 py-6 transition-all hover:-translate-y-0.5 hover:border-[rgba(59,130,246,0.24)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">Examples</p>
              <h2 className="mt-3 font-heading text-2xl font-bold text-[#F0F4FF]">See sample pages recruiters can scan quickly</h2>
              <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.62)]">
                Review real page shapes for follow-up, recruiter-click, and referral moments before you build your own.
              </p>
            </Link>
          </section>

          <section className="mt-10">
            <div className="glass-card rounded-[2rem] border border-[rgba(255,255,255,0.08)] px-6 py-8 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Related guides</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {relatedGuides.map((relatedGuide) => (
                  <article
                    key={relatedGuide.slug}
                    className="rounded-[1.5rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5"
                  >
                    <Link
                      href={`/guides/${relatedGuide.slug}`}
                      className="font-heading text-2xl font-bold leading-tight text-[#F0F4FF] transition-colors hover:text-[#BFDBFE]"
                    >
                      {relatedGuide.title}
                    </Link>
                    <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">{relatedGuide.decisionStage}</p>
                    <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.62)]">{relatedGuide.summary}</p>
                    <Link
                      href={`/guides/${relatedGuide.slug}`}
                      className="mt-5 inline-flex text-sm font-semibold text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
                    >
                      Read {relatedGuide.title}
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </main>

        <SiteLegalFooter siteId={site.id} />
      </div>
    </div>
  );
}
