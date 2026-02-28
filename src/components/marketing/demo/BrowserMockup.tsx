import type { ReactNode } from "react";
import { THEME_ACCENTS, type DemoThemeKey, type ViewMode } from "./demo-data";

interface BrowserMockupProps {
  isPro: boolean;
  themeKey: DemoThemeKey;
  viewMode: ViewMode;
  onThemeChange: (key: DemoThemeKey) => void;
  onViewModeChange: (mode: ViewMode) => void;
  children: ReactNode;
}

const themes: DemoThemeKey[] = ["celestial", "noir", "ocean"];
const viewModes: ViewMode[] = ["story", "recruiter", "project"];

export default function BrowserMockup({
  isPro,
  themeKey,
  viewMode,
  onThemeChange,
  onViewModeChange,
  children,
}: BrowserMockupProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-all duration-500 ${isPro ? "border-[rgba(59,130,246,0.25)] shadow-[0_0_80px_rgba(59,130,246,0.05),0_12px_48px_rgba(0,0,0,0.4)]" : "border-[rgba(255,255,255,0.08)]"}`}
      style={{ background: "var(--deep-purple, #0a1628)" }}
    >
      {/* Chrome bar */}
      <div className="flex items-center gap-2 sm:gap-3 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(8,14,28,0.9)] px-3 py-2.5 sm:px-4 sm:py-3">
        {/* Dots */}
        <div className="hidden sm:flex gap-[5px]">
          <span className="h-2 w-2 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="h-2 w-2 rounded-full" style={{ background: "#ffbd2e" }} />
          <span className="h-2 w-2 rounded-full" style={{ background: "#28c840" }} />
        </div>

        {/* URL bar */}
        <div
          className={`flex flex-1 items-center gap-1.5 rounded-md bg-[rgba(255,255,255,0.05)] px-3 py-1.5 font-mono text-[11px] transition-colors duration-500 ${isPro ? "text-[#3B82F6]" : "text-[rgba(240,244,255,0.35)]"}`}
        >
          <span className="text-[10px] text-[#5BD67C]">&#x1F512;</span>
          <span>{isPro ? "raysmith.page" : "mylivingpage.com/ray"}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme dots */}
          <div className={`flex gap-[5px] transition-all duration-400 ${isPro ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            {themes.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onThemeChange(key)}
                className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-300 ${themeKey === key ? "border-white scale-110" : "border-transparent"}`}
                style={{ background: THEME_ACCENTS[key].dot }}
              />
            ))}
          </div>

          {/* View mode tabs */}
          <div className={`hidden sm:flex gap-1 transition-all duration-400 ${isPro ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            {viewModes.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={`rounded px-2 py-1 font-mono text-[9px] uppercase tracking-[0.06em] border transition-all duration-200 ${viewMode === mode ? "border-[rgba(59,130,246,0.4)] bg-[rgba(59,130,246,0.15)] text-[#3B82F6]" : "border-[rgba(255,255,255,0.06)] text-[rgba(240,244,255,0.3)]"}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Viewport */}
      <div className="max-h-[75vh] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(59,130,246,0.15) transparent" }}>
        {children}
      </div>
    </div>
  );
}
