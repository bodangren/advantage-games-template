import { describe, expect, it } from "vitest";
import {
  answer,
  choicesFor,
  createGameState,
  moveToLane,
  updateTimer,
  isGameComplete,
  results,
  MAX_LIVES,
  GAME_DURATION,
  CORRECT_SCORE,
  NUM_CHOICES,
} from "./systems";
import type { VocabularyItem } from "@reading-advantage/game-contracts";

const mockInput: readonly VocabularyItem[] = [
  { term: "hello", translation: "สวัสดี" },
  { term: "goodbye", translation: "ลาก่อน" },
  { term: "thank you", translation: "ขอบคุณ" },
  { term: "please", translation: "กรุณา" },
];

describe("createGameState", () => {
  it("creates initial state with default values", () => {
    const state = createGameState();
    expect(state.index).toBe(0);
    expect(state.correctAnswers).toBe(0);
    expect(state.totalAttempts).toBe(0);
    expect(state.score).toBe(0);
    expect(state.lives).toBe(MAX_LIVES);
    expect(state.timeRemaining).toBe(GAME_DURATION);
    expect(state.gameOver).toBe(false);
    expect(state.currentLane).toBe(1);
  });
});

describe("choicesFor", () => {
  it("returns exactly NUM_CHOICES choices", () => {
    const choices = choicesFor(mockInput, 0);
    expect(choices).toHaveLength(NUM_CHOICES);
  });

  it("includes the correct translation", () => {
    const choices = choicesFor(mockInput, 0);
    expect(choices).toContain("สวัสดี");
  });

  it("includes distractors from other items", () => {
    const choices = choicesFor(mockInput, 0);
    const hasDistractor = choices.some(
      (c) => c !== "สวัสดี" && mockInput.some((item) => item.translation === c),
    );
    expect(hasDistractor).toBe(true);
  });

  it("generates deterministic choices for same index", () => {
    const choices1 = choicesFor(mockInput, 0);
    const choices2 = choicesFor(mockInput, 0);
    expect(choices1).toEqual(choices2);
  });

  it("generates different choices for different indices", () => {
    const choices1 = choicesFor(mockInput, 0);
    const choices2 = choicesFor(mockInput, 1);
    expect(choices1).not.toEqual(choices2);
  });
});

describe("answer", () => {
  it("correct answer increases score and correctAnswers", () => {
    const state = createGameState();
    const newState = answer(state, true, mockInput.length);

    expect(newState.correctAnswers).toBe(1);
    expect(newState.totalAttempts).toBe(1);
    expect(newState.score).toBe(CORRECT_SCORE);
    expect(newState.lives).toBe(MAX_LIVES);
  });

  it("incorrect answer decreases lives", () => {
    const state = createGameState();
    const newState = answer(state, false, mockInput.length);

    expect(newState.correctAnswers).toBe(0);
    expect(newState.totalAttempts).toBe(1);
    expect(newState.score).toBe(0);
    expect(newState.lives).toBe(MAX_LIVES - 1);
  });

  it("sets gameOver when lives reach 0", () => {
    let state = createGameState();
    state = { ...state, lives: 1 };
    const newState = answer(state, false, mockInput.length);

    expect(newState.lives).toBe(0);
    expect(newState.gameOver).toBe(true);
  });

  it("randomly selects next index within valid range", () => {
    const state = createGameState();
    const newState = answer(state, true, mockInput.length);

    expect(newState.index).toBeGreaterThanOrEqual(0);
    expect(newState.index).toBeLessThan(mockInput.length);
  });

  it("handles multiple correct answers", () => {
    let state = createGameState();
    state = answer(state, true, mockInput.length);
    state = answer(state, true, mockInput.length);
    state = answer(state, true, mockInput.length);

    expect(state.correctAnswers).toBe(3);
    expect(state.score).toBe(CORRECT_SCORE * 3);
  });

  it("never sets completed to true", () => {
    const state = createGameState();
    const newState = answer(state, true, mockInput.length);

    // completed field should not exist in state
    expect(newState).not.toHaveProperty("completed");
  });
});

