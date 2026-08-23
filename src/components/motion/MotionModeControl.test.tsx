import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import MotionModeControl from "@/components/motion/MotionModeControl";
import MotionPreferenceProvider, {
  MotionPreferenceContext,
} from "@/components/motion/MotionPreferenceProvider";
import { useMotionPreference } from "@/hooks/useMotionPreference";

function renderControl(compact = false) {
  return renderToStaticMarkup(
    <MotionPreferenceContext.Provider
      value={{
        mode: "still",
        preference: "system",
        systemReducedMotion: true,
        setPreference: vi.fn(),
      }}
    >
      <MotionModeControl compact={compact} />
    </MotionPreferenceContext.Provider>,
  );
}

function PreferenceProbe() {
  const preference = useMotionPreference();
  return (
    <output
      data-mode={preference.mode}
      data-preference={preference.preference}
      data-system-reduced={String(preference.systemReducedMotion)}
    />
  );
}

describe("MotionModeControl", () => {
  it("renders one labelled radio group with all four preferences", () => {
    const markup = renderControl();

    expect(markup).toContain("<fieldset");
    expect(markup).toContain("<legend");
    expect(markup).toContain("Motion</legend>");
    expect(markup).toContain("aria-describedby=");
    expect((markup.match(/type="radio"/g) ?? []).length).toBe(4);
    expect((markup.match(/name="motion-preference"/g) ?? []).length).toBe(4);
    expect(markup).toMatch(/<input[^>]*checked=""[^>]*value="system"/);
    expect(markup).toContain("Device");
    expect(markup).toContain("Full");
    expect(markup).toContain("Calm");
    expect(markup).toContain("Still");
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Active mode:");
    expect(markup).toContain('data-motion-state="still"');
  });

  it("renders the compact control as a natively labelled select", () => {
    const markup = renderControl(true);

    expect(markup).toContain("<label");
    expect(markup).toContain("<select");
    expect(markup).toContain('aria-label="Motion preference"');
    expect((markup.match(/<option/g) ?? []).length).toBe(4);
    expect(markup).toContain('<option value="system" selected="">Device</option>');
    expect(markup).toContain('data-motion-state="still"');
  });

  it("accepts a contextual accessible name for compact controls", () => {
    const markup = renderToStaticMarkup(
      <MotionPreferenceContext.Provider
        value={{
          mode: "still",
          preference: "system",
          systemReducedMotion: true,
          setPreference: vi.fn(),
        }}
      >
        <MotionModeControl compact ariaLabel="Site motion preference" />
      </MotionPreferenceContext.Provider>,
    );

    expect(markup).toContain('aria-label="Site motion preference"');
  });
});

describe("MotionPreferenceProvider", () => {
  it("uses a deterministic server snapshot for hydration", () => {
    const markup = renderToStaticMarkup(
      <MotionPreferenceProvider>
        <PreferenceProbe />
      </MotionPreferenceProvider>,
    );

    expect(markup).toContain('data-mode="full"');
    expect(markup).toContain('data-preference="system"');
    expect(markup).toContain('data-system-reduced="false"');
  });
});
