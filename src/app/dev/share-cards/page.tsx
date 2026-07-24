import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScaledShareCardArtwork } from "@/components/ScaledShareCardArtwork";
import TiltCard from "@/components/marketing/TiltCard";
import { DEMO_PAGES } from "@/lib/demo-data";
import { isEditorPreviewEnabled } from "@/lib/editor-preview";
import {
  buildShareCardModel,
  getShareCardVisual,
  normalizeAppUrl,
} from "@/lib/share-card";
import {
  SHARE_CARD_FINISHES,
  SHARE_CARD_FINISH_LABELS,
} from "@/lib/share-card-finish";
import { slugifyUsername } from "@/lib/usernames";
import type { ThemeId } from "@/themes/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Share Card Finishes | MyLivingPage",
  robots: { index: false, follow: false },
};

// A spread of accents/grounds so each finish is judged across warm, cool, and
// signature themes rather than one flattering case.
const PREVIEW_THEMES: ThemeId[] = [
  "obsidian",
  "aurora",
  "velvet",
  "atlas",
  "ember",
];

export default function ShareCardFinishesPage() {
  if (!isEditorPreviewEnabled()) {
    notFound();
  }

  const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  const resume = DEMO_PAGES[0]?.data;
  if (!resume) {
    notFound();
  }
  const slug = slugifyUsername(resume.name || "member");
  const model = buildShareCardModel({ appUrl, resume, slug });

  return (
    <div className="site-shell" data-site-ui>
      <header className="site-header">
        <div className="site-container-wide flex h-16 items-center justify-between gap-4">
          <span className="site-wordmark">
            my<span>living</span>page
          </span>
          <span className="border border-site-warning px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-site-warning">
            Share card finishes
          </span>
        </div>
      </header>

      <main className="site-container-wide py-8" id="main-content">
        <div className="mb-6 max-w-3xl">
          <p className="site-eyebrow">Premium finishes</p>
          <h1 className="site-page-title mt-2">Metal &amp; holographic share cards</h1>
          <p className="mt-3 text-sm leading-6 text-site-secondary">
            Each row is one theme rendered in all three finishes. The theme still
            supplies the signature color; the finish supplies the material.
          </p>
        </div>

        <div className="space-y-10">
          {PREVIEW_THEMES.map((themeId) => {
            const visual = getShareCardVisual(themeId);
            return (
              <section key={themeId}>
                <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-site-muted">
                  {visual.themeName}
                </h2>
                <div className="grid gap-5 lg:grid-cols-3">
                  {SHARE_CARD_FINISHES.map((finish) => (
                    <div key={finish}>
                      <p className="mb-2 text-xs font-semibold text-site-secondary">
                        {SHARE_CARD_FINISH_LABELS[finish]}
                      </p>
                      <TiltCard>
                        <ScaledShareCardArtwork
                          animatedShine
                          finish={finish}
                          frameClassName="w-full border border-site-border"
                          model={model}
                          testId={`share-card-${themeId}-${finish}`}
                          visual={visual}
                        />
                      </TiltCard>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
