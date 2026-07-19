import { describe, expect, it } from "vitest";
import { nodeForSection } from "@/themes/renderers/axiom";

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
    for (let index = 1; index < path.length; index += 1) {
      const pair = [path[index - 1], path[index]].sort((a, b) => (a ?? 0) - (b ?? 0));
      expect(EDGES.has(`${pair[0]}-${pair[1]}`)).toBe(true);
    }
  });

  it("does not invent a node for unknown content", () => {
    expect(nodeForSection(null)).toBeNull();
    expect(nodeForSection("unknown")).toBeNull();
  });
});
