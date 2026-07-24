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
  terracotta: { hash: "014141492b130504", mean: [23, 17, 9] },
  prism: { hash: "332327050d491f97", mean: [18, 17, 28] },
  biolume: { hash: "53130b0b0b631b1b", mean: [7, 25, 25] },
  circuit: { hash: "25050d0b09014b43", mean: [6, 16, 14] },
  sakura: { hash: "210d07070f030313", mean: [42, 25, 28] },
  glacier: { hash: "0713159111511313", mean: [11, 20, 32] },
  verdant: { hash: "0101000105010309", mean: [13, 32, 15] },
  neon: { hash: "4101450b0d4d0f0f", mean: [28, 12, 38] },
  topo: { hash: "0303030307030303", mean: [10, 25, 20] },
  luxe: { hash: "0000000101010101", mean: [34, 21, 10] },
  dusk: { hash: "0703470699070707", mean: [41, 18, 25] },
  matrix: { hash: "0305010303010305", mean: [3, 12, 6] },
  coral: { hash: "0b0b070b0dae179b", mean: [28, 28, 31] },
  stardust: { hash: "0101010101010101", mean: [22, 20, 40] },
  ink: { hash: "5713450044430303", mean: [10, 13, 20] },
  bloom: { hash: "070327070f2f0501", mean: [55, 29, 63] },
  silk: { hash: "2f8b4b8d2d2f259b", mean: [13, 12, 27] },
  tempest: { hash: "0707474747430b0b", mean: [19, 30, 43] },
  obsidian: { hash: "3327450f1e0f0f07", mean: [36, 13, 6] },
  apex: { hash: "1f1f17575655172b", mean: [14, 30, 47] },
  forge: { hash: "012d2d2f0f0f0317", mean: [34, 16, 8] },
  vector: { hash: "0303030301030303", mean: [6, 13, 27] },
  vault: { hash: "0f2b2b0f8f0f0f0f", mean: [19, 25, 39] },
  opaline: { hash: "274765c54b5b4c87", mean: [22, 25, 41] },
  halo: { hash: "0303020201010101", mean: [16, 10, 12] },
  sonata: { hash: "0f0f0f4fa9694901", mean: [29, 14, 25] },
  mosaic: { hash: "0304020202030706", mean: [12, 20, 30] },
  bastion: { hash: "0101000001030303", mean: [19, 22, 27] },
  carbon: { hash: "070a470809450a55", mean: [31, 38, 47] },
  caliber: { hash: "07170f0f0f0d0f0b", mean: [8, 13, 23] },
  harbor: { hash: "531d038e03a28f52", mean: [11, 20, 28] },
  relay: { hash: "133131353391132b", mean: [7, 19, 26] },
  meridian: { hash: "0103030321010103", mean: [6, 13, 18] },
  porcelain: { hash: "0301030303030105", mean: [46, 56, 66] },
  filigree: { hash: "0001010001010101", mean: [10, 8, 11] },
  cameo: { hash: "030705050504070f", mean: [32, 24, 29] },
  solstice: { hash: "0101010303010303", mean: [77, 36, 27] },
  tulle: { hash: "0101000001020309", mean: [37, 37, 48] },
  parasol: { hash: "0302010306070001", mean: [36, 20, 28] },
  gossamer: { hash: "0101010101030303", mean: [11, 17, 24] },
  citadel: { hash: "014149494d494949", mean: [14, 19, 27] },
  axiom: { hash: "0707470703091323", mean: [6, 10, 22] },
  helix: { hash: "03030101010b0313", mean: [6, 13, 21] },
  jetstream: { hash: "01110201010b0581", mean: [14, 24, 36] },
  echelon: { hash: "0101050101010000", mean: [16, 25, 39] },
  vellum: { hash: "0381810101010313", mean: [32, 29, 32] },
  lustre: { hash: "0100010101040801", mean: [37, 27, 21] },
  fresco: { hash: "2323292323032325", mean: [42, 36, 30] },
  rosaline: { hash: "0103030301018101", mean: [49, 25, 39] },
} as const satisfies Record<CatalogThemeId, ThemeFrameBaseline>;
