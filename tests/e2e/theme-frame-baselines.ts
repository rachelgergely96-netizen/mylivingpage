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
  cosmic: { hash: "0301030703230303", mean: [11, 9, 28] },
  fluid: { hash: "030505070503030d", mean: [6, 17, 27] },
  ember: { hash: "030101030503030f", mean: [21, 9, 6] },
  monolith: { hash: "0301030103030103", mean: [9, 11, 13] },
  terracotta: { hash: "4141414b4b13170f", mean: [21, 16, 9] },
  prism: { hash: "01010b0b090b0303", mean: [11, 11, 18] },
  biolume: { hash: "1353010909614bc3", mean: [5, 18, 17] },
  circuit: { hash: "02030101010b0303", mean: [6, 13, 12] },
  sakura: { hash: "27070d0f0103030b", mean: [38, 29, 29] },
  glacier: { hash: "03030703030b230b", mean: [7, 13, 22] },
  verdant: { hash: "0101010105070303", mean: [9, 22, 11] },
  neon: { hash: "030b0b0707030303", mean: [14, 7, 20] },
  topo: { hash: "0303030103030303", mean: [7, 18, 14] },
  luxe: { hash: "0101010203010303", mean: [28, 21, 12] },
  dusk: { hash: "0321312109030181", mean: [18, 10, 19] },
  matrix: { hash: "03050309011b0320", mean: [3, 11, 6] },
  coral: { hash: "0327014183030301", mean: [8, 12, 15] },
  stardust: { hash: "0103010103010303", mean: [19, 16, 39] },
  ink: { hash: "a303030303030302", mean: [10, 12, 19] },
  bloom: { hash: "0307070707070307", mean: [12, 6, 19] },
  silk: { hash: "032b070f87ab1307", mean: [10, 9, 20] },
  tempest: { hash: "4f09898941030323", mean: [9, 12, 17] },
  obsidian: { hash: "0141010125238383", mean: [5, 2, 1] },
  apex: { hash: "0f0f534baf694b0b", mean: [13, 24, 40] },
  forge: { hash: "03010d4d8d4f4f09", mean: [16, 7, 5] },
  vector: { hash: "0305510b0b0b0301", mean: [8, 17, 33] },
  vault: { hash: "0d0d4b09890b4b09", mean: [12, 16, 22] },
  opaline: { hash: "53c101098bd24303", mean: [17, 22, 37] },
  halo: { hash: "030106060303031b", mean: [16, 10, 18] },
  sonata: { hash: "0301012321434301", mean: [18, 8, 17] },
  mosaic: { hash: "44c7d9a92b237444", mean: [33, 71, 95] },
  bastion: { hash: "f472c2ad89d193c9", mean: [37, 47, 58] },
  carbon: { hash: "06070d0713061704", mean: [16, 20, 24] },
  caliber: { hash: "8101550181434301", mean: [8, 13, 23] },
  harbor: { hash: "07071d4129cb3323", mean: [10, 20, 29] },
  relay: { hash: "8301014105412101", mean: [8, 19, 27] },
  meridian: { hash: "8109090901494b01", mean: [10, 18, 27] },
  porcelain: { hash: "0301030303010103", mean: [44, 53, 63] },
  filigree: { hash: "0303010103030307", mean: [11, 11, 17] },
  cameo: { hash: "0303010303010303", mean: [39, 28, 35] },
  solstice: { hash: "0301010101030301", mean: [47, 24, 23] },
  tulle: { hash: "0101010101010101", mean: [26, 28, 38] },
  parasol: { hash: "0306000107090101", mean: [37, 19, 26] },
  gossamer: { hash: "0101010103070307", mean: [10, 16, 23] },
  citadel: { hash: "0341151717171f1f", mean: [19, 22, 29] },
  axiom: { hash: "87030703070f071f", mean: [8, 17, 26] },
  helix: { hash: "970109031557430b", mean: [18, 25, 34] },
  jetstream: { hash: "0101010101030303", mean: [11, 25, 37] },
  echelon: { hash: "0103030101030307", mean: [14, 21, 30] },
  vellum: { hash: "0101010101010101", mean: [35, 33, 36] },
  lustre: { hash: "0200010109010800", mean: [19, 15, 14] },
  fresco: { hash: "0103030103020301", mean: [31, 25, 19] },
  rosaline: { hash: "0301030103030101", mean: [35, 17, 29] },
} as const satisfies Record<CatalogThemeId, ThemeFrameBaseline>;
