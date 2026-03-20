"use client";

import Link from "next/link";
import { useState } from "react";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { DEMO_PAGES } from "@/lib/demo-data";
import { CLICK_MOMENT_DEMO_HIGHLIGHTS } from "@/lib/marketing-samples";
import type { ThemeId } from "@/themes/types";
import BrowserMockup from "./demo/BrowserMockup";
import { THEME_ACCENTS, THEME_KEY_MAP, type DemoThemeKey } from "./demo/demo-data";

const DEMO_THEME_OPTIONS: DemoThemeKey[] = ["ember", "luxe"];
const DEMO_PAGE = DEMO_PAGES[0];

function getSignupHref(ref: string) {
  return `/signup?ref=${ref}&next=/create`;
}

export default function ClickMomentDemo() {
  const [themeKey, setThemeKey] = useState<DemoThemeKey>("ember");
  const themeId: ThemeId = THEME_KEY_MAP[themeKey];

  return (
    <section id="demo-section" className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 md:px-10">
      <div className="glass-card overflow-hidden rounded-[2rem] border border-[rgba(229,183,107,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-5 py-6 shadow-[0_40px_120px_rgba(2,6,23,0.32)] sm:px-8 sm:py-8 md:px-10 md:py-10">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E5B76B]">See the click moment</p>
            <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.02] tracking-[-0.03em] text-[#F7F1E8] sm:text-4xl md:text-5xl">
              This is the kind of page a recruiter opens after your name gets surfaced.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[rgba(247,241,232,0.72)]">
              It is not a live preview from your own resume yet. It is a representative look at how your headline, proof, and links can land in seconds once someone clicks through.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {DEMO_THEME_OPTIONS.map((option) => {
                const active = option === themeKey;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setThemeKey(option)}
                    className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all ${
                      active
                        ? "border-[rgba(229,183,107,0.45)] bg-[rgba(229,183,107,0.14)] text-[#F7F1E8]"
                        : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] text-[rgba(240,244,255,0.56)] hover:border-[rgba(229,183,107,0.28)] hover:text-[#F7F1E8]"
                    }`}
                  >
                    {THEME_ACCENTS[option].label}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 grid gap-3">
              {CLICK_MOMENT_DEMO_HIGHLIGHTS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.4rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(8,14,28,0.46)] px-4 py-4"
                >
                  <p className="text-sm font-semibold text-[#F7F1E8]">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[rgba(240,244,255,0.62)]">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={getSignupHref("landing_demo_primary")}
                className="gold-pill px-6 py-3 text-sm font-semibold transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:shadow-[0_14px_42px_rgba(229,183,107,0.18)]"
              >
                Start Your Free Month
              </Link>
              <p className="text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.38)]">
                Browse the format now. Publish later.
              </p>
            </div>
          </div>

          <div className="lg:pl-2">
            <BrowserMockup
              isPro
              themeKey={themeKey}
              viewMode="recruiter"
              onThemeChange={setThemeKey}
              onViewModeChange={() => {}}
              themeOptions={DEMO_THEME_OPTIONS}
              showViewModeControls={false}
              maxViewportHeightClassName="max-h-[720px]"
            >
              <ThemeCanvas themeId={themeId} height={620} className="rounded-none" interactive>
                <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.56)_100%)] px-3 py-3 sm:px-4 sm:py-4">
                  <div className="h-full overflow-hidden rounded-[1.35rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(8,14,28,0.22)]">
                    <ResumeLayout data={DEMO_PAGE.data} />
                  </div>
                </div>
              </ThemeCanvas>
            </BrowserMockup>
          </div>
        </div>
      </div>
    </section>
  );
}
