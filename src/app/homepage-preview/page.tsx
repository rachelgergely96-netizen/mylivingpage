import type { Metadata } from "next";
import LivingHomepagePrototype from "@/components/marketing/LivingHomepagePrototype";
import { getAbsoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Homepage prototype",
  description: "A noindex prototype for creating a free professional page and ATS-ready résumé from one reviewed source.",
  alternates: { canonical: getAbsoluteUrl("/") },
  robots: {
    index: false,
    follow: false,
  },
};

export default function HomepagePreviewPage() {
  return <LivingHomepagePrototype />;
}
