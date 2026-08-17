import { describe, expect, it } from "vitest";
import { answer, choicesFor, createGameState, results } from "./systems";

const input = [
  { term: "แมว", translation: "cat" },
  { term: "สุนัข", translation: "dog" },
];

describe("candidate educational loop", () => {
  it("records attempts and produces valid results", () => {
    const state = answer(answer(createGameState(input), true), false);
    expect(results(state)).toEqual({
      accuracy: 0.5,
      xp: 20,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 2,
    });
  });

  it("rejects empty or blank host content", () => {
    expect(() => createGameState([])).toThrow(/empty/i);
    expect(() => createGameState([{ term: " ", translation: "cat" }])).toThrow(/blank/i);
  });

  it("changes the answer position without random state", () => {
    expect(choicesFor(input, 0)).toEqual(["cat", "dog"]);
    expect(choicesFor(input, 1)).toEqual(["cat", "dog"]);
  });

  it("does not mutate a completed session", () => {
    const complete = answer(answer(createGameState(input), true), true);
    expect(answer(complete, false)).toBe(complete);
  });
});
