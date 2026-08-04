import type { GameResults } from "@reading-advantage/game-contracts";
import type { DeckWord, WordDifficulty } from "../data/words";
import { WordAccumulator, GOALS_PER_ROUND } from "./WordAccumulator";

/** Total health the miner starts with. */
export const MAX_HEALTH = 15;
/** Brief immunity after being hit by a laser. */
export const HIT_INVULNERABILITY_MS = 1000;
/** Extended immunity after completing a word (lasers pass through freely). */
export const WORD_INVULNERABILITY_MS = 10000;
/** Number of completed words required to win. */
export const WIN_GOAL = 10;
/** Score awarded per easy word completed. */
export const EASY_SCORE = 100;
/** Score awarded per hard word completed. */
export const HARD_SCORE = 200;
/** Number of active goal words shown at once (re-exposed for the scenes). */
export { GOALS_PER_ROUND };

/** Full deterministic session state for the gem-miner spelling game. */
export class GameState {
  health = MAX_HEALTH;
  score = 0;
  round = 0;
  completed: DeckWord[] = [];
  totalLetters = 0;
  correctLetters = 0;
  startedAt = 0;
  private accumulator: WordAccumulator;
  private hitInvulnUntil = -1;
  private wordInvulnUntil = -1;

  constructor(targets: readonly DeckWord[]) {
    this.accumulator = new WordAccumulator(targets);
  }

  /** Starts the first goal round and returns the active goal list. */
  startFirstRound(): readonly DeckWord[] {
    this.accumulator.rotate();
    return this.accumulator.goals();
  }

  /** Rotates the active goals into a new round (no time limit). */
  rotateGoals(): readonly DeckWord[] {
    this.round++;
    this.accumulator.rotate();
    return this.accumulator.goals();
  }

  /** Adds a collected letter, updating counters and returning any completed word. */
  collectLetter(letter: string, now: number): DeckWord | null {
    this.totalLetters++;
    const completed = this.accumulator.add(letter);
    return this.applyCompletion(completed, now);
  }

  /**
   * Completes the currently selected goal if its letters are all present in the
   * bag (covers instantly-finishing a word the player had half-collected).
   */
  completeSelected(now: number): DeckWord | null {
    const completed = this.accumulator.tryCompleteSelection();
    return this.applyCompletion(completed, now);
  }

  private applyCompletion(completed: DeckWord | null, now: number): DeckWord | null {
    if (completed) {
      this.completed.push(completed);
      this.correctLetters += completed.letters.length;
      this.score += scoreFor(completed.difficulty);
      this.wordInvulnUntil = now + WORD_INVULNERABILITY_MS;
      return completed;
    }
    return null;
  }

  /** Selects a goal word as the player's active spelling target. */
  selectWord(text: string): boolean {
    return this.accumulator.select(text);
  }

  /** The word the player is currently targeting, or null. */
  selectedWord(): DeckWord | null {
    return this.accumulator.selected;
  }

  /** The active goal words of the current round. */
  goals(): readonly DeckWord[] {
    return this.accumulator.goals();
  }

  /** How many of a goal word's letters are collected (for progress display). */
  progressFor(word: DeckWord): number {
    return this.accumulator.progressFor(word);
  }

  /** Number of the word's letters currently present in the collected bag. */
  collectedFor(word: DeckWord): number {
    return this.accumulator.collectedFor(word);
  }

  /** Applies a laser hit at `now`, respecting invulnerability. Returns true when HP changed. */
  takeHit(now: number): boolean {
    if (this.isInvulnerable(now) || this.isOver()) return false;
    this.health = Math.max(0, this.health - 1);
    this.hitInvulnUntil = now + HIT_INVULNERABILITY_MS;
    return true;
  }

  /** True while the miner is immune to lasers. */
  isInvulnerable(now: number): boolean {
    return now < this.hitInvulnUntil || now < this.wordInvulnUntil;
  }

  /** True while the post-word-completion aura is active. */
  isWordAuraActive(now: number): boolean {
    return now < this.wordInvulnUntil;
  }

  /** Number of completed words. */
  get wordsCompleted(): number {
    return this.completed.length;
  }

  /** Words the player has fully spelled this run (the only "met" words). */
  clearedWords(): readonly DeckWord[] {
    return this.accumulator.clearedWords();
  }

  /** True when the player has completed the win goal. */
  hasWon(): boolean {
    return this.wordsCompleted >= WIN_GOAL;
  }

  /** True when HP reached zero. */
  isOver(): boolean {
    return this.health <= 0;
  }

  /** Spelling accuracy as a fraction of collected letters used in completed words. */
  accuracy(): number {
    if (this.totalLetters === 0) return 0;
    return Math.min(1, this.correctLetters / this.totalLetters);
  }

  /** Converts session state to the immutable host result contract. */
  results(): GameResults {
    const accuracy = this.accuracy();
    return {
      accuracy,
      xp: Math.floor(this.score * accuracy),
      score: this.score,
      correctAnswers: this.wordsCompleted,
      totalAttempts: this.totalLetters,
    };
  }
}

/** Points awarded for completing a word of the given difficulty. */
export function scoreFor(difficulty: WordDifficulty): number {
  return difficulty === "hard" ? HARD_SCORE : EASY_SCORE;
}