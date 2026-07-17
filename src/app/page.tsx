import type { Metadata } from "next";
import SiteLegalFooter from "@/components/legal/SiteLegalFooter";
import MobileStickyCta from "@/components/marketing/MobileStickyCta";
import SignalFrameHomepage from "@/components/marketing/SignalFrameHomepage";
import { getRequestLegalSite } from "@/lib/legal/request-site";
import { getAbsoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

const canonicalUrl = getAbsoluteUrl("/");

export const metadata: Metadata = {
  title: `${SITE_NAME} | ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: canonicalUrl,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
};

export default async function LandingPage() {
  const site = await getRequestLegalSite();

  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-[#060e1c]">
      <SignalFrameHomepage />
      <div className="relative z-10 bg-[#060e1c]" data-site-ui>
        <SiteLegalFooter siteId={site.id} />
      </div>
      <MobileStickyCta
        href="/signup?ref=landing_mobile_start&next=/create"
        label="Build free"
        targetId="hero-section"
        hideNearId="final-cta"
      />
    </div>
  );
}
