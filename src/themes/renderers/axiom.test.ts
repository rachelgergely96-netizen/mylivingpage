import { describe, expect, it } from "vitest";
import {
  AXIOM_STORY_PATH,
  nodeForSection,
  resolveAxiomStoryPosition,
} from "@/themes/renderers/axiom";

const CONNECTED_PATH = [0, 1, 2, 3, 7, 6, 5, 4];
const EDGES = new Set([
  "0-1",
  "1-2",
  "2-3",
  "3-7",
  "6-7",
  "5-6",
  "4-5",
]);

describe("Axiom Living Page path", () => {
  it("maps the resume story onto adjacent graph nodes", () => {
    const sections = [
      "summary",
      "proof",
      "testimonials",
      "experience",
      "projects",
      "education",
      "skills",
      "certifications",
    ];
    const path = sections.map(nodeForSection);

    expect(path).toEqual(CONNECTED_PATH);
    expect(AXIOM_STORY_PATH).toEqual(CONNECTED_PATH);
    for (let index = 1; index < path.length; index += 1) {
      const pair = [path[index - 1], path[index]].sort((a, b) => (a ?? 0) - (b ?? 0));
      expect(EDGES.has(`${pair[0]}-${pair[1]}`)).toBe(true);
    }
  });

  it("does not invent a node for unknown content", () => {
    expect(nodeForSection(null)).toBeNull();
    expect(nodeForSection("unknown")).toBeNull();
  });

  it("moves continuously between adjacent story nodes", () => {
    expect(resolveAxiomStoryPosition(0)).toEqual({
      fromNode: 0,
      toNode: 1,
      segmentProgress: 0,
    });
    expect(resolveAxiomStoryPosition(0.5)).toEqual({
      fromNode: 3,
      toNode: 7,
      segmentProgress: 0.5,
    });
    expect(resolveAxiomStoryPosition(1)).toEqual({
      fromNode: 5,
      toNode: 4,
      segmentProgress: 1,
    });
    expect(resolveAxiomStoryPosition(Number.NaN)).toEqual({
      fromNode: 0,
      toNode: 1,
      segmentProgress: 0,
    });
  });
});
