import { describe, expect, it } from "vitest";
import { normalizeDelimitedList } from "@/lib/delimited-list";

describe("normalizeDelimitedList", () => {
  it("preserves a comma-delimited draft until normalization is requested", () => {
    expect(normalizeDelimitedList("TypeScript, React, Node.js")).toEqual([
      "TypeScript",
      "React",
      "Node.js",
    ]);
  });

  it("removes empty entries without changing meaningful punctuation", () => {
    expect(normalizeDelimitedList("C++, , Node.js, Product-led growth ")).toEqual([
      "C++",
      "Node.js",
      "Product-led growth",
    ]);
  });
});
