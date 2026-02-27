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
      {/* Dark vignette behind heading + toggle for contrast over CosmicBackground */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_center,rgba(26,10,46,0.85)_0%,rgba(26,10,46,0.5)_45%,transparent_75%)]" />

      {/* Heading */}
      <div className="relative mb-6 text-center sm:mb-8">
        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#D4A654] drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">Live Demo</p>
        <h2 className="font-heading text-3xl font-bold text-[#F5F0EB] drop-shadow-[0_2px_20px_rgba(0,0,0,0.9)] sm:text-4xl md:text-5xl">
          Free <span className="font-light italic text-[rgba(245,240,235,0.55)]">vs</span>{" "}
          <span className="text-[#D4A654]">Pro</span>
        </h2>
        <p className="mt-3 text-sm text-[rgba(245,240,235,0.7)] drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">Flip the toggle. Watch the page come alive.</p>
      </div>

      {/* Toggle */}
      <div className="relative mb-6 sm:mb-8">
        <TierToggle isPro={isPro} onToggle={() => setIsPro(!isPro)} />
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
      <div className="mt-8 text-center sm:mt-10">
        <p className="mx-auto mb-5 max-w-md font-heading text-lg font-light italic leading-relaxed text-[#D4A654] sm:text-xl">
          The free page is the billboard.<br />The Pro page is the destination.
        </p>
        <Link
          href="/signup"
          className="gold-pill inline-block px-8 py-4 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(212,166,84,0.38)]"
        >
          Create Your Living Page
        </Link>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(245,240,235,0.25)]">
          Growth First &middot; Revenue Follows
        </p>
      </div>
    </section>
  );
}
