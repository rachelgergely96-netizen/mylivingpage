import type { Metadata } from "next";
import LivingHomepagePrototype from "@/components/marketing/LivingHomepagePrototype";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Living Page Observatory Prototype | MyLivingPage",
  description: "A noindex visual prototype exploring a homepage that behaves like a Living Page.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HomepagePreviewPage() {
  return <LivingHomepagePrototype />;
}
