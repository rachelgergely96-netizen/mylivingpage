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
  cosmic: { hash: "0303030713230513", mean: [10, 8, 25] },
  fluid: { hash: "070927234f494b53", mean: [10, 29, 40] },
  ember: { hash: "030105070103030b", mean: [23, 9, 6] },
  monolith: { hash: "0101030101012121", mean: [10, 12, 15] },
  terracotta: { hash: "0141454d2b13070f", mean: [24, 18, 9] },
  prism: { hash: "236367050d491b97", mean: [18, 17, 27] },
  biolume: { hash: "53130b0a0b631b1b", mean: [7, 25, 24] },
  circuit: { hash: "21050f0f01034b47", mean: [5, 15, 14] },
  sakura: { hash: "210d07070d030317", mean: [41, 25, 27] },
  glacier: { hash: "0713159311511113", mean: [11, 21, 32] },
  verdant: { hash: "0101000105010309", mean: [13, 32, 15] },
  neon: { hash: "4301050b8f0f0f4a", mean: [28, 11, 37] },
  topo: { hash: "0303030307030303", mean: [10, 25, 20] },
  luxe: { hash: "0101000103010129", mean: [29, 22, 13] },
  dusk: { hash: "070747069d070603", mean: [42, 19, 25] },
  matrix: { hash: "12435303094b23a1", mean: [4, 12, 6] },
  coral: { hash: "0b0b070b0dae179b", mean: [28, 28, 31] },
  stardust: { hash: "0101010101010101", mean: [22, 20, 40] },
  ink: { hash: "a707030307030302", mean: [11, 14, 22] },
  bloom: { hash: "070327070f2f0501", mean: [53, 28, 61] },
  silk: { hash: "2f8b4b8d2d2f259b", mean: [13, 12, 27] },
  tempest: { hash: "0747474707470319", mean: [30, 49, 66] },
  obsidian: { hash: "0307450f1e0f0f07", mean: [34, 12, 5] },
  apex: { hash: "1f1f175756550b2b", mean: [15, 30, 47] },
  forge: { hash: "012d2d2f0f0f0317", mean: [33, 16, 8] },
  vector: { hash: "070f0f0f0f07070b", mean: [9, 17, 33] },
  vault: { hash: "0f2b2b0f8f0f0f0f", mean: [18, 24, 38] },
  opaline: { hash: "254545c54b5b4c87", mean: [22, 24, 40] },
  halo: { hash: "0303020201010101", mean: [16, 10, 12] },
  sonata: { hash: "0f0f0f4fa9696901", mean: [28, 14, 25] },
  mosaic: { hash: "c485d9292b237644", mean: [35, 78, 106] },
  bastion: { hash: "15313aa24b51978f", mean: [46, 59, 72] },
  carbon: { hash: "070a470809450b55", mean: [31, 38, 47] },
  caliber: { hash: "07170f0f0f0f0f0b", mean: [8, 13, 23] },
  harbor: { hash: "531b038e03a28f52", mean: [11, 20, 27] },
  relay: { hash: "2131333733813329", mean: [7, 19, 25] },
  meridian: { hash: "032b2b2b2b0b0b0b", mean: [13, 24, 31] },
  porcelain: { hash: "0301030303030105", mean: [45, 54, 65] },
  filigree: { hash: "0101010101010101", mean: [16, 13, 15] },
  cameo: { hash: "030707070706070f", mean: [26, 20, 25] },
  solstice: { hash: "0301010303010303", mean: [75, 36, 27] },
  tulle: { hash: "0101000001020309", mean: [37, 37, 47] },
  parasol: { hash: "0302010306070001", mean: [35, 20, 28] },
  gossamer: { hash: "0101010101010103", mean: [15, 22, 30] },
  citadel: { hash: "41414d4d4d494949", mean: [16, 21, 30] },
  axiom: { hash: "231343030303039b", mean: [7, 13, 26] },
  helix: { hash: "170f4d0f0d858808", mean: [13, 24, 34] },
  jetstream: { hash: "01110301010b0581", mean: [14, 24, 36] },
  echelon: { hash: "0103030101038101", mean: [16, 25, 39] },
  vellum: { hash: "0381010101010313", mean: [31, 28, 31] },
  lustre: { hash: "0100010101040801", mean: [45, 37, 31] },
  fresco: { hash: "23232a2323032727", mean: [41, 35, 29] },
  rosaline: { hash: "0143030301018101", mean: [47, 25, 38] },
} as const satisfies Record<CatalogThemeId, ThemeFrameBaseline>;
