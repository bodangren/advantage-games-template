import type { DeckWord } from "../data/words";

/** Number of words featured as active goals in one round. */
export const GOALS_PER_ROUND = 10;

/**
 * Tracks collected letters and the spelling loop against the deck.
 *
 * A word only counts as "met" (cleared) when the player selects it as their
 * active target and the bag then contains every one of its letters. Partially
 * collected words stay uncleared; rotation keeps returning them in later
 * rounds until they are fully spelled. Letters persist in the bag across
 * rounds, so progress never resets.
 */
export class WordAccumulator {
  private bag = new Map<string, number>();
  private cleared: DeckWord[] = [];
  private active: DeckWord[] = [];
  private pool: DeckWord[] = [];
  private lastActive = new Map<string, number>();
  private selection: DeckWord | null = null;
  private round = 0;

  constructor(targets: readonly DeckWord[]) {
    this.pool = targets.slice();
  }

  /**
   * Adds one collected letter. When the selected target's letters are all
   * present, the target is consumed, cleared, and returned.
   */
  add(letter: string): DeckWord | null {
    const key = letter.toUpperCase();
    this.bag.set(key, (this.bag.get(key) ?? 0) + 1);
    return this.tryCompleteSelection();
  }

  /**
   * Completes the current selection when the bag holds every one of its
   * letters. Returns the cleared word, or null while still incomplete.
   */
  tryCompleteSelection(): DeckWord | null {
    const sel = this.selection;
    if (!sel || !containsAll(this.bag, sel.letters)) return null;
    consume(this.bag, sel.letters);
    this.clearWord(sel);
    return sel;
  }

  /** Removes a cleared word from rotation entirely and unselects it. */
  private clearWord(word: DeckWord): void {
    this.active = this.active.filter((w) => w !== word);
    this.pool = this.pool.filter((w) => w !== word);
    this.cleared.push(word);
    this.selection = null;
  }

  /** Selects an active goal as the target the player is spelling. */
  select(text: string): boolean {
    const word = this.active.find((w) => w.text === text.toUpperCase());
    if (!word) return false;
    this.selection = word;
    return true;
  }

  /** Drops the current target selection without affecting collected letters. */
  clearSelection(): void {
    this.selection = null;
  }

  /**
   * Starts a new round of active goals. Words the player has already collected
   * letters for always return (they are not cleared yet); remaining slots fill
   * with uncleared words that have been featured the longest ago, so every
   * word eventually cycles in.
   */
  rotate(): void {
    this.round++;
    this.selection = null;
    const candidates = [...this.active, ...this.pool];
    const working = candidates.filter((w) => this.collectedFor(w) > 0);
    const next: DeckWord[] = [];
    const addIfSpace = (w: DeckWord): void => {
      if (next.length >= GOALS_PER_ROUND || next.indexOf(w) >= 0) return;
      next.push(w);
    };
    for (const w of working) addIfSpace(w);
    const rest = candidates
      .filter((w) => working.indexOf(w) < 0)
      .sort((a, b) => (this.lastActive.get(a.text) ?? -1) - (this.lastActive.get(b.text) ?? -1));
    for (const w of rest) addIfSpace(w);
    for (const w of next) this.lastActive.set(w.text, this.round);
    this.active = next;
    this.pool = candidates.filter((w) => next.indexOf(w) < 0);
  }

  /** The active goal words of the current round. */
  goals(): readonly DeckWord[] {
    return this.active;
  }

  /** Words fully spelled and cleared this run, in order. */
  clearedWords(): readonly DeckWord[] {
    return this.cleared;
  }

  /** Number of fully spelled words. */
  get wordsCompleted(): number {
    return this.cleared.length;
  }

  /** The word the player is currently targeting, if any. */
  get selected(): DeckWord | null {
    return this.selection;
  }

  /** How many of the word's letters are currently present in the bag. */
  collectedFor(word: DeckWord): number {
    const counts = new Map<string, number>();
    for (const l of word.letters) counts.set(l, (counts.get(l) ?? 0) + 1);
    let total = 0;
    for (const [l, n] of counts) {
      total += Math.min(n, this.bag.get(l) ?? 0);
    }
    return total;
  }

  /** Fraction (0..1) of the word's letters already collected. */
  progressFor(word: DeckWord): number {
    return word.letters.length === 0 ? 0 : this.collectedFor(word) / word.letters.length;
  }
}

/** True when every letter of `needed` is available in the multiset `bag`. */
function containsAll(bag: Map<string, number>, needed: readonly string[]): boolean {
  const counts = new Map<string, number>();
  for (const l of needed) counts.set(l, (counts.get(l) ?? 0) + 1);
  for (const [l, n] of counts) {
    if ((bag.get(l) ?? 0) < n) return false;
  }
  return true;
}

/** Removes one occurrence of each needed letter from the multiset. */
function consume(bag: Map<string, number>, needed: readonly string[]): void {
  const counts = new Map<string, number>();
  for (const l of needed) counts.set(l, (counts.get(l) ?? 0) + 1);
  for (const [l, n] of counts) {
    const have = bag.get(l) ?? 0;
    const next = Math.max(0, have - n);
    if (next === 0) bag.delete(l);
    else bag.set(l, next);
  }
}
