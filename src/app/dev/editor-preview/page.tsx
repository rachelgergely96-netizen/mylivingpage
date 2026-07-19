import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageEditorClient from "@/components/edit/PageEditorClient";
import { isEditorPreviewEnabled } from "@/lib/editor-preview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editor Layout Preview | MyLivingPage",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EditorLayoutPreviewPage() {
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
            Local editor preview
          </span>
        </div>
      </header>
      <PageEditorClient pageId="editor-layout-preview" />
    </div>
  );
}
