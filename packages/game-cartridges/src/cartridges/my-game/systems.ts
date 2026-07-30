import type {
  GameResults,
  VocabularyItem,
} from "@reading-advantage/game-contracts";

/** Session state for the vocabulary runner game. */
export interface GameState {
  /** Current vocabulary item index. */
  index: number;
  /** Number of correct answers. */
  correctAnswers: number;
  /** Total attempts made. */
  totalAttempts: number;
  /** Current score. */
  score: number;
  /** Remaining lives (starts at 3). */
  lives: number;
  /** Time remaining in seconds (starts at 120). */
  timeRemaining: number;
  /** Whether the game is over (lives or timer depleted). */
  gameOver: boolean;
  /** Current lane position (0=left, 1=center, 2=right). */
  currentLane: number;
}

/** Maximum lives the player starts with. */
export const MAX_LIVES = 3;
/** Game duration in seconds. */
export const GAME_DURATION = 90;
/** Points awarded for correct answer. */
export const CORRECT_SCORE = 100;
/** Number of door choices presented. */
export const NUM_CHOICES = 3;

/**
 * Creates a fresh deterministic game session.
 * @returns A new GameState with default values.
 */
export function createGameState(): GameState {
  return {
    index: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    score: 0,
    lives: MAX_LIVES,
    timeRemaining: GAME_DURATION,
    gameOver: false,
    currentLane: 1,
  };
}

/**
 * Generates three choices for a vocabulary item: one correct and two distractors.
 * @param input - The full vocabulary array.
 * @param index - Current item index.
 * @returns Array of three translation strings.
 */
export function choicesFor(
  input: readonly VocabularyItem[],
  index: number,
): readonly string[] {
  const correct = input[index]!.translation;
  const choices: string[] = [correct];

  // Add distractors from other items
  let i = 1;
  while (choices.length < NUM_CHOICES && i < input.length) {
    const distractor = input[(index + i) % input.length]!.translation;
    if (!choices.includes(distractor)) {
      choices.push(distractor);
    }
    i++;
  }

  // Fill remaining slots with variations if needed
  while (choices.length < NUM_CHOICES) {
    choices.push(`${correct}?`);
  }

  // Shuffle deterministically based on index
  return shuffleDeterministic(choices, index);
}

/**
 * Shuffles array deterministically using Fisher-Yates with a seed.
 * @param array - Array to shuffle.
 * @param seed - Seed for deterministic shuffle.
 * @returns New shuffled array.
 */
function shuffleDeterministic(
  array: readonly string[],
  seed: number,
): readonly string[] {
  const result = [...array];
  let currentIndex = result.length;
  let randomValue = seed + 1;

  while (currentIndex !== 0) {
    randomValue = (randomValue * 1103515245 + 12345) & 0x7fffffff;
    const randomIndex = randomValue % currentIndex;
    currentIndex--;
    [result[currentIndex], result[randomIndex]] = [
      result[randomIndex]!,
      result[currentIndex]!,
    ];
  }

  return result;
}

/**
 * Records an answer and updates game state.
 * @param state - Current game state.
 * @param correct - Whether the answer was correct.
 * @param itemCount - Total vocabulary items available.
 * @returns New GameState after processing the answer.
 */
export function answer(
  state: GameState,
  correct: boolean,
  itemCount: number,
): GameState {
  const newLives = correct ? state.lives : state.lives - 1;
  const newCorrect = state.correctAnswers + (correct ? 1 : 0);
  const newIndex = Math.floor(Math.random() * itemCount);
  const gameOver = newLives <= 0;

  return {
    ...state,
    index: newIndex,
    correctAnswers: newCorrect,
    totalAttempts: state.totalAttempts + 1,
    score: state.score + (correct ? CORRECT_SCORE : 0),
    lives: newLives,
    gameOver,
  };
}

/**
 * Updates the timer countdown.
 * @param state - Current game state.
 * @param delta - Time elapsed in seconds.
 * @returns New GameState with updated timer.
 */
export function updateTimer(state: GameState, delta: number): GameState {
  const newTime = Math.max(0, state.timeRemaining - delta);
  return {
    ...state,
    timeRemaining: newTime,
    gameOver: state.gameOver || newTime <= 0,
  };
}

/**
 * Moves the witch to a new lane.
 * @param state - Current game state.
 * @param lane - Target lane (0=left, 1=center, 2=right).
 * @returns New GameState with updated lane.
 */
export function moveToLane(state: GameState, lane: number): GameState {
  const clampedLane = Math.max(0, Math.min(NUM_CHOICES - 1, lane));
  return {
    ...state,
    currentLane: clampedLane,
  };
}

/**
 * Checks if the game should end.
 * @param state - Current game state.
 * @returns True if game is over.
 */
export function isGameComplete(state: GameState): boolean {
  return state.gameOver;
}

/**
 * Converts terminal state to the immutable host result contract.
 * @param state - Final game state.
 * @returns GameResults for the host.
 */
export function results(state: GameState): GameResults {
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
