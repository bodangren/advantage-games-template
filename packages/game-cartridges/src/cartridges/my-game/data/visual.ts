import type { WordDifficulty } from "../data/words";

/** Palette for the mine-shaft floor (code-generated visuals), keyed by depth. */
export const MINE_ROCK: Record<number, { rock: number; dug: number; border: number; speck: number; ore: number }> = {
  0: { rock: 0x6b7280, dug: 0x3f4650, border: 0x2f343c, speck: 0x8b93a1, ore: 0xb87333 }, // Shallow weathered stone + copper
  1: { rock: 0x52545c, dug: 0x30333a, border: 0x22252b, speck: 0x6f7279, ore: 0xc8b08a }, // Middle gray stone + iron
  2: { rock: 0x383a40, dug: 0x1e2024, border: 0x15171a, speck: 0x4c4f57, ore: 0xffbf00 }, // Deep dark stone + gold
};

/** Warm glow color drawn inside freshly dug cells (lantern-lit hole). */
export const DUG_LIGHT = 0xffb34d;
/** Wooden support beam color. */
export const WOOD = 0x6b4a2f;
/** Darker wood edge for beams. */
export const WOOD_DARK = 0x4a3320;
/** Lantern body / metal color. */
export const LANTERN = 0x9a5b22;
/** Warm lantern glass glow. */
export const LANTERN_GLOW = 0xffa54d;
/** Near-black cave background behind the mine. */
export const CAVE_BG = 0x04050a;
/** Dark slate background for menu/result screens (readable white text). */
export const MENU_BG = 0x0f1524;

/** Easy-word letter visual: small and lime green. */
export const EASY_LETTER_COLOR = 0xa3ff4d;
/** Hard-word letter visual: larger and amber gold. */
export const HARD_LETTER_COLOR = 0xffbf00;
/** Gem highlight (darker corner) used on both gem sizes. */
export const GEM_SHADE = 0x000000;

/** Pixel-permissive HTML font family string. */
export const FONT = "system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Rendering detail for a gem tile. */
export interface LetterVisual {
  color: number;
  fontSize: number;
  pct: number;
}

/** Gem visual differs by difficulty; hard gems are always larger. */
export function letterVisual(difficulty: WordDifficulty): LetterVisual {
  return difficulty === "hard"
    ? { color: HARD_LETTER_COLOR, fontSize: 1, pct: 0.5 }
    : { color: EASY_LETTER_COLOR, fontSize: 0.8, pct: 0.4 };
}

/** Chibi Skeleton Miner palette (Terraria-inspired, code-drawn). */
export const SKELETON = {
  bone: 0xe8e6e0,
  boneShade: 0xb8b4ac,
  boneDark: 0x8a867e,
  outline: 0x2a2723,
  helmet: 0xff7b3a, // dusty orange miner helmet
  helmetDark: 0xc24f16,
  headlamp: 0xfff3a8,
  scarf: 0x7bc47f, // miner bandana
  pickHead: 0x9aa7b8,
  pickHeadShade: 0x6c7688,
  pickHandle: 0xb97a3d,
  pickHandleShade: 0x7d4e20,
  glove: 0xd8d2c6,
};

/** Chibi proportions (head radius relative to body). */
export const CHIBI = {
  headRadius: 0.42, // fraction of total height
  bodyRadius: 0.26,
  armLength: 0.5,
  legLength: 0.42,
  totalHeight: 1, // unit used by callers scaled by cell
};
