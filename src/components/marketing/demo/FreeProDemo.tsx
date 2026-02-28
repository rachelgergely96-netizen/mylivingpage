"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeCanvas from "@/components/ThemeCanvas";
import type { ThemeId } from "@/themes/types";
import AiGeneratorPreview from "./AiGeneratorPreview";
import AnalyticsPreview from "./AnalyticsPreview";
import BrowserMockup from "./BrowserMockup";
import ComparisonTable from "./ComparisonTable";
import { THEME_KEY_MAP, type DemoThemeKey, type ViewMode } from "./demo-data";
import MockPageContent from "./MockPageContent";
import ShareCardPreview from "./ShareCardPreview";
import TierToggle from "./TierToggle";

export default function FreeProDemo() {
  const [isPro, setIsPro] = useState(false);
  const [themeKey, setThemeKey] = useState<DemoThemeKey>("celestial");
  const [viewMode, setViewMode] = useState<ViewMode>("story");

  const themeId: ThemeId = THEME_KEY_MAP[themeKey];

  return (
    <section id="demo" className="relative mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16 md:px-10">
      {/* Heading + Toggle with glass backdrop */}
      <div className="relative mx-auto mb-6 w-fit rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(10,22,40,0.55)] px-8 py-6 text-center backdrop-blur-xl sm:mb-8 sm:px-12 sm:py-8">
        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#3B82F6]">Live Demo</p>
        <h2 className="font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl md:text-5xl">
          Free <span className="font-light italic text-[rgba(240,244,255,0.55)]">vs</span>{" "}
          <span className="text-[#3B82F6]">Pro</span>
        </h2>
        <p className="mt-3 text-sm text-[rgba(240,244,255,0.7)]">Flip the toggle. Watch the page come alive.</p>
        <div className="mt-5">
          <TierToggle isPro={isPro} onToggle={() => setIsPro(!isPro)} />
        </div>
      </div>

      {/* Browser Mockup */}
      <BrowserMockup
        isPro={isPro}
        themeKey={themeKey}
        viewMode={viewMode}
        onThemeChange={setThemeKey}
        onViewModeChange={setViewMode}
      >
        {/* Theme canvas with page content overlay */}
        <ThemeCanvas themeId={themeId} height={480} interactive={false}>
          <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.78)_100%)]">
            <MockPageContent isPro={isPro} viewMode={viewMode} />
          </div>
        </ThemeCanvas>

        {/* Pro feature previews */}
        <div className="space-y-3 p-4">
          <AnalyticsPreview isPro={isPro} />
          <ShareCardPreview isPro={isPro} />
          <AiGeneratorPreview isPro={isPro} />
        </div>
      </BrowserMockup>

      {/* Comparison Table */}
      <div className="mt-8 sm:mt-10">
        <ComparisonTable />
      </div>

      {/* Bottom CTA */}
      <div className="mx-auto mt-8 w-fit rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(10,22,40,0.55)] px-8 py-8 text-center backdrop-blur-xl sm:mt-10 sm:px-12 sm:py-10">
        <p className="mx-auto mb-5 max-w-md font-heading text-lg font-light italic leading-relaxed text-[#3B82F6] sm:text-xl">
          The free page is the billboard.<br />The Pro page is the destination.
        </p>
        <Link
          href="/signup"
          className="gold-pill inline-block px-8 py-4 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(59,130,246,0.38)]"
        >
          Create Your Living Page
        </Link>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.25)]">
          Growth First &middot; Revenue Follows
        </p>
      </div>
    </section>
  );
}
