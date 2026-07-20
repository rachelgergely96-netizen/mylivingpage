import type { Metadata } from "next";
import LivingHomepagePrototype from "@/components/marketing/LivingHomepagePrototype";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Turn Your Résumé Into a Page You Can Share | MyLivingPage Prototype",
  description: "A noindex action-first homepage prototype for creating and publishing your professional page.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HomepagePreviewPage() {
  return <LivingHomepagePrototype />;
}
