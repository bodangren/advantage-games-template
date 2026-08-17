import type {
  GameResults,
  VocabularyItem,
} from "@reading-advantage/game-contracts";
import {
  createResultAccountant,
  finalizeResult,
  validateNonEmptyContent,
} from "@reading-advantage/advantage-play-kit/systems";

/** Immutable educational session state kept outside Phaser rendering. */
export interface GameState {
  readonly index: number;
  readonly itemCount: number;
  readonly answers: readonly boolean[];
  readonly correctAnswers: number;
  readonly totalAttempts: number;
  readonly score: number;
  readonly completed: boolean;
}

/**
 * Creates a validated deterministic session.
 * @param input Host-owned educational content.
 * @param inputMode Vocabulary or sentence semantics.
 * @returns Fresh immutable session state.
 */
export function createGameState(
  input: unknown,
  inputMode: "vocabulary" | "sentence" = "vocabulary",
): GameState {
  const content = validateNonEmptyContent(input, inputMode);
  return Object.freeze({
    index: 0,
    itemCount: content.items.length,
    answers: Object.freeze([]),
    correctAnswers: 0,
    totalAttempts: 0,
    score: 0,
    completed: false,
  });
}

/**
 * Builds one correct answer and one deterministic distractor.
 * @param input Educational items.
 * @param index Current item index.
 * @returns Two choices with a deterministic answer position.
 */
export function choicesFor(
  input: readonly VocabularyItem[],
  index: number,
): readonly [string, string] {
  const item = input[index];
  if (!item) throw new Error(`Missing learning item ${index}`);
  const adjacent = input[(index + 1) % input.length];
  const distractor =
    adjacent && adjacent.translation !== item.translation
      ? adjacent.translation
      : `Not: ${item.translation}`;
  return index % 2 === 0
    ? [item.translation, distractor]
    : [distractor, item.translation];
}

/**
 * Records one answer and advances the session.
 * @param state Current immutable state.
 * @param correct Whether the selected answer was correct.
 * @returns The next immutable state.
 */
export function answer(state: GameState, correct: boolean): GameState {
  if (state.completed) return state;
  const nextIndex = state.index + 1;
  return Object.freeze({
    index: nextIndex,
    itemCount: state.itemCount,
    answers: Object.freeze([...state.answers, correct]),
    correctAnswers: state.correctAnswers + (correct ? 1 : 0),
    totalAttempts: state.totalAttempts + 1,
    score: state.score + (correct ? 100 : 0),
    completed: nextIndex >= state.itemCount,
  });
}

/**
 * Converts terminal state through shared APK result accounting.
 * @param state Terminal session state.
 * @returns A stable five-field result.
 */
export function results(state: GameState): GameResults {
  const accountant = createResultAccountant();
  state.answers.forEach((correct) => accountant.recordAttempt({ correct }));
  accountant.addScore(state.score);
  return finalizeResult(accountant, {
    xpPerCorrect: 10,
    xpPerAccuracyPoint: 20,
  });
}
