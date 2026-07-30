/**
 * Core deterministic game logic for SpellLab Potion Master.
 * All functions are pure — no side effects, no Phaser dependency.
 */

import type { GameResults } from "@reading-advantage/game-contracts";
import type { WordEntry } from "./data/WordData";
import { getWordBatch, shuffleArray, shuffleWordBottles } from "./data/WordData";
import { GAME } from "./core/Constants";

// ── Types ────────────────────────────────────────────────────────────────

/** A prepared bottle ready for gameplay (letters shuffled). */
export interface PreparedBottle {
  /** Unique bottle identifier. */
  readonly id: string;
  /** Shuffled letters in this bottle. */
  readonly letters: readonly string[];
  /** Whether this bottle contains vowel sounds. */
  readonly isVowel: boolean;
  /** Random color index (0-14). */
  readonly colorIndex: number;
}

/** A single completed word record. */
export interface CompletedWord {
  readonly word: string;
  readonly thai: string;
  readonly correct: boolean;
}

/** Mutable game state — updated via pure functions. */
export interface AlchemyState {
  /** Current batch index (0 or 1). */
  readonly batchIndex: number;
  /** Index within the current batch (0-4). */
  readonly wordIndexInBatch: number;
  /** Index of the next letter to spell in the current word. */
  readonly letterIndex: number;
  /** Number of correct word completions. */
  readonly correctAnswers: number;
  /** Total words attempted. */
  readonly totalAttempts: number;
  /** Accumulated score. */
  readonly score: number;
  /** All completed words across both batches. */
  readonly completedWords: readonly CompletedWord[];
  /** Current game phase. */
  readonly phase: "playing" | "review" | "gameover";
  /** Prepared bottles for the current word. */
  readonly currentBottles: readonly PreparedBottle[];
  /** The current word entry being played. */
  readonly currentWord: WordEntry | null;
  /** Whether the current word is in a failed state (need restart). */
  readonly wordFailed: boolean;
  /** Shuffled indices for current batch (0-4) — ensures no word repetition. */
  readonly shuffledWordIndices: readonly number[];
}

// ── State Creation ───────────────────────────────────────────────────────

/** Creates a fresh game state for a new session. Uses Math.random() for true randomness. */
export function createGameState(): AlchemyState {
  const firstBatch = getWordBatch(0);
  // Shuffle indices [0,1,2,3,4] to determine word order — no repetition
  const indices = shuffleArray([0, 1, 2, 3, 4]);
  const firstWordIndex = indices[0] ?? 0;
  const firstWord = firstBatch[firstWordIndex] ?? firstBatch[0]!;
  const prepared = prepareWord(firstWord);

  return {
    batchIndex: 0,
    wordIndexInBatch: 0,
    letterIndex: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    score: 0,
    completedWords: [],
    phase: "playing",
    currentBottles: prepared.bottles,
    currentWord: prepared.word,
    wordFailed: false,
    shuffledWordIndices: indices,
  };
}

// ── Word Preparation ─────────────────────────────────────────────────────

/** Prepared word with shuffled bottles. */
interface PreparedWord {
  readonly word: WordEntry;
  readonly bottles: readonly PreparedBottle[];
}

/**
 * Shuffles letters inside each bottle and shuffles bottle positions.
 * Uses Math.random() for true randomness — different each game.
 */
export function prepareWord(word: WordEntry): PreparedWord {
  // Shuffle letters within each bottle
  const shuffledLetters = shuffleWordBottles(word);

  // Shuffle bottle positions too
  const shuffledGroups = shuffleArray(shuffledLetters.groups);

  return {
    word: word, // Keep original word for spelling validation
    bottles: shuffledGroups.map((group, gi) => ({
      id: `bottle-${gi}`,
      letters: group.letters,
      isVowel: group.isVowel,
      colorIndex: Math.floor(Math.random() * 15),
    })),
  };
}

// ── Letter Checking ──────────────────────────────────────────────────────

/**
 * Checks if pouring a specific bottle is correct for the current letter position.
 * Returns true if the bottle contains the expected next letter.
 */
