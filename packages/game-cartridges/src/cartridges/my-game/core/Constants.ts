/** All game constants for SpellLab Potion Master. */

export const GAME = {
  WIDTH: 960,
  HEIGHT: 640,
  BACKGROUND_COLOR: 0x0d0b1a,
  BATCH_SIZE: 5,
  TOTAL_WORDS: 10,
} as const;

export const COLORS = {
  BG_DARK: 0x0d0b1a,
  BG_PANEL: 0x1a1730,
  BG_CARD: 0x221f3a,

  CAULDRON_BODY: 0x3a3355,
  CAULDRON_RIM: 0x5a5080,
  CAULDRON_LIQUID: 0x44ff88,
  CAULDRON_LIQUID_DARK: 0x22aa55,
  CAULDRON_GLOW: 0x44ff88,

  BOTTLE_COLORS: [
    0xff6b9d, 0xff9f43, 0xfeca57, 0x48dbfb, 0xff6b6b,
    0xa29bfe, 0xfd79a8, 0x00cec9, 0xe17055, 0x6c5ce7,
    0x55efc4, 0xfdcb6e, 0xe84393, 0x74b9ff, 0xdfe6e9,
  ] as readonly number[],

  LETTER_ON_BOTTLE: "#ffffff",
  LETTER_CORRECT: "#44ff88",
  LETTER_WRONG: "#ff4444",

  TEXT_PRIMARY: "#f0e6d3",
  TEXT_SECONDARY: "#a89bbo",
  TEXT_ACCENT: "#44ff88",

  STAR_ACTIVE: 0xfeca57,
  STAR_INACTIVE: 0x555555,

  GLOW_GREEN: 0x44ff88,
  GLOW_PURPLE: 0xa29bfe,
} as const;

export const BOTTLE = {
  WIDTH: 60,
  HEIGHT: 80,
  NECK_WIDTH: 24,
  NECK_HEIGHT: 20,
  CORNER_RADIUS: 12,
  LETTER_SIZE: "22px",
  LETTER_FONT: "Georgia, serif",
  SPACING: 20,
} as const;

export const CAULDRON = {
  WIDTH: 200,
  HEIGHT: 160,
  RIM_HEIGHT: 20,
  BUBBLE_COUNT: 5,
  SHAKE_DURATION: 60,
  SHAKE_REPEAT: 5,
  SHAKE_INTENSITY: 12,
} as const;

export const UI = {
  FONT_TITLE: "Georgia, serif",
  FONT_BODY: "Arial, sans-serif",
  FONT_LETTER: "Georgia, serif",
  FONT_SIZE_TITLE: "36px",
  FONT_SIZE_WORD: "32px",
  FONT_SIZE_THAI: "20px",
  FONT_SIZE_BODY: "16px",
  FONT_SIZE_SMALL: "14px",
  PADDING: 16,
} as const;

export const STAR_RATING = {
  THREE_STAR: 0.9,
  TWO_STAR: 0.7,
} as const;

export const STORAGE_KEY = "spelllab-starred-words" as const;
