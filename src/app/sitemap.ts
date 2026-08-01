import type { MetadataRoute } from "next";
import { GUIDES, GUIDE_UPDATED_AT, MARKETING_UPDATED_AT } from "@/lib/guides";
import { getLegalNavItems } from "@/lib/legal/site-config";
import {
  COOKIE_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/legal-version";
import { getAbsoluteUrl } from "@/lib/site";

const LEGAL_PATHS = getLegalNavItems("mylivingpage").map((item) => item.href);

// The most recent policy revision, so legal lastModified tracks real version dates.
const LEGAL_UPDATED_AT = [TERMS_VERSION, PRIVACY_VERSION, COOKIE_VERSION]
  .sort()
  .at(-1)!;

export default function sitemap(): MetadataRoute.Sitemap {
  const marketingUpdated = new Date(MARKETING_UPDATED_AT);
  const legalUpdated = new Date(LEGAL_UPDATED_AT);

  return [
    { url: getAbsoluteUrl("/"), lastModified: marketingUpdated, changeFrequency: "weekly", priority: 1 },
    { url: getAbsoluteUrl("/pricing"), lastModified: marketingUpdated, changeFrequency: "monthly", priority: 0.8 },
    { url: getAbsoluteUrl("/examples"), lastModified: marketingUpdated, changeFrequency: "weekly", priority: 0.8 },
    { url: getAbsoluteUrl("/guides"), lastModified: marketingUpdated, changeFrequency: "weekly", priority: 0.8 },
    ...GUIDES.map((guide) => ({
      url: getAbsoluteUrl(`/guides/${guide.slug}`),
      lastModified: new Date(GUIDE_UPDATED_AT),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...LEGAL_PATHS.map((path) => ({
      url: getAbsoluteUrl(path),
      lastModified: legalUpdated,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
