import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AtsReadinessCard from "@/components/AtsReadinessCard";
import { DEMO_PAGES } from "@/lib/demo-data";
import { isEditorPreviewEnabled } from "@/lib/editor-preview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ATS Check Layout Preview | MyLivingPage",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AtsCheckLayoutPreviewPage() {
  if (!isEditorPreviewEnabled()) {
    notFound();
  }

  return (
    <div className="site-shell" data-site-ui>
      <header className="site-header">
        <div className="site-container-wide flex h-16 items-center justify-between gap-4">
          <Link href="/" className="site-wordmark shrink-0">
            my<span>living</span>page
          </Link>
          <span className="border border-site-warning px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-site-warning">
            Local ATS preview
          </span>
        </div>
      </header>
      <main className="site-container max-w-4xl py-8 sm:py-12" id="main-content">
        <div className="mb-5 px-1">
          <p className="site-eyebrow">Signal studio · ATS &amp; job check</p>
          <h1 className="site-page-title mt-2">Make the word match visible</h1>
        </div>
        <AtsReadinessCard resumeData={DEMO_PAGES[0].data} />
      </main>
    </div>
  );
}
