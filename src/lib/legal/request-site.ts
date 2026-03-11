import { headers } from "next/headers";
import { getLegalSiteConfig, resolveLegalSiteFromHost } from "@/lib/legal/site-config";

export function getRequestLegalSite() {
  const headerStore = headers() as unknown as Awaited<ReturnType<typeof headers>>;
  const host = headerStore.get("host");
  const siteId = resolveLegalSiteFromHost(host);
  return getLegalSiteConfig(siteId);
}
