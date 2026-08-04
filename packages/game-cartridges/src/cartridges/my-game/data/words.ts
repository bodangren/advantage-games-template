import type { VocabularyItem } from "@reading-advantage/game-contracts";
import type { Rng } from "../systems/LetterBag";

/** Difficulty tiers for a deck word. */
export type WordDifficulty = "easy" | "hard";
/** A single spelling deck entry derived from the contract input or a fallback. */
export interface DeckWord {
  text: string;
  thai: string;
  difficulty: WordDifficulty;
  letters: string[];
  fromInput: boolean;
}

/** Number of easy (4-letter) words required in the final deck. */
export const EASY_COUNT = 10;
/** Number of hard (5-letter) words required in the final deck. */
export const HARD_COUNT = 10;
/** Fallback easy 4-letter vocabulary (mining theme). */
const FALLBACK_EASY: readonly { text: string; thai: string }[] = [
  { text: "GOLD", thai: "ทองคำ" },
  { text: "MINE", thai: "เหมือง" },
  { text: "ROCK", thai: "หิน" },
  { text: "SAND", thai: "ทราย" },
  { text: "DUST", thai: "ฝุ่น" },
  { text: "IRON", thai: "เหล็ก" },
  { text: "DEEP", thai: "ลึก" },
  { text: "CAVE", thai: "ถ้ำ" },
  { text: "CORE", thai: "แกนกลาง" },
  { text: "FUEL", thai: "เชื้อเพลิง" },
];
/** Fallback hard 5-letter vocabulary (mining theme). */
const FALLBACK_HARD: readonly { text: string; thai: string }[] = [
  { text: "MINER", thai: "นักขุด" },
  { text: "LIGHT", thai: "แสง" },
  { text: "SPARK", thai: "ประกายไฟ" },
  { text: "SHINE", thai: "ส่องแสง" },
  { text: "GLOBE", thai: "ลูกโลก" },
  { text: "STONE", thai: "หิน" },
  { text: "MAGMA", thai: "หินหนืด" },
  { text: "PRISM", thai: "ปริซึม" },
  { text: "STEAM", thai: "ไอน้ำ" },
  { text: "FLAME", thai: "เปลวไฟ" },
];

/** Classifies a candidate english term into a difficulty tier by its letter count. */
export function tierForLength(len: number): WordDifficulty {
  return len >= 5 ? "hard" : "easy";
}

/** Upper-cases and keeps only A-Z letters so a term is useful as spellable letters. */
export function sanitizeTerm(term: string): string {
  return term.toUpperCase().replace(/[^A-Z]/g, "");
}

/**
 * Builds the deck of up to 20 target words, preferring `context.input` terms and
 * filling any shortfall from the built-in fallback deck. Easy tier is words of
 * 4 letters; hard tier is words of 5 or more letters, capping hard at 5-letter
 * vocabulary by construction of the fallback.
 */
export function buildDeck(input: readonly VocabularyItem[]): DeckWord[] {
  const easyCands = new Map<string, VocabularyItem>();
  const hardCands = new Map<string, VocabularyItem>();
  for (const item of input) {
    const text = sanitizeTerm(item.term);
    if (text.length === 0) continue;
    const tier = tierForLength(text.length);
    const map = tier === "easy" ? easyCands : hardCands;
    if (!map.has(text)) map.set(text, item);
  }
  const fill = (tier: WordDifficulty, fallback: readonly { text: string; thai: string }[], used: Map<string, VocabularyItem>): DeckWord[] => {
    const out: DeckWord[] = [];
    for (const item of used.values()) {
      const text = sanitizeTerm(item.term);
      out.push({ text, thai: item.translation, difficulty: tier, letters: text.split(""), fromInput: true });
    }
    for (const fb of fallback) {
      if (out.length >= (tier === "easy" ? EASY_COUNT : HARD_COUNT)) break;
      if (used.has(fb.text)) continue;
      if (out.some((w) => w.text === fb.text)) continue;
      const text = fb.text;
      out.push({ text, thai: fb.thai, difficulty: tier, letters: text.split(""), fromInput: false });
    }
    return out.slice(0, tier === "easy" ? EASY_COUNT : HARD_COUNT);
  };
  const easy = fill("easy", FALLBACK_EASY, easyCands);
  const hard = fill("hard", FALLBACK_HARD, hardCands);
  // Interleave so the player mixes easy and hard difficulty while collecting.
  const deck: DeckWord[] = [];
  const len = Math.max(easy.length, hard.length);
  for (let i = 0; i < len; i++) {
    if (easy[i]) deck.push(easy[i]);
    if (hard[i]) deck.push(hard[i]);
  }
  return deck;
}

/** Fisher-Yates shuffle of a copy using the given rng. */
function shuffle<T>(input: readonly T[], rng: Rng): T[] {
  const out = input.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * Samples a fresh session deck of 10 words from the full pool: 5 easy plus 5
 * hard words, shuffled and interleaved so difficulty mixes. Falls back to any
 * available words of a tier when the pool is too small.
 */
export function sampleSessionDeck(pool: readonly DeckWord[], rng: Rng): DeckWord[] {
  const easy = shuffle(
    pool.filter((w) => w.difficulty === "easy").map((w) => w),
    rng
  ).slice(0, EASY_COUNT / 2);
  const hard = shuffle(
    pool.filter((w) => w.difficulty === "hard").map((w) => w),
    rng
  ).slice(0, HARD_COUNT / 2);
  const deck: DeckWord[] = [];
  const len = Math.max(easy.length, hard.length);
  for (let i = 0; i < len; i++) {
    if (easy[i]) deck.push(easy[i]);
    if (hard[i]) deck.push(hard[i]);
  }
  return deck.slice(0, EASY_COUNT / 2 + HARD_COUNT / 2);
}