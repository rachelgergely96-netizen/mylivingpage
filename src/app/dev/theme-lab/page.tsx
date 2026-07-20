import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeQualityLab } from "@/components/dev/ThemeQualityLab";
import { isEditorPreviewEnabled } from "@/lib/editor-preview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Theme Quality Lab | MyLivingPage",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ThemeLabPage() {
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
            Local theme lab
          </span>
        </div>
      </header>

      <main className="site-container-wide py-6 sm:py-8" id="main-content">
        <div className="mb-5 max-w-3xl">
          <p className="site-eyebrow">Renderer quality gate</p>
          <h1 className="site-page-title mt-2">Catalog theme lab</h1>
          <p className="mt-3 text-sm leading-6 text-site-secondary">
            Full-page review for every Living Resume theme, with optional motion and focus checks.
          </p>
        </div>
        <ThemeQualityLab />
      </main>
    </div>
  );
}
