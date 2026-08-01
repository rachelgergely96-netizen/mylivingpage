import type { Guide } from "@/lib/guides";
import {
  ORGANIZATION_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
} from "@/lib/site";

interface CollectionPageInput {
  path: `/${string}` | "/";
  name: string;
  description: string;
}

/**
 * Sitewide Organization + WebSite JSON-LD rendered once from the root layout.
 * The single source for this graph — keep route-level builders below in sync
 * with the @id anchors it defines.
 */
export function buildSiteStructuredData() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${absoluteUrl("/")}#organization`,
    name: ORGANIZATION_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${absoluteUrl("/")}#website`,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    publisher: {
      "@id": `${absoluteUrl("/")}#organization`,
    },
  };

  return [organization, website];
}

export function buildCollectionPageStructuredData({ path, name, description }: CollectionPageInput) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };
}

export function buildGuideArticleStructuredData(guide: Guide) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    url: absoluteUrl(`/guides/${guide.slug}`),
    mainEntityOfPage: absoluteUrl(`/guides/${guide.slug}`),
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    author: {
      "@type": "Organization",
      name: guide.author,
    },
    publisher: {
      "@type": "Organization",
      name: ORGANIZATION_NAME,
      url: absoluteUrl("/"),
    },
    articleSection: guide.sections.map((section) => section.title),
  };
}
