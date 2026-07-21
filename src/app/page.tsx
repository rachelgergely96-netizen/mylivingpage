import type { Metadata } from "next";
import LivingHomepagePrototype from "@/components/marketing/LivingHomepagePrototype";
import { getAbsoluteUrl, SITE_NAME } from "@/lib/site";

const canonicalUrl = getAbsoluteUrl("/");
const homepageTitle = `Turn Your Résumé Into a Page You Can Share | ${SITE_NAME}`;
const homepageDescription =
  "Upload your résumé, review a polished private draft, and publish one professional link—completely free.";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: homepageTitle,
  description: homepageDescription,
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: homepageTitle,
    description: homepageDescription,
    url: canonicalUrl,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: homepageTitle,
    description: homepageDescription,
  },
};

export default function LandingPage() {
  return <LivingHomepagePrototype mode="production" />;
}
