import type { Metadata } from "next";
import LivingHomepagePrototype from "@/components/marketing/LivingHomepagePrototype";
import { getAbsoluteUrl, SITE_NAME } from "@/lib/site";

const canonicalUrl = getAbsoluteUrl("/");
const homepageTitle = `Turn your résumé into a page you can share | ${SITE_NAME}`;
const homepageDescription =
  "Upload your résumé, review a private draft, and publish one professional web page—completely free.";

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
