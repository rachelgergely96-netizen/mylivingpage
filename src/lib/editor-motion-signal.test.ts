import { describe, expect, it } from "vitest";
import {
  EDITOR_SIGNAL_DWELL_MS,
  EDITOR_SIGNAL_SECTIONS,
  getEditorSignalLabel,
  getEditorSignalSection,
  getEditorSignalTargetSelector,
  getEditorSaveMotionState,
} from "@/lib/editor-motion-signal";

describe("editor motion signal", () => {
  it("keeps correspondence visible within the bounded dwell window", () => {
    expect(EDITOR_SIGNAL_DWELL_MS).toBeGreaterThanOrEqual(600);
    expect(EDITOR_SIGNAL_DWELL_MS).toBeLessThanOrEqual(800);
  });

  it("maps every editable resume section to a stable preview target", () => {
    expect(getEditorSignalTargetSelector("profile")).toBe("[data-resume-header]");

    EDITOR_SIGNAL_SECTIONS.filter((section) => section !== "profile").forEach(
      (section) => {
        expect(getEditorSignalTargetSelector(section)).toBe(
          `[data-motion-section="${section}"]`,
        );
      },
    );
  });

  it("rejects non-resume editor sections and exposes human-readable status labels", () => {
    expect(getEditorSignalSection("design")).toBeNull();
    expect(getEditorSignalSection("versions")).toBeNull();
    expect(getEditorSignalSection("experience")).toBe("experience");
    expect(getEditorSignalLabel("experience")).toBe("Experience");
  });

  it("only reports save confirmation after a confirmed write", () => {
    expect(
      getEditorSaveMotionState({ confirmed: false, hasChanges: true, saving: false }),
    ).toBe("pending");
    expect(
      getEditorSaveMotionState({ confirmed: false, hasChanges: true, saving: true }),
    ).toBe("saving");
    expect(
      getEditorSaveMotionState({ confirmed: true, hasChanges: true, saving: false }),
    ).toBe("confirmed");
    expect(
      getEditorSaveMotionState({ confirmed: false, hasChanges: false, saving: false }),
    ).toBe("saved");
  });
});
