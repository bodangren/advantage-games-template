import { describe, expect, it } from "vitest";
import {
  createGameState,
  pourCorrect,
  pourWrong,
  restartWord,
  results,
  isCorrectPour,
  getExpectedLetter,
  getStarRating,
  prepareWord,
} from "./systems";
import { getWordBatch } from "./data/WordData";
import type { WordEntry } from "./data/WordData";

const testWord: WordEntry = {
  word: "cat",
  thai: "แมว",
  difficulty: 1,
  groups: [
    { letters: ["C", "T"], isVowel: false },
    { letters: ["A"], isVowel: true },
  ],
};

describe("createGameState", () => {
  it("creates a valid initial state", () => {
    const state = createGameState();
    expect(state.phase).toBe("playing");
    expect(state.letterIndex).toBe(0);
    expect(state.correctAnswers).toBe(0);
    expect(state.totalAttempts).toBe(0);
    expect(state.score).toBe(0);
    expect(state.currentWord).not.toBeNull();
    expect(state.currentBottles.length).toBeGreaterThan(0);
  });
});

describe("isCorrectPour", () => {
  it("returns true when the bottle contains the expected letter", () => {
    const state = createGameState();
    const expected = getExpectedLetter(state);
    expect(expected).not.toBeNull();

    const correctBottle = state.currentBottles.find((b) =>
      b.letters.includes(expected!),
    );
    expect(correctBottle).toBeDefined();
    expect(isCorrectPour(state, correctBottle!.id)).toBe(true);
  });

  it("returns false for a wrong bottle", () => {
    const state = createGameState();
    const expected = getExpectedLetter(state);

    const wrongBottle = state.currentBottles.find(
      (b) => !b.letters.includes(expected!),
    );
    if (wrongBottle) {
      expect(isCorrectPour(state, wrongBottle.id)).toBe(false);
    }
  });
});

describe("pourCorrect", () => {
  it("advances the letter index on correct pour", () => {
    const state = createGameState();
    const expected = getExpectedLetter(state);
    const bottle = state.currentBottles.find((b) =>
      b.letters.includes(expected!),
    )!;

    const next = pourCorrect(state, bottle.id);
    expect(next.letterIndex).toBe(state.letterIndex + 1);
  });

  it("removes the poured letter from the bottle", () => {
    const state = createGameState();
    const expected = getExpectedLetter(state);
    const bottle = state.currentBottles.find((b) =>
      b.letters.includes(expected!),
    )!;
    const originalCount = bottle.letters.length;

    const next = pourCorrect(state, bottle.id);
    const updatedBottle = next.currentBottles.find((b) => b.id === bottle.id)!;
    expect(updatedBottle.letters.length).toBe(originalCount - 1);
  });
});

describe("pourWrong", () => {
  it("marks the word as failed", () => {
    const state = createGameState();
    const failed = pourWrong(state);
    expect(failed.wordFailed).toBe(true);
    expect(failed.totalAttempts).toBe(state.totalAttempts + 1);
  });
});

describe("restartWord", () => {
  it("resets letter index to 0 after failure", () => {
    const state = createGameState();
    const failed = pourWrong(state);
    const restarted = restartWord(failed);

    expect(restarted.letterIndex).toBe(0);
    expect(restarted.wordFailed).toBe(false);
    expect(restarted.currentBottles.length).toBeGreaterThan(0);
  });
});

describe("results", () => {
  it("produces valid results with zero attempts", () => {
    const state = createGameState();
    const r = results(state);
    expect(r.accuracy).toBe(0);
    expect(r.score).toBe(0);
    expect(r.correctAnswers).toBe(0);
    expect(r.totalAttempts).toBe(0);
  });

  it("calculates accuracy correctly", () => {
    let state = createGameState();
    state = { ...state, correctAnswers: 3, totalAttempts: 5 };
    const r = results(state);
    expect(r.accuracy).toBe(0.6);
  });
});

