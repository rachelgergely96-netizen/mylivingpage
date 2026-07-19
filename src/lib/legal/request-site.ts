import { getLegalSiteConfig, type LegalSiteId } from "@/lib/legal/site-config";

function getBuildLegalSiteId(): LegalSiteId {
  return process.env.NEXT_PUBLIC_LEGAL_SITE === "second-site"
    ? "second-site"
    : "mylivingpage";
}

export function getRequestLegalSite() {
  return getLegalSiteConfig(getBuildLegalSiteId());
}
