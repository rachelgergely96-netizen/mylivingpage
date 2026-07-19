import { describe, expect, it } from "vitest";
import { createSeededRandom } from "@/themes/shared/random";

function sample(seed: number, count: number): number[] {
  const random = createSeededRandom(seed);
  return Array.from({ length: count }, () => random());
}

describe("createSeededRandom", () => {
  it("replays the same sequence for the same seed", () => {
    const expected = [
      0.9286734645720571,
      0.75668422318995,
      0.23085723770782351,
      0.46757755149155855,
      0.3456245653796941,
      0.9741333080455661,
      0.6717101514805108,
      0.5425356382038444,
    ];

    expect(sample(0x4d4c5001, expected.length)).toEqual(expected);
    expect(sample(0x4d4c5001, expected.length)).toEqual(expected);
  });

  it("keeps independent generators isolated", () => {
    const first = createSeededRandom(42);
    const second = createSeededRandom(42);

    expect(first()).toBe(second());
    first();
    expect(first()).not.toBe(second());
  });

  it("produces values in Math.random's range", () => {
    expect(sample(20260719, 1_000).every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it("uses the seed to produce a different sequence", () => {
    expect(sample(1, 8)).not.toEqual(sample(2, 8));
  });
});
