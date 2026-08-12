import { describe, expect, it } from "vitest";
import {
  advance,
  buildRound,
  createGameState,
  OPTION_COUNT,
  POINTS_CORRECT,
  POINTS_WRONG,
  results,
  TOTAL_ROUNDS,
  WORD_BANK,
} from "./systems";

describe("round generation", () => {
  it("is deterministic for the same seed and round", () => {
    const first = buildRound(42, 1, WORD_BANK);
    const second = buildRound(42, 1, WORD_BANK);
    expect(second).toEqual(first);
  });

  it("produces three unique Thai choices with one correct index in range", () => {
    const round = buildRound(7, 2, WORD_BANK);
    expect(round.options).toHaveLength(OPTION_COUNT);
    expect(new Set(round.options).size).toBe(OPTION_COUNT);
    expect(round.correctIndex).toBeGreaterThanOrEqual(0);
    expect(round.correctIndex).toBeLessThan(OPTION_COUNT);
    expect(WORD_BANK.some((item) => item.term === round.prompt)).toBe(true);
  });

  it("covers every target exactly once across a full play-through", () => {
    const targets = Array.from({ length: TOTAL_ROUNDS }, (_, i) =>
      buildRound(42, i + 1, WORD_BANK).prompt,
    );
    expect(new Set(targets).size).toBe(TOTAL_ROUNDS);
  });
});

describe("scoring", () => {
  it("awards points and tracks a correct answer", () => {
    const round = buildRound(42, 1, WORD_BANK);
    const next = advance(createGameState(), round.correctIndex, round);
    expect(next.correctAnswers).toBe(1);
    expect(next.totalAttempts).toBe(1);
    expect(next.score).toBe(POINTS_CORRECT);
  });

  it("deducts points on a wrong answer without dropping below zero", () => {
    const round = buildRound(42, 1, WORD_BANK);
    const wrong = (round.correctIndex + 1) % OPTION_COUNT;
    const next = advance(createGameState(), wrong, round);
    expect(next.correctAnswers).toBe(0);
    expect(next.totalAttempts).toBe(1);
    expect(next.score).toBe(0);
  });

  it("rewards consecutive correct answers with a combo bonus", () => {
    const round = buildRound(42, 1, WORD_BANK);
    let state = createGameState();
    state = advance(state, round.correctIndex, round);
    const firstScore = state.score;
    const second = advance(state, round.correctIndex, round);
    expect(second.score).toBe(firstScore + POINTS_CORRECT + 10);
  });
});

describe("completion and results", () => {
  it("completes after the final round and emits a valid result", () => {
    const round = buildRound(42, 1, WORD_BANK);
    let state = createGameState();
    for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
      state = advance(state, round.correctIndex, round);
    }
    expect(state.completed).toBe(true);
    const result = results(state);
    expect(result.accuracy).toBe(1);
    expect(result.score).toBeGreaterThan(0);
    expect(result.correctAnswers).toBe(TOTAL_ROUNDS);
    expect(result.totalAttempts).toBe(TOTAL_ROUNDS);
    expect(result.xp).toBeGreaterThanOrEqual(0);
  });

  it("keeps a mixed run inside contract bounds", () => {
    const round = buildRound(42, 1, WORD_BANK);
    let state = createGameState();
    state = advance(state, round.correctIndex, round);
    const wrong = (round.correctIndex + 1) % OPTION_COUNT;
    state = advance(state, wrong, round);
    const result = results(state);
    expect(result.accuracy).toBeCloseTo(0.5);
    expect(result.score).toBe(POINTS_CORRECT - POINTS_WRONG);
    expect(result.correctAnswers).toBe(1);
    expect(result.totalAttempts).toBe(2);
  });
});