describe("getStarRating", () => {
  it("returns 3 stars for 90%+ accuracy", () => {
    expect(getStarRating(0.9)).toBe(3);
    expect(getStarRating(1.0)).toBe(3);
  });

  it("returns 2 stars for 70-89% accuracy", () => {
    expect(getStarRating(0.7)).toBe(2);
    expect(getStarRating(0.85)).toBe(2);
  });

  it("returns 1 star for below 70%", () => {
    expect(getStarRating(0.5)).toBe(1);
    expect(getStarRating(0)).toBe(1);
  });
});

describe("prepareWord", () => {
  it("creates bottles with correct letter count", () => {
    const prepared = prepareWord(testWord);
    const totalLetters = prepared.bottles.reduce(
      (sum, b) => sum + b.letters.length,
      0,
    );
    expect(totalLetters).toBe(testWord.word.length);
  });

  it("creates bottles with correct group count", () => {
    const prepared = prepareWord(testWord);
    expect(prepared.bottles.length).toBe(testWord.groups.length);
  });

  it("shuffles letters truly randomly (different each time)", () => {
    const word: WordEntry = {
      word: "ghost",
      thai: "ผี",
      difficulty: 1,
      groups: [
        { letters: ["G", "H"], isVowel: false },
        { letters: ["S"], isVowel: false },
        { letters: ["T"], isVowel: false },
        { letters: ["O"], isVowel: true },
      ],
    };

    // Collect multiple shuffles
    const orders = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const prepared = prepareWord(word);
      const order = prepared.bottles.flatMap((b) => b.letters).join(",");
      orders.add(order);
    }

    // Should have at least 2 different orders (not all same)
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe("4-bottle structure validation", () => {
  it("every word in batch 0 has exactly 4 bottles", () => {
    const batch = getWordBatch(0);
    batch.forEach((word) => {
      expect(word.groups.length).toBe(4);
    });
  });

  it("every word in batch 1 has exactly 4 bottles", () => {
    const batch = getWordBatch(1);
    batch.forEach((word) => {
      expect(word.groups.length).toBe(4);
    });
  });

  it("every bottle has 1-2 letters (no empty bottles)", () => {
    const allBatches = [getWordBatch(0), getWordBatch(1)];
    allBatches.forEach((batch) => {
      batch.forEach((word) => {
        word.groups.forEach((group, gi) => {
          expect(group.letters.length).toBeGreaterThanOrEqual(1);
          expect(group.letters.length).toBeLessThanOrEqual(2);
        });
      });
    });
  });

  it("total letters in bottles equals word length", () => {
    const allBatches = [getWordBatch(0), getWordBatch(1)];
    allBatches.forEach((batch) => {
      batch.forEach((word) => {
        const totalLetters = word.groups.reduce((sum, g) => sum + g.letters.length, 0);
        expect(totalLetters).toBe(word.word.length);
      });
    });
  });

  it("all letters from word are present in bottles", () => {
    const allBatches = [getWordBatch(0), getWordBatch(1)];
    allBatches.forEach((batch) => {
      batch.forEach((word) => {
        const allLetters = word.groups.flatMap((g) => g.letters);
        const wordLetters = word.word.toUpperCase().split("");
        wordLetters.forEach((letter) => {
          expect(allLetters).toContain(letter);
        });
      });
    });
  });
});

describe("word progression - all words", () => {
  it("every word in batch 0 has correct letters in bottles", () => {
    const batch = getWordBatch(0);
    batch.forEach((word) => {
      const prepared = prepareWord(word);
      const allLetters = prepared.bottles.flatMap((b) => b.letters);
      const wordLetters = word.word.toUpperCase().split("");

      // All letters must be present
      wordLetters.forEach((letter) => {
        expect(allLetters).toContain(letter);
      });

      // Total count must match
      expect(allLetters.length).toBe(wordLetters.length);
    });
  });

  it("every word in batch 1 has correct letters in bottles", () => {
    const batch = getWordBatch(1);
    batch.forEach((word) => {
      const prepared = prepareWord(word);
      const allLetters = prepared.bottles.flatMap((b) => b.letters);
      const wordLetters = word.word.toUpperCase().split("");

      wordLetters.forEach((letter) => {
        expect(allLetters).toContain(letter);
      });
      expect(allLetters.length).toBe(wordLetters.length);
    });
  });

  it("pouring all letters in correct order completes the word", () => {
    let state = createGameState();
    const word1 = state.currentWord!;
    const word1Letters = word1.word.length;

    for (let i = 0; i < word1Letters; i++) {
      const expected = getExpectedLetter(state);
      expect(expected).not.toBeNull();

      const bottle = state.currentBottles.find((b) =>
        b.letters.includes(expected!),
      );
      expect(bottle).toBeDefined();

      state = pourCorrect(state, bottle!.id);
    }

    // Word complete — should have advanced to next word with letterIndex=0
    expect(state.completedWords.length).toBe(1);
    expect(state.completedWords[0]!.word).toBe(word1.word);
    expect(state.completedWords[0]!.correct).toBe(true);
    expect(state.letterIndex).toBe(0);
    expect(state.currentWord).not.toBeNull();
  });

  it("advancing to next word resets letterIndex to 0", () => {
    let state = createGameState();
    const word1 = state.currentWord!;

    // Complete first word
    for (let i = 0; i < word1.word.length; i++) {
      const expected = getExpectedLetter(state);
      const bottle = state.currentBottles.find((b) =>
        b.letters.includes(expected!),
      )!;
      state = pourCorrect(state, bottle.id);
    }

    // Should have moved to next word (wordIndexInBatch incremented)
    expect(state.currentWord).not.toBeNull();
    expect(state.wordIndexInBatch).toBe(1);
    expect(state.letterIndex).toBe(0);
    expect(state.wordFailed).toBe(false);
    expect(state.currentBottles.length).toBeGreaterThan(0);
    expect(state.completedWords.length).toBe(1);
    expect(state.completedWords[0]!.word).toBe(word1.word);
  });

  it("next word bottles contain correct letters", () => {
    let state = createGameState();
    const word1 = state.currentWord!;

    // Complete first word
    for (let i = 0; i < word1.word.length; i++) {
      const expected = getExpectedLetter(state);
      const bottle = state.currentBottles.find((b) =>
        b.letters.includes(expected!),
      )!;
      state = pourCorrect(state, bottle.id);
    }

    // Verify next word bottles
    const word2 = state.currentWord!;
    const allLetters = state.currentBottles.flatMap((b) => b.letters);
    const wordLetters = word2.word.toUpperCase().split("");

    wordLetters.forEach((letter) => {
      expect(allLetters).toContain(letter);
    });
    expect(allLetters.length).toBe(wordLetters.length);
  });
});

describe("no word repetition", () => {
  it("no word repetition within a batch (5 words)", () => {
    let state = createGameState();
    const seenWords = new Set<string>();

    // Complete all 5 words in batch
    for (let w = 0; w < 5; w++) {
      const word = state.currentWord!;
      expect(seenWords.has(word.word)).toBe(false); // No repeat
      seenWords.add(word.word);

      // Spell the word
      for (let i = 0; i < word.word.length; i++) {
        const expected = getExpectedLetter(state);
        expect(expected).not.toBeNull();
        const bottle = state.currentBottles.find((b) =>
          b.letters.includes(expected!),
        );
        expect(bottle).toBeDefined();
        state = pourCorrect(state, bottle!.id);
      }
    }

    expect(seenWords.size).toBe(5); // All 5 words were unique
  });

  it("shuffledWordIndices is stored in state", () => {
    const state = createGameState();
    expect(state.shuffledWordIndices).toBeDefined();
    expect(state.shuffledWordIndices.length).toBe(5);
    // All indices 0-4 should be present
    const sorted = [...state.shuffledWordIndices].sort();
    expect(sorted).toEqual([0, 1, 2, 3, 4]);
  });
});
