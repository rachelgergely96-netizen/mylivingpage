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
  terracotta: { hash: "014141492b13244c", mean: [22, 17, 9] },
  prism: { hash: "236367050d491b93", mean: [18, 17, 27] },
  biolume: { hash: "53130b0a0b631b1b", mean: [7, 25, 24] },
  circuit: { hash: "21050f0f01034b43", mean: [5, 15, 14] },
  sakura: { hash: "210507070d030313", mean: [41, 25, 27] },
  glacier: { hash: "0713159311511313", mean: [11, 21, 32] },
  verdant: { hash: "0101000105010309", mean: [12, 32, 15] },
  neon: { hash: "4301050b8f0d0f4a", mean: [28, 11, 37] },
  topo: { hash: "0303030707030202", mean: [11, 25, 20] },
  luxe: { hash: "0000000101010101", mean: [32, 20, 10] },
  dusk: { hash: "070347069d070603", mean: [40, 18, 25] },
  matrix: { hash: "0305010303010305", mean: [3, 12, 6] },
  coral: { hash: "0b0b070b0dae179b", mean: [28, 28, 31] },
  stardust: { hash: "0101010101010101", mean: [22, 20, 40] },
  ink: { hash: "5313050244030303", mean: [10, 13, 20] },
  bloom: { hash: "070327070f2f0501", mean: [53, 28, 61] },
  silk: { hash: "2f8b4b8d2d2f259b", mean: [13, 13, 27] },
  tempest: { hash: "4707474703070309", mean: [18, 29, 41] },
  obsidian: { hash: "3337450f1e0f0f07", mean: [35, 13, 6] },
  apex: { hash: "1f1f175756551729", mean: [14, 29, 45] },
  forge: { hash: "012d2d2f0f0f0317", mean: [33, 16, 8] },
  vector: { hash: "0303030301030303", mean: [6, 13, 27] },
  vault: { hash: "0f2b2b0f8f0f0f0f", mean: [18, 24, 38] },
  opaline: { hash: "274545c54b5b4c87", mean: [22, 24, 40] },
  halo: { hash: "0303020201010111", mean: [16, 10, 12] },
  sonata: { hash: "0f0f0f4fa9696901", mean: [28, 14, 25] },
  mosaic: { hash: "0304020202030706", mean: [12, 20, 30] },
  bastion: { hash: "0101000201030303", mean: [19, 22, 26] },
  carbon: { hash: "0509490909410a55", mean: [31, 38, 46] },
  caliber: { hash: "07170f0f0f0d0b0b", mean: [8, 12, 22] },
  harbor: { hash: "531b038e03a28f52", mean: [11, 20, 27] },
  relay: { hash: "2131313733911329", mean: [7, 19, 25] },
  meridian: { hash: "0103030301010103", mean: [6, 12, 18] },
  porcelain: { hash: "0301030303030105", mean: [45, 54, 65] },
  filigree: { hash: "0000010001010101", mean: [9, 8, 11] },
  cameo: { hash: "0307050505040f0f", mean: [31, 23, 28] },
  solstice: { hash: "0101010303010303", mean: [75, 36, 27] },
  tulle: { hash: "0101000001010309", mean: [37, 37, 47] },
  parasol: { hash: "0302010306070001", mean: [35, 20, 27] },
  gossamer: { hash: "0101010109030311", mean: [11, 16, 23] },
  citadel: { hash: "0341494d4d494949", mean: [14, 18, 26] },
  axiom: { hash: "a7054703070923a1", mean: [6, 10, 22] },
  helix: { hash: "03030101010b0313", mean: [6, 12, 20] },
  jetstream: { hash: "01090301010b0581", mean: [15, 25, 36] },
  echelon: { hash: "0101050101018100", mean: [16, 24, 38] },
  vellum: { hash: "8381010101010313", mean: [31, 28, 31] },
  lustre: { hash: "0100010001040801", mean: [35, 26, 20] },
  fresco: { hash: "23232b2323032325", mean: [41, 35, 30] },
  rosaline: { hash: "0141030101038101", mean: [47, 25, 38] },
} as const satisfies Record<CatalogThemeId, ThemeFrameBaseline>;
