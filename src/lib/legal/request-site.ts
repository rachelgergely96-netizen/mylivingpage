import { headers } from "next/headers";
import { getLegalSiteConfig, resolveLegalSiteFromHost } from "@/lib/legal/site-config";

export function getRequestLegalSite() {
  const host = headers().get("host");
  const siteId = resolveLegalSiteFromHost(host);
  return getLegalSiteConfig(siteId);
}
