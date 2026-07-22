import type { ThemeId } from "../../src/themes/types";

export interface ThemeFrameBaseline {
  hash: string;
  mean: readonly [number, number, number];
}

export type CatalogThemeId = Exclude<
  ThemeId,
  "aurora" | "atlas" | "velvet" | "quarry" | "atelier" | "nocturne"
>;

/**
 * Perceptual fixed-frame signatures for catalog worlds. These intentionally
 * remain tiny: the hash protects composition while the mean protects the
 * renderer's color and light level without committing dozens of PNGs.
 */
export const THEME_FRAME_BASELINES = {
  cosmic: { hash: "0303030703230513", mean: [10, 8, 25] },
  fluid: { hash: "070927234f494b53", mean: [10, 29, 41] },
  ember: { hash: "030101030103030f", mean: [23, 9, 6] },
  monolith: { hash: "0101030101012121", mean: [10, 12, 15] },
  terracotta: { hash: "4541454d2b13070f", mean: [24, 18, 9] },
  prism: { hash: "232367050d491f93", mean: [18, 17, 27] },
  biolume: { hash: "53130b0b0b631b1b", mean: [7, 25, 25] },
  circuit: { hash: "25050b0f05034b47", mean: [5, 15, 14] },
  sakura: { hash: "210d07070f030313", mean: [42, 25, 28] },
  glacier: { hash: "0713159111511313", mean: [11, 20, 32] },
  verdant: { hash: "0101000105010309", mean: [13, 32, 15] },
  neon: { hash: "4381050b4d4f0f49", mean: [28, 11, 38] },
  topo: { hash: "0303030307030303", mean: [10, 25, 20] },
  luxe: { hash: "010100030b010129", mean: [30, 22, 13] },
  dusk: { hash: "070747069d070703", mean: [43, 20, 25] },
  matrix: { hash: "03435503090b23a1", mean: [3, 12, 6] },
  coral: { hash: "0b0b070b0dae179b", mean: [28, 28, 31] },
  stardust: { hash: "0101010101010101", mean: [22, 20, 40] },
  ink: { hash: "a703030705030302", mean: [11, 14, 22] },
  bloom: { hash: "070327070f2f0501", mean: [55, 29, 63] },
  silk: { hash: "2f8b4b8d2d2f259b", mean: [13, 12, 27] },
  tempest: { hash: "0747474707470719", mean: [31, 50, 68] },
  obsidian: { hash: "0307450f1e0f0f07", mean: [34, 12, 4] },
  apex: { hash: "1f1f175756550b2b", mean: [15, 31, 49] },
  forge: { hash: "012d2d2f0f0f0317", mean: [34, 16, 8] },
  vector: { hash: "070f0f0f0f07030b", mean: [9, 17, 33] },
  vault: { hash: "0f2b2b0f8f0f0f0f", mean: [19, 25, 39] },
  opaline: { hash: "274765c54b5b4c87", mean: [22, 25, 41] },
  halo: { hash: "0303020201010101", mean: [16, 10, 12] },
  sonata: { hash: "0f0f0f4fa9694901", mean: [29, 14, 25] },
  mosaic: { hash: "4485d9292b237644", mean: [35, 80, 110] },
  bastion: { hash: "153138a24b51978f", mean: [47, 60, 74] },
  carbon: { hash: "070a470809450a55", mean: [31, 38, 47] },
  caliber: { hash: "07170f0f0f0f0f0b", mean: [8, 13, 23] },
  harbor: { hash: "531d038e03a28f52", mean: [11, 20, 28] },
  relay: { hash: "2111333733813329", mean: [7, 19, 26] },
  meridian: { hash: "032b2b2b2b0b0b0b", mean: [14, 25, 32] },
  porcelain: { hash: "0301030303030105", mean: [46, 56, 66] },
  filigree: { hash: "0101010101010101", mean: [16, 13, 15] },
  cameo: { hash: "030707070706070f", mean: [26, 20, 25] },
  solstice: { hash: "0101010303010303", mean: [77, 36, 27] },
  tulle: { hash: "0101000001020309", mean: [37, 37, 48] },
  parasol: { hash: "0302010306070001", mean: [36, 20, 28] },
  gossamer: { hash: "0101010101010103", mean: [15, 22, 30] },
  citadel: { hash: "41414d494d494949", mean: [17, 21, 30] },
  axiom: { hash: "230347051303039b", mean: [7, 13, 27] },
  helix: { hash: "170f4d0f05858810", mean: [13, 24, 35] },
  jetstream: { hash: "01110201010b0581", mean: [14, 24, 36] },
  echelon: { hash: "0103030101038101", mean: [16, 25, 39] },
  vellum: { hash: "0381010101010313", mean: [31, 29, 31] },
  lustre: { hash: "0100010101040a01", mean: [46, 38, 32] },
  fresco: { hash: "23232a2323032727", mean: [41, 36, 30] },
  rosaline: { hash: "0103030301018101", mean: [49, 25, 39] },
} as const satisfies Record<CatalogThemeId, ThemeFrameBaseline>;
