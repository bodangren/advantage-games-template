import { describe, expect, it } from "vitest";
import { answer, createGameState, results } from "./systems";
describe("starter educational loop", () => {
  it("records attempts and produces valid results", () => {
    const state = answer(answer(createGameState(), true, 2), false, 2);
    expect(results(state)).toEqual({ accuracy: 0.5, xp: 0, score: 100, correctAnswers: 1, totalAttempts: 2 });
  });
});
