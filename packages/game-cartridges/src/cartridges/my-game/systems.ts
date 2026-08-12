import type { GameResults, VocabularyItem } from "@reading-advantage/game-contracts";

/** Total rounds in one play-through. */
export const TOTAL_ROUNDS = 10;
/** Time each round's player gets to answer, in milliseconds. */
export const TIMER_MS = 3000;
/** Number of Thai choice cards shown per round. */
export const OPTION_COUNT = 3;
/** Points awarded for a correct answer before combo bonuses. */
export const POINTS_CORRECT = 100;
/** Points deducted when the player answers wrong or lets the timer run out. */
export const POINTS_WRONG = 50;
/** Extra points per consecutive correct answer, capped by MAX_COMBO. */
export const COMBO_STEP = 10;
/** Highest consecutive-correct streak that still earns combo bonus. */
export const MAX_COMBO = 3;

/** Default round data: ten English/Thai place pairs used when the host provides none. */
export const WORD_BANK: readonly VocabularyItem[] = [
  { term: "Market", translation: "ตลาด" },
  { term: "Temple", translation: "วัด" },
  { term: "School", translation: "โรงเรียน" },
  { term: "Hospital", translation: "โรงพยาบาล" },
  { term: "Police Station", translation: "สถานีตำรวจ" },
  { term: "Park", translation: "สวนสาธารณะ" },
  { term: "Bank", translation: "ธนาคาร" },
  { term: "Restaurant", translation: "ร้านอาหาร" },
  { term: "Museum", translation: "พิพิธภัณฑ์" },
  { term: "Supermarket", translation: "ซูเปอร์มาร์เก็ต" },
];

/** One fully generated round: the English prompt plus three Thai choices. */
export interface RoundPrompt {
  /** English term the player must match, shown above the choices. */
  readonly prompt: string;
  /** Three Thai translations; exactly one is the correct match. */
  readonly options: readonly string[];
  /** Index into {@link RoundPrompt.options} that matches the prompt. */
  readonly correctIndex: number;
}

/** Session state kept independent from Phaser rendering. */
export interface GameState {
  /** Next round to play, starting at 1. */
  round: number;
  /** Current score; never drops below zero. */
  score: number;
  /** Number of correctly answered rounds. */
  correctAnswers: number;
  /** Number of answered rounds (correct and wrong). */
  totalAttempts: number;
  /** Consecutive correct answers, used for combo scoring. */
  streak: number;
  /** True once all rounds have been played. */
  completed: boolean;
}

/** Creates a fresh deterministic session. */
export function createGameState(): GameState {
  return {
    round: 1,
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    streak: 0,
    completed: false,
  };
}

/** Deterministic 32-bit seeded PRNG used for reproducible round generation. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle over an index range driven by a seeded PRNG. */
function shuffledIndexes(count: number, rng: () => number): number[] {
  const indexes = Array.from({ length: count }, (_, i) => i);
  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j]!, indexes[i]!];
  }
  return indexes;
}

/**
 * Generates one deterministic round from a word bank.
 * @param seed Host-supplied deterministic seed.
 * @param round The 1-based round number to generate.
 * @param wordBank Learning pairs used as the source of prompts and choices.
 * @returns A fully specified round with three unique Thai choices.
 */
export function buildRound(
  seed: number,
  round: number,
  wordBank: readonly VocabularyItem[],
): RoundPrompt {
  const order = shuffledIndexes(wordBank.length, mulberry32(seed));
  const targetIndex = order[(round - 1) % wordBank.length]!;
  const target = wordBank[targetIndex]!;

  const pool: number[] = [targetIndex];
  let offset = 1;
  while (pool.length < OPTION_COUNT) {
    const candidate = order[(round - 1 + offset) % wordBank.length]!;
    if (!pool.includes(candidate)) pool.push(candidate);
    offset += 1;
  }

  const optionIndexes = shuffledIndexes(
    pool.length,
    mulberry32(seed + round * 0x9e3779b9),
  ).map((_, i) => pool[i]!);
  const correctIndex = optionIndexes.indexOf(targetIndex);
  return {
    prompt: target.term,
    options: optionIndexes.map((index) => wordBank[index]!.translation),
    correctIndex,
  };
}

/**
 * Applies one player choice and advances the session.
 * @param state Current session state.
 * @param chosenIndex The option index the player picked.
 * @param round The round that was just answered.
 * @returns The next session state, with scoring and completion applied.
 */
export function advance(state: GameState, chosenIndex: number, round: RoundPrompt): GameState {
  const correct = chosenIndex === round.correctIndex;
  let score = state.score;
  let streak = state.streak;
  let correctAnswers = state.correctAnswers;

  if (correct) {
    streak += 1;
    const combo = Math.min(streak - 1, MAX_COMBO) * COMBO_STEP;
    score += POINTS_CORRECT + combo;
    correctAnswers += 1;
  } else {
    streak = 0;
    score = Math.max(0, score - POINTS_WRONG);
  }

  const roundNext = state.round + 1;
  return {
    round: roundNext,
    score,
    correctAnswers,
    totalAttempts: state.totalAttempts + 1,
    streak,
    completed: roundNext > TOTAL_ROUNDS,
  };
}

/** Converts terminal session state to the immutable host result contract. */
export function results(state: GameState): GameResults {
  const accuracy = state.totalAttempts === 0 ? 0 : state.correctAnswers / state.totalAttempts;
  return {
    accuracy,
    xp: Math.floor(state.score * accuracy),
    score: state.score,
    correctAnswers: state.correctAnswers,
    totalAttempts: state.totalAttempts,
  };
}
