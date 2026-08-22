import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  DashboardWelcomeBack,
  type DashboardWelcomeBackSnapshot,
} from "@/components/dashboard/DashboardWelcomeBack";
import { MotionPreferenceContext } from "@/components/motion/MotionPreferenceProvider";
import type { ResumeData } from "@/types/resume";

const resumeData: ResumeData = {
  name: "Avery Morgan",
  headline: "Product leader",
  location: "New York, NY",
  email: "avery@example.com",
  linkedin: null,
  github: null,
  website: null,
  avatar_url: null,
  summary: "I build useful products.",
  experience: [],
  education: [],
  projects: [],
  skills: [{ category: "Product", items: ["Strategy"] }],
  certifications: [],
  stats: [],
  proofs: [],
  testimonials: [],
};

const snapshot: DashboardWelcomeBackSnapshot = {
  accent: "#60a5fa",
  accentBright: "#93c5fd",
  accentSoft: "rgba(96, 165, 250, 0.15)",
  displayName: "Avery Morgan",
  livePath: "/avery-sample",
  offlineAttemptAt: null,
  pageName: "Avery Morgan",
  proofStatus: "proof_landed",
  publicViewAvailable: true,
  resumeData,
  themeId: "cosmic",
  themeName: "Cosmic",
  viewsLast7d: 4,
};

describe("DashboardWelcomeBack", () => {
  it("renders Still as an immediate, non-modal dashboard summary", () => {
    const markup = renderToStaticMarkup(
      <MotionPreferenceContext.Provider
        value={{
          mode: "still",
          preference: "still",
          systemReducedMotion: true,
          setPreference: vi.fn(),
        }}
      >
        <DashboardWelcomeBack snapshot={snapshot} />
      </MotionPreferenceContext.Provider>,
    );

    expect(markup).toContain('data-state="inline"');
    expect(markup).toContain("Avery, your page kept living.");
    expect(markup).toContain("Someone viewed it after your last share.");
    expect(markup).toContain("/avery-sample");
    expect(markup).toContain("Dismiss summary");
    expect(markup).not.toContain('role="dialog"');
    expect(markup).not.toContain("aria-modal");
    expect(markup).not.toContain("data-dashboard-welcome-preview");
  });
});
