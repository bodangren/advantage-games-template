import type { GameResults, VocabularyItem } from "@reading-advantage/game-contracts";

/** Session state kept independent from Phaser rendering. */
export interface GameState { index: number; correctAnswers: number; totalAttempts: number; score: number; completed: boolean; }
/** Creates a fresh deterministic session. */
export function createGameState(): GameState { return { index: 0, correctAnswers: 0, totalAttempts: 0, score: 0, completed: false }; }
/** Builds one correct answer and one deterministic distractor. */
export function choicesFor(input: readonly VocabularyItem[], index: number): readonly string[] { const other = input[(index + 1) % input.length]?.translation ?? input[index]!.translation; return index % 2 === 0 ? [input[index]!.translation, other] : [other, input[index]!.translation]; }
/** Records an answer and advances to the next prompt. */
export function answer(state: GameState, correct: boolean, itemCount: number): GameState { const nextCorrect = state.correctAnswers + (correct ? 1 : 0); const nextIndex = state.index + 1; return { index: nextIndex, correctAnswers: nextCorrect, totalAttempts: state.totalAttempts + 1, score: state.score + (correct ? 100 : 0), completed: nextIndex >= itemCount }; }
/** Converts terminal state to the immutable host result contract. */
export function results(state: GameState): GameResults { const accuracy = state.totalAttempts === 0 ? 0 : state.correctAnswers / state.totalAttempts; return { accuracy, xp: Math.floor(state.correctAnswers * accuracy), score: state.score, correctAnswers: state.correctAnswers, totalAttempts: state.totalAttempts }; }
