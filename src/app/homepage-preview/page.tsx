import type { Metadata } from "next";
import SignalFrameHomepage from "@/components/marketing/SignalFrameHomepage";

export const metadata: Metadata = {
  title: "Signal Frame Homepage Preview | MyLivingPage",
  description: "A private visual review route for the current MyLivingPage homepage and Signal Frame design system.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HomepagePreviewPage() {
  return <SignalFrameHomepage />;
}
