import type { MetadataRoute } from "next";
import { GUIDES, GUIDE_UPDATED_AT } from "@/lib/guides";
import { getLegalNavItems } from "@/lib/legal/site-config";
import { getAbsoluteUrl } from "@/lib/site";

const LEGAL_PATHS = getLegalNavItems("mylivingpage").map((item) => item.href);

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: getAbsoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: getAbsoluteUrl("/pricing"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: getAbsoluteUrl("/examples"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: getAbsoluteUrl("/guides"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...GUIDES.map((guide) => ({
      url: getAbsoluteUrl(`/guides/${guide.slug}`),
      lastModified: new Date(GUIDE_UPDATED_AT),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...LEGAL_PATHS.map((path) => ({
      url: getAbsoluteUrl(path),
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
