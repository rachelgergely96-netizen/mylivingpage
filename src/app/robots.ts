import type { MetadataRoute } from "next";
import { getAbsoluteUrl, getAppOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api", "/dashboard", "/admin", "/callback"],
    },
    sitemap: getAbsoluteUrl("/sitemap.xml"),
    host: getAppOrigin().hostname,
  };
}
