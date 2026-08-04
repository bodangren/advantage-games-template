import type { DeckWord } from "../data/words";

/** A seeded random generator usable by every deterministic system. */
export type Rng = () => number;

/** Creates a deterministic PRNG from a seed string. */
export function seededRng(seed = "gem-miner"): Rng {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  };
}

/** Weighted random letter draw biased toward the letters of the target deck. */
export class LetterBag {
  private weights = new Map<string, number>();
  private pool: string[] = [];
  private rng: Rng;

  constructor(deck: readonly DeckWord[], rng: Rng = seededRng()) {
    this.rng = rng;
    for (const word of deck) {
      for (const letter of word.letters) {
        this.weights.set(letter, (this.weights.get(letter) ?? 0) + 1);
      }
    }
    for (const [letter, weight] of this.weights) {
      for (let i = 0; i < weight; i++) this.pool.push(letter);
    }
    if (this.pool.length === 0) this.pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  }

  /** Draws one letter, weighted toward the letters of the target deck. */
  draw(): string {
    if (this.pool.length === 1) return this.pool[0];
    const idx = Math.floor(this.rng() * this.pool.length);
    return this.pool[Math.min(idx, this.pool.length - 1)];
  }

  /** Number of letter types tracked by the bag (for balance/display). */
  get size(): number {
    return this.weights.size;
  }
}