import { headers } from "next/headers";
import { getLegalSiteConfig, resolveLegalSiteFromHost } from "@/lib/legal/site-config";

export async function getRequestLegalSite() {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const siteId = resolveLegalSiteFromHost(host);
  return getLegalSiteConfig(siteId);
}
