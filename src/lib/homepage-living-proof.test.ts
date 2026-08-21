import { describe, expect, it } from "vitest";
import {
  buildLivingProofProjection,
  createLivingProofState,
  createLivingProofStateFromText,
  editLivingProofAchievement,
  LIVING_PROOF_ACHIEVEMENT_MAX,
  LIVING_PROOF_SAMPLES,
} from "@/lib/homepage-living-proof";

describe("homepage Living Proof", () => {
  it("offers exactly two distinct synthetic starting points", () => {
    expect(LIVING_PROOF_SAMPLES).toHaveLength(2);
    expect(new Set(LIVING_PROOF_SAMPLES.map((sample) => sample.id)).size).toBe(2);

    for (const sample of LIVING_PROOF_SAMPLES) {
      expect(sample.resume.name).toBeTruthy();
      expect(sample.achievement).toBe(sample.sourceLine);
      expect(sample.resume.email).toMatch(/\.invalid$/);
    }
  });

  it("projects one exact source-backed achievement into every view", () => {
    const state = createLivingProofState(LIVING_PROOF_SAMPLES[0]);
    const projection = buildLivingProofProjection(state);

    expect(projection.achievement).toBe(state.achievement);
    expect(projection.name).toBe(state.name);
    expect(projection.role).toBe(state.role);
    expect(projection.skills.length).toBeGreaterThan(0);
  });

  it("preserves the original source line after a local edit", () => {
    const state = createLivingProofState(LIVING_PROOF_SAMPLES[1]);
    const edited = editLivingProofAchievement(
      state,
      "Improved completion 41% without adding steps.",
    );

    expect(edited.achievement).toBe(
      "Improved completion 41% without adding steps.",
    );
    expect(edited.sourceLine).toBe(state.sourceLine);
    expect(edited.edited).toBe(true);
    expect(edited.name).toBe(state.name);
  });

  it("keeps an edited lead line exact within the share-card headline limit", () => {
    const longValue = "A".repeat(LIVING_PROOF_ACHIEVEMENT_MAX + 20);
    const edited = editLivingProofAchievement(
      createLivingProofState(LIVING_PROOF_SAMPLES[0]),
      longValue,
    );
    const projection = buildLivingProofProjection(edited);

    expect(edited.achievement).toHaveLength(LIVING_PROOF_ACHIEVEMENT_MAX);
    expect(projection.achievement).toBe(edited.achievement);
  });

  it("builds a pasted preview from source text without inventing facts", () => {
    const result = createLivingProofStateFromText(`Jordan Rivera
Operations Manager
Boston, MA

EXPERIENCE
Operations Manager | Example Systems | 2021 - Present
- Reduced fulfillment errors 32% by redesigning the review workflow.

SKILLS
Operations, Process design, SQL`);

    expect(result.issue).toBeNull();
    expect(result.state).not.toBeNull();
    expect(result.state?.achievement).toBe(
      "Reduced fulfillment errors 32% by redesigning the review workflow.",
    );
    expect(result.state?.sourceLine).toBe(
      "Reduced fulfillment errors 32% by redesigning the review workflow.",
    );
    expect(result.state?.sourceKind).toBe("paste");
  });

  it("returns a review state for sparse text instead of recycling a sample", () => {
    const result = createLivingProofStateFromText(
      "Jordan Rivera\nOperations professional looking for a new role.",
    );

    expect(result.state).toBeNull();
    expect(result.issue).toContain("name and one clear result");
  });

  it("rejects an overlong imported result instead of silently truncating it", () => {
    const longResult = `- ${"Improved a source-backed result ".repeat(4)}`;
    const result = createLivingProofStateFromText(
      `Jordan Rivera\nOperations Manager\n\nEXPERIENCE\nOperations Manager | Example Systems | 2021 - Present\n${longResult}`,
    );

    expect(result.state).toBeNull();
    expect(result.issue).toContain(
      `${LIVING_PROOF_ACHIEVEMENT_MAX} characters or fewer`,
    );
  });
});