export function isCorrectPour(state: AlchemyState, bottleId: string): boolean {
  if (!state.currentWord || state.wordFailed) return false;
  const bottle = state.currentBottles.find((b) => b.id === bottleId);
  if (!bottle || bottle.letters.length === 0) return false;

  const expectedLetter = state.currentWord.word[state.letterIndex]?.toUpperCase();
  return bottle.letters.includes(expectedLetter);
}

/**
 * Returns the expected next letter for the current word position.
 */
export function getExpectedLetter(state: AlchemyState): string | null {
  if (!state.currentWord) return null;
  return state.currentWord.word[state.letterIndex]?.toUpperCase() ?? null;
}

/**
 * Advances the state after a correct pour.
 * Removes the expected letter from the bottle and advances letter index.
 */
export function pourCorrect(state: AlchemyState, bottleId: string): AlchemyState {
  const bottleIndex = state.currentBottles.findIndex((b) => b.id === bottleId);
  if (bottleIndex === -1) return state;

  const bottle = state.currentBottles[bottleIndex]!;
  const expectedLetter = state.currentWord!.word[state.letterIndex]?.toUpperCase();
  const letterPos = bottle.letters.indexOf(expectedLetter);
  if (letterPos === -1) return state;

  const newLetters = [...bottle.letters];
  newLetters.splice(letterPos, 1);

  const newBottles = state.currentBottles.map((b, i) =>
    i === bottleIndex ? { ...b, letters: newLetters } : b,
  );

  const newLetterIndex = state.letterIndex + 1;
  const wordComplete = state.currentWord
    ? newLetterIndex >= state.currentWord.word.length
    : false;

  if (wordComplete) {
    return completeWord(state, newBottles, true);
  }

  return {
    ...state,
    letterIndex: newLetterIndex,
    currentBottles: newBottles,
    wordFailed: false,
  };
}

/**
 * Marks the current word as failed — cauldron shake triggers, word restarts.
 */
export function pourWrong(state: AlchemyState): AlchemyState {
  return {
    ...state,
    wordFailed: true,
    totalAttempts: state.totalAttempts + 1,
  };
}

/**
 * Restarts the current word after a failure.
 * Re-shuffles bottles and resets letter index.
 */
export function restartWord(state: AlchemyState): AlchemyState {
  if (!state.currentWord) return state;
  const prepared = prepareWord(state.currentWord);
  return {
    ...state,
    letterIndex: 0,
    currentBottles: prepared.bottles,
    wordFailed: false,
  };
}

// ── Word Completion ──────────────────────────────────────────────────────

function completeWord(
  state: AlchemyState,
  bottles: readonly PreparedBottle[],
  correct: boolean,
): AlchemyState {
  const completedWord: CompletedWord = {
    word: state.currentWord!.word,
    thai: state.currentWord!.thai,
    correct,
  };

  const newCorrectAnswers = state.correctAnswers + (correct ? 1 : 0);
  const newTotalAttempts = state.totalAttempts + 1;
  const scoreGain = correct ? state.currentWord!.word.length * 100 : 0;

  const newCompletedWords = [...state.completedWords, completedWord];
  const batchDone = state.wordIndexInBatch + 1 >= GAME.BATCH_SIZE;
  const allDone = newCompletedWords.length >= GAME.TOTAL_WORDS;

  if (allDone) {
    return {
      ...state,
      correctAnswers: newCorrectAnswers,
      totalAttempts: newTotalAttempts,
      score: state.score + scoreGain,
      completedWords: newCompletedWords,
      currentBottles: bottles,
      phase: "gameover",
      letterIndex: state.currentWord!.word.length,
    };
  }

  if (batchDone) {
    return {
      ...state,
      correctAnswers: newCorrectAnswers,
      totalAttempts: newTotalAttempts,
      score: state.score + scoreGain,
      completedWords: newCompletedWords,
      currentBottles: bottles,
      phase: "review",
      letterIndex: state.currentWord!.word.length,
    };
  }

  return advanceToNextWord(state, newCorrectAnswers, newTotalAttempts, newCompletedWords, scoreGain);
}

// ── Batch / Word Advancement ─────────────────────────────────────────────

