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

export function buildHomeStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: ORGANIZATION_NAME,
        url: absoluteUrl("/"),
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: absoluteUrl("/"),
        description: SITE_DESCRIPTION,
        publisher: {
          "@type": "Organization",
          name: ORGANIZATION_NAME,
        },
      },
    ],
  };
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