describe("updateTimer", () => {
  it("decrements timer by delta", () => {
    const state = createGameState();
    const newState = updateTimer(state, 5);

    expect(newState.timeRemaining).toBe(GAME_DURATION - 5);
  });

  it("does not go below 0", () => {
    const state = createGameState();
    const newState = updateTimer(state, GAME_DURATION + 10);

    expect(newState.timeRemaining).toBe(0);
  });

  it("sets gameOver when timer reaches 0", () => {
    const state = createGameState();
    const newState = updateTimer(state, GAME_DURATION);

    expect(newState.timeRemaining).toBe(0);
    expect(newState.gameOver).toBe(true);
  });

  it("preserves existing gameOver state", () => {
    const state = createGameState();
    state.gameOver = true;
    const newState = updateTimer(state, 1);

    expect(newState.gameOver).toBe(true);
  });
});

describe("moveToLane", () => {
  it("moves to specified lane", () => {
    const state = createGameState();
    const newState = moveToLane(state, 0);

    expect(newState.currentLane).toBe(0);
  });

  it("clamps to valid lane range", () => {
    const state = createGameState();

    expect(moveToLane(state, -1).currentLane).toBe(0);
    expect(moveToLane(state, NUM_CHOICES).currentLane).toBe(NUM_CHOICES - 1);
  });

  it("preserves other state", () => {
    const state = createGameState();
    state.score = 500;
    const newState = moveToLane(state, 2);

    expect(newState.score).toBe(500);
  });
});

describe("isGameComplete", () => {
  it("returns false for active game", () => {
    const state = createGameState();
    expect(isGameComplete(state)).toBe(false);
  });

  it("returns true when gameOver is true", () => {
    const state = createGameState();
    state.gameOver = true;
    expect(isGameComplete(state)).toBe(true);
  });
});

describe("results", () => {
  it("calculates accuracy correctly", () => {
    let state = createGameState();
    state = answer(state, true, mockInput.length);
    state = answer(state, false, mockInput.length);

    const result = results(state);
    expect(result.accuracy).toBe(0.5);
  });

  it("calculates xp correctly", () => {
    let state = createGameState();
    state = answer(state, true, mockInput.length);
    state = answer(state, true, mockInput.length);

    const result = results(state);
    expect(result.xp).toBe(Math.floor(2 * 1));
  });

  it("includes correct score", () => {
    let state = createGameState();
    state = answer(state, true, mockInput.length);
    state = answer(state, true, mockInput.length);

    const result = results(state);
    expect(result.score).toBe(CORRECT_SCORE * 2);
  });

  it("includes correct answers count", () => {
    let state = createGameState();
    state = answer(state, true, mockInput.length);
    state = answer(state, false, mockInput.length);

    const result = results(state);
    expect(result.correctAnswers).toBe(1);
  });

  it("includes total attempts", () => {
    let state = createGameState();
    state = answer(state, true, mockInput.length);
    state = answer(state, false, mockInput.length);
    state = answer(state, true, mockInput.length);

    const result = results(state);
    expect(result.totalAttempts).toBe(3);
  });

  it("handles zero attempts", () => {
    const state = createGameState();
    const result = results(state);

    expect(result.accuracy).toBe(0);
    expect(result.xp).toBe(0);
    expect(result.score).toBe(0);
    expect(result.correctAnswers).toBe(0);
    expect(result.totalAttempts).toBe(0);
  });
});

describe("educational loop integration", () => {
  it("records attempts and produces valid results", () => {
    let state = createGameState();
    state = answer(state, true, mockInput.length);
    state = answer(state, false, mockInput.length);

    expect(results(state)).toEqual({
      accuracy: 0.5,
      xp: 0,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 2,
    });
  });

  it("allows unlimited attempts (no completion via items)", () => {
    let state = createGameState();

    // Answer many times with mostly correct answers to avoid running out of lives
    for (let i = 0; i < 20; i++) {
      state = answer(state, true, mockInput.length); // All correct
    }

    expect(state.totalAttempts).toBe(20);
    expect(state).not.toHaveProperty("completed");
    expect(state.gameOver).toBe(false); // Still playing until lives/timer
  });

  it("simulates game over from wrong answers", () => {
    let state = createGameState();

    // Make 3 wrong answers
    state = answer(state, false, mockInput.length);
    state = answer(state, false, mockInput.length);
    state = answer(state, false, mockInput.length);

    expect(state.gameOver).toBe(true);
    expect(state.lives).toBe(0);
  });

  it("simulates game over from timer", () => {
    let state = createGameState();

    // Advance timer to end
    state = updateTimer(state, GAME_DURATION);

    expect(state.gameOver).toBe(true);
    expect(state.timeRemaining).toBe(0);
  });
});