/** Moves to the next word within the current batch. */
function advanceToNextWord(
  state: AlchemyState,
  correctAnswers: number,
  totalAttempts: number,
  completedWords: readonly CompletedWord[],
  scoreGain: number,
): AlchemyState {
  const nextWordIndex = state.wordIndexInBatch + 1;
  const batch = getWordBatch(state.batchIndex);
  // Use stored shuffled indices — no re-shuffling, no repetition
  const wordIndex = state.shuffledWordIndices[nextWordIndex] ?? nextWordIndex;
  const nextWord = batch[wordIndex]!;
  const prepared = prepareWord(nextWord);

  // Validate that bottles contain all letters needed for the word
  const allLetters = prepared.bottles.flatMap((b) => b.letters);
  const wordLetters = nextWord.word.toUpperCase().split("");
  const isValid = wordLetters.every((l) => allLetters.includes(l)) &&
    allLetters.length === wordLetters.length;

  if (!isValid) {
    // Fallback: recreate bottles
    const fallbackPrepared = prepareWord(nextWord);
    return {
      ...state,
      wordIndexInBatch: nextWordIndex,
      letterIndex: 0,
      correctAnswers,
      totalAttempts,
      score: state.score + scoreGain,
      completedWords,
      currentBottles: fallbackPrepared.bottles,
      currentWord: fallbackPrepared.word,
      wordFailed: false,
    };
  }

  return {
    ...state,
    wordIndexInBatch: nextWordIndex,
    letterIndex: 0,
    correctAnswers,
    totalAttempts,
    score: state.score + scoreGain,
    completedWords,
    currentBottles: prepared.bottles,
    currentWord: prepared.word,
    wordFailed: false,
  };
}

/**
 * Starts the next batch after a review screen.
 */
export function startNextBatch(state: AlchemyState): AlchemyState {
  const nextBatchIndex = state.batchIndex + 1;
  const batch = getWordBatch(nextBatchIndex);
  // Generate new shuffled indices for the new batch
  const indices = shuffleArray([0, 1, 2, 3, 4]);
  const firstWordIndex = indices[0] ?? 0;
  const firstWord = batch[firstWordIndex] ?? batch[0]!;
  const prepared = prepareWord(firstWord);

  return {
    ...state,
    batchIndex: nextBatchIndex,
    wordIndexInBatch: 0,
    letterIndex: 0,
    phase: "playing",
    currentBottles: prepared.bottles,
    currentWord: prepared.word,
    wordFailed: false,
    shuffledWordIndices: indices,
  };
}

// ── Results ──────────────────────────────────────────────────────────────

/** Converts terminal state to the host result contract. */
export function results(state: AlchemyState): GameResults {
  const accuracy =
    state.totalAttempts === 0 ? 0 : state.correctAnswers / state.totalAttempts;
  return {
    accuracy,
    xp: Math.floor(state.correctAnswers * accuracy),
    score: state.score,
    correctAnswers: state.correctAnswers,
    totalAttempts: state.totalAttempts,
  };
}

// ── Star Rating ──────────────────────────────────────────────────────────

/** Returns 1-3 stars based on accuracy. */
export function getStarRating(accuracy: number): 1 | 2 | 3 {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}

// ── Starred Words (localStorage helpers) ─────────────────────────────────

/** A word saved by the player for later review. */
export interface StarredWord {
  readonly word: string;
  readonly thai: string;
  readonly starredAt: number;
}

/** Reads starred words from localStorage. */
export function loadStarredWords(): readonly StarredWord[] {
  try {
    const raw = localStorage.getItem("spelllab-starred-words");
    if (!raw) return [];
    return JSON.parse(raw) as StarredWord[];
  } catch {
    return [];
  }
}

/** Saves a word to the starred list in localStorage. */
export function toggleStarredWord(word: string, thai: string): readonly StarredWord[] {
  const existing = loadStarredWords();
  const isAlready = existing.some((w) => w.word === word);

  const updated = isAlready
    ? existing.filter((w) => w.word !== word)
    : [...existing, { word, thai, starredAt: Date.now() }];

  try {
    localStorage.setItem("spelllab-starred-words", JSON.stringify(updated));
  } catch {
    // localStorage unavailable
  }

  return updated;
}

/** Checks if a word is currently starred. */
export function isWordStarred(word: string): boolean {
  return loadStarredWords().some((w) => w.word === word);
}
