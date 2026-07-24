import { describe, expect, it } from "vitest";
import { wrapSoft } from "./wrap";

describe("wrapSoft", () => {
  it("wraps values into [0, period) including negatives", () => {
    expect(wrapSoft(1.25, 1).u).toBeCloseTo(0.25);
    expect(wrapSoft(-0.25, 1).u).toBeCloseTo(0.75);
    expect(wrapSoft(340, 100).u).toBeCloseTo(40);
  });

  it("is fully visible in the interior and fades to zero at the seam", () => {
    expect(wrapSoft(0.5, 1).alpha).toBe(1);
    expect(wrapSoft(0, 1).alpha).toBe(0);
    expect(wrapSoft(1, 1).alpha).toBe(0);
    const inMargin = wrapSoft(0.04, 1, 0.08).alpha;
    expect(inMargin).toBeGreaterThan(0);
    expect(inMargin).toBeLessThan(1);
  });

  it("fades symmetrically on both sides of the seam", () => {
    const left = wrapSoft(0.03, 1, 0.08).alpha;
    const right = wrapSoft(0.97, 1, 0.08).alpha;
    expect(left).toBeCloseTo(right);
  });

  it("is continuous across the seam crossing", () => {
    const before = wrapSoft(0.999, 1, 0.08).alpha;
    const after = wrapSoft(1.001, 1, 0.08).alpha;
    expect(Math.abs(before - after)).toBeLessThan(0.1);
  });

  it("tolerates degenerate inputs", () => {
    expect(wrapSoft(Number.NaN, 1).u).toBe(0);
    expect(wrapSoft(0.5, 0).u).toBeCloseTo(0.5);
    expect(wrapSoft(0.5, Number.NaN).u).toBeCloseTo(0.5);
    expect(wrapSoft(0.5, 1, 0).alpha).toBe(1);
  });
});
