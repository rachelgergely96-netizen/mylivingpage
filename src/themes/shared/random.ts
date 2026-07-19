export type RandomSource = () => number;

/**
 * Creates a small deterministic pseudo-random number generator.
 *
 * The returned values are in the same [0, 1) range as Math.random(), which
 * makes it suitable as a drop-in source for visual effects. Each generator
 * owns its state, so renderers do not affect one another through call order.
 */
export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
