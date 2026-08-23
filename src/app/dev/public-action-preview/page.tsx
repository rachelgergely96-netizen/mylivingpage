import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicPageActionDock from "@/components/PublicPageActionDock";
import { DEMO_PAGES } from "@/lib/demo-data";
import { isEditorPreviewEnabled } from "@/lib/editor-preview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public Action Preview | MyLivingPage",
  robots: { index: false, follow: false },
};

export default function PublicActionPreviewPage() {
  if (!isEditorPreviewEnabled()) {
    notFound();
  }

  const demo = DEMO_PAGES[0];
  if (!demo) {
    notFound();
  }

  return (
    <main
      id="main-content"
      className="site-shell min-h-screen px-5 py-12"
      data-site-ui
    >
      <div className="site-panel mx-auto max-w-xl p-6">
        <p className="site-eyebrow">Local interaction preview</p>
        <h1 className="site-page-title mt-3">Public page actions</h1>
        <p className="mt-3 text-sm leading-6 text-site-secondary">
          A credential-free harness for responsive focus and action-sheet checks.
        </p>
      </div>
      <PublicPageActionDock
        pageId="public-action-preview"
        isOwner={false}
        slug="avery-sample"
        themeId={demo.themeId}
        resumeData={demo.data}
        liveUrl="https://mylivingpage.com/avery-sample"
      />
    </main>
  );
}
