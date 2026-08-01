import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import SiteHeader from "@/components/marketing/SiteHeader";
import JsonLd from "@/components/seo/JsonLd";
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

// Every guide comes from the static GUIDES list above, so unknown slugs can
// return a real 404 status instead of streaming a soft-404 shell.
export const dynamicParams = false;

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);

  if (!guide) {
    notFound();
  }

  const canonicalUrl = getAbsoluteUrl(`/guides/${guide.slug}`);

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
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

  if (!guide) {
    notFound();
  }

  const site = await getRequestLegalSite();
  const articleJsonLd = buildGuideArticleStructuredData(guide);
  const relatedGuides = guide.related
    .map((relatedSlug) => getGuide(relatedSlug))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return (
    <div className="site-shell" data-site-ui>
      <JsonLd data={articleJsonLd} />
      <SiteHeader
        brandName={site.brandName}
        links={[
          { href: "/examples", label: "Examples" },
          { href: "/guides", label: "Guides", current: true },
          { href: "/pricing", label: "Free" },
          { href: "/login", label: "Sign in" },
        ]}
        cta={{
          href: getSignupHref(`guide_${guide.slug}_nav`),
          label: "Create my free page",
          mobileLabel: "Start free",
        }}
      />

      <main id="main-content" className="site-container py-12 sm:py-16">
        <article className="site-panel site-reading-width mx-auto px-5 py-9 sm:px-8 sm:py-12">
          <p className="site-eyebrow">Guide</p>
          <h1 className="site-page-title mt-4">{guide.title}</h1>
          <p className="mt-5 text-base leading-8 text-site-secondary sm:text-lg">
            {guide.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-site-muted">
            <span className="site-badge">{guide.decisionStage}</span>
            <span className="site-badge">By {guide.author}</span>
            <span className="site-badge">
              Updated <time className="ml-1" dateTime={guide.updatedAt}>{formatGuideDate(guide.updatedAt)}</time>
            </span>
          </div>

          <aside className="site-callout mt-8 px-5 py-5" aria-label="Short answer">
            <p className="site-eyebrow">Short answer</p>
            <p className="mt-3 text-base leading-8 text-site-text">{guide.answer}</p>
          </aside>

          <div className="mt-10 space-y-12">
            {guide.sections.map((section) => (
              <section key={section.title}>
                <h2 className="site-section-title text-[1.75rem]">{section.title}</h2>
                <div className="mt-4 space-y-4 text-base leading-8 text-site-secondary">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets?.length ? (
                  <ul className="mt-5 divide-y divide-site-border border-y border-site-border">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3 py-4 text-sm leading-7 text-site-secondary">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 bg-site-action" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>

        <section aria-label="Next steps" className="mx-auto mt-10 grid max-w-5xl gap-4 lg:grid-cols-3">
          <Link
            href={getSignupHref(`guide_${guide.slug}_build`)}
            className="site-panel block p-6 transition-colors hover:border-site-action"
          >
            <p className="site-eyebrow">Build</p>
            <h2 className="site-panel-title mt-3">Start from the résumé you already use</h2>
            <p className="mt-3 text-sm leading-7 text-site-secondary">
              Start from the information you already use, then publish one page that is easier to
              scan once a person wants more context.
            </p>
          </Link>
          <Link
            href={`/pricing?ref=guide_${guide.slug}_pricing`}
            className="site-panel block p-6 transition-colors hover:border-site-action"
          >
            <p className="site-eyebrow">Included free</p>
            <h2 className="site-panel-title mt-3">See everything included: PDF export and share card</h2>
            <p className="mt-3 text-sm leading-7 text-site-secondary">
              Use the same uploaded information to create a fresh PDF, a PNG share card, and a
              page link you can keep reusing.
            </p>
          </Link>
          <Link
            href={`/examples?ref=guide_${guide.slug}_examples`}
            className="site-panel block p-6 transition-colors hover:border-site-action"
          >
            <p className="site-eyebrow">Examples</p>
            <h2 className="site-panel-title mt-3">See sample pages recruiters can scan quickly</h2>
            <p className="mt-3 text-sm leading-7 text-site-secondary">
              Review real page shapes for follow-up, recruiter-click, and referral moments before
              you build your own.
            </p>
          </Link>
        </section>

        {relatedGuides.length ? (
          <section className="site-panel mx-auto mt-10 max-w-5xl px-5 py-8 sm:px-8">
            <p className="site-eyebrow">Related guides</p>
            <div className="mt-6 grid gap-px bg-site-border md:grid-cols-2">
              {relatedGuides.map((relatedGuide) => (
                <article key={relatedGuide.slug} className="bg-site-surface p-5">
                  <Link
                    href={`/guides/${relatedGuide.slug}`}
                    className="site-panel-title transition-colors hover:text-site-action-hover"
                  >
                    {relatedGuide.title}
                  </Link>
                  <p className="site-eyebrow mt-3">{relatedGuide.decisionStage}</p>
                  <p className="mt-3 text-sm leading-7 text-site-secondary">{relatedGuide.summary}</p>
                  <Link
                    href={`/guides/${relatedGuide.slug}`}
                    aria-label={`Read ${relatedGuide.title}`}
                    className="mt-5 inline-flex text-sm font-semibold text-site-action transition-colors hover:text-site-action-hover"
                  >
                    Read guide
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <SiteLegalFooter siteId={site.id} />
    </div>
  );
}
