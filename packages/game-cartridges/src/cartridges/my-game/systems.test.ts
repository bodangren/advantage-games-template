import { describe, expect, it } from "vitest";
import type { Direction } from "./systems";
import {
  generateMaze,
  getWalkableCells,
  createCrystalMazeState,
  initOrbsForWord,
  advanceFromGate,
  getCurrentSentence,
  getCurrentWords,
  getCurrentWord,
  getNextLetter,
  isOrbNext,
  isWordComplete,
  isWordDone,
  markWordComplete,
  startArranging,
  addLetterToArrangement,
  removeLastLetter,
  checkArrangement,
  arrangementCorrect,
  canMove,
  moveHero,
  getCollidingOrb,
  collectOrb,
  wrongOrbPenalty,
  stunHero,
  heroDamaged,
  activateGoblinHunt,
  deactivateGoblinHunt,
  tickPowerUpTimer,
  tickStunTimer,
  getCollidingGoblin,
  defeatGoblin,
  updateGoblins,
  nextSentence,
  getGameResults,
  INITIAL_LIVES,
  POWER_UP_DURATION,
  STUN_DURATION,
  SCORE_PER_ORB,
  SCORE_PER_GOBLIN,
  SURVIVAL_BONUS,
  GOBLIN_COUNT,
} from "./systems";
import type { VocabularyItem } from "@reading-advantage/game-contracts";

const SAMPLE_INPUT: VocabularyItem[] = [
  { term: "I am happy", translation: "ฉันมีความสุข" },
  { term: "The cat sleeps", translation: "แมวกำลังนอน" },
];

// ---- Maze Generation ----

describe("generateMaze", () => {
  it("creates a grid of the correct dimensions", () => {
    const maze = generateMaze(13, 13, 42);
    expect(maze.length).toBe(13);
    for (const row of maze) expect(row.length).toBe(13);
  });

  it("contains only values 0, 1, and 2", () => {
    const maze = generateMaze(11, 11, 7);
    for (const row of maze) for (const c of row) expect([0, 1, 2]).toContain(c);
  });

  it("has exactly one gate cell", () => {
    const maze = generateMaze(13, 13, 99);
    let n = 0;
    for (const row of maze) for (const c of row) if (c === 2) n += 1;
    expect(n).toBe(1);
  });

  it("is deterministic with the same seed", () => {
    expect(generateMaze(13, 13, 123)).toEqual(generateMaze(13, 13, 123));
  });
});

// ---- State Creation ----

describe("createCrystalMazeState", () => {
  it("creates state with correct initial values", () => {
    const state = createCrystalMazeState(SAMPLE_INPUT, 0);
    expect(state.sentenceIndex).toBe(0);
    expect(state.wordProgress).toBe(0);
    expect(state.letterProgress).toBe(0);
    expect(state.lives).toBe(INITIAL_LIVES);
    expect(state.score).toBe(0);
    expect(state.completed).toBe(false);
    expect(state.won).toBe(false);
    expect(state.gateOpen).toBe(false);
    expect(state.arranging).toBe(false);
    expect(state.collectedLetters).toEqual([]);
  });

  it("places goblins", () => {
    const state = createCrystalMazeState(SAMPLE_INPUT, 0);
    expect(state.goblins.length).toBe(GOBLIN_COUNT);
  });

  it("starts hero on walkable cell", () => {
    const state = createCrystalMazeState(SAMPLE_INPUT, 0);
    expect(state.maze[state.heroPos.row]![state.heroPos.col]).toBe(0);
  });
});

// ---- initOrbsForWord ----

describe("initOrbsForWord", () => {
  it("places one orb per letter", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = initOrbsForWord(state, SAMPLE_INPUT, 0);
    const word = getCurrentWord(state, SAMPLE_INPUT);
    expect(state.orbs.length).toBe(word.length);
  });

  it("all orbs start uncollected", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = initOrbsForWord(state, SAMPLE_INPUT, 0);
    for (const o of state.orbs) expect(o.collected).toBe(false);
  });
});

// ---- Sentence Helpers ----

describe("getCurrentSentence", () => {
  it("returns the first sentence", () => {
    const state = createCrystalMazeState(SAMPLE_INPUT, 0);
    expect(getCurrentSentence(state, SAMPLE_INPUT).term).toBe("I am happy");
  });
});

describe("getCurrentWords", () => {
  it("splits into words", () => {
    const state = createCrystalMazeState(SAMPLE_INPUT, 0);
    expect(getCurrentWords(state, SAMPLE_INPUT)).toEqual(["I", "am", "happy"]);
  });
});

describe("getCurrentWord", () => {
  it("returns first word", () => {
    const state = createCrystalMazeState(SAMPLE_INPUT, 0);
    expect(getCurrentWord(state, SAMPLE_INPUT)).toBe("I");
  });
});

// ---- isOrbNext (now: any uncollected orb) ----

describe("isOrbNext", () => {
  it("returns true for any uncollected orb", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = initOrbsForWord(state, SAMPLE_INPUT, 0);
    for (let i = 0; i < state.orbs.length; i++) {
      expect(isOrbNext(state, i)).toBe(true);
    }
  });

  it("returns false for collected orbs", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = initOrbsForWord(state, SAMPLE_INPUT, 0);
    state = collectOrb(state, 0);
    expect(isOrbNext(state, 0)).toBe(false);
  });
});

// ---- collectOrb (any-order mode) ----

describe("collectOrb", () => {
  it("collects an orb and adds letter to collectedLetters", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = initOrbsForWord(state, SAMPLE_INPUT, 0);
    state = collectOrb(state, 0);

    expect(state.orbs[0]!.collected).toBe(true);
    expect(state.collectedLetters).toEqual([state.orbs[0]!.letter]);
    expect(state.score).toBe(SCORE_PER_ORB);
    expect(state.correctAnswers).toBe(1);
    expect(state.totalAttempts).toBe(1);
  });

  it("does not collect already-collected orb", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = initOrbsForWord(state, SAMPLE_INPUT, 0);
    state = collectOrb(state, 0);
    state = collectOrb(state, 0); // duplicate
    expect(state.collectedLetters.length).toBe(1); // no duplicate
    expect(state.totalAttempts).toBe(1); // not counted again
  });
});

// ---- Arrangement ----

describe("arrangement", () => {
  it("startArranging sets flag", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = startArranging(state);
    expect(state.arranging).toBe(true);
    expect(state.arrangedWord).toBe("");
  });

  it("addLetterToArrangement builds word", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = startArranging(state);
    state = addLetterToArrangement(state, "I");
    expect(state.arrangedWord).toBe("I");
  });

  it("removeLastLetter removes one letter", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = startArranging(state);
    state = addLetterToArrangement(state, "a");
    state = addLetterToArrangement(state, "m");
    state = removeLastLetter(state);
    expect(state.arrangedWord).toBe("a");
  });

  it("checkArrangement validates correct word", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = startArranging(state);
    state = addLetterToArrangement(state, "I");
    expect(checkArrangement(state, SAMPLE_INPUT)).toBe(true);
  });

  it("checkArrangement rejects wrong word", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = startArranging(state);
    state = addLetterToArrangement(state, "X");
    expect(checkArrangement(state, SAMPLE_INPUT)).toBe(false);
  });

  it("arrangementCorrect advances to next word", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = initOrbsForWord(state, SAMPLE_INPUT, 0);
    state = collectOrb(state, 0); // collected "I"
    state = startArranging(state);
    state = addLetterToArrangement(state, "I");
    state = arrangementCorrect(state, SAMPLE_INPUT);

    expect(state.arranging).toBe(false);
    expect(state.wordProgress).toBe(1);
    expect(state.collectedLetters).toEqual([]);
  });

  it("arrangementCorrect activates goblin hunt on sentence complete", () => {
    // Use a single-word input
    const input: VocabularyItem[] = [{ term: "Go", translation: "ไป" }];
    let state = createCrystalMazeState(input, 0);
    state = initOrbsForWord(state, input, 0);
    state = collectOrb(state, 0);
    state = collectOrb(state, 1);
    state = startArranging(state);
    state = addLetterToArrangement(state, "G");
    state = addLetterToArrangement(state, "o");
    state = arrangementCorrect(state, input);

    expect(state.goblinHuntActive).toBe(true);
    expect(state.sentenceComplete).toBe(true);
  });
});

// ---- Word tracking ----

describe("word tracking", () => {
  it("markWordComplete and isWordDone", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = markWordComplete(state, "0,0");
    expect(isWordDone(state, 0, 0)).toBe(true);
    expect(isWordDone(state, 0, 1)).toBe(false);
  });
});

// ---- Hero Movement ----

describe("canMove", () => {
  it("has at least one walkable direction", () => {
    const state = createCrystalMazeState(SAMPLE_INPUT, 123);
    const dirs: Direction[] = ["up", "down", "left", "right"];
    expect(dirs.some((d) => canMove(state, d))).toBe(true);
  });

  it("prevents move through walls", () => {
    const state = createCrystalMazeState(SAMPLE_INPUT, 123);
    const dirs: Direction[] = ["up", "down", "left", "right"];
    for (const d of dirs) {
      if (!canMove(state, d)) {
        const moved = moveHero(state, d);
        expect(moved.heroPos).toEqual(state.heroPos);
        return;
      }
    }
  });
});

describe("moveHero", () => {
  it("moves hero", () => {
    const state = createCrystalMazeState(SAMPLE_INPUT, 123);
    const dirs: Direction[] = ["up", "down", "left", "right"];
    for (const d of dirs) {
      if (canMove(state, d)) {
        const moved = moveHero(state, d);
        expect(moved.heroPos).not.toEqual(state.heroPos);
        return;
      }
    }
  });
});

// ---- Penalties (goblin only now) ----

describe("wrongOrbPenalty", () => {
  it("damages and stuns", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = initOrbsForWord(state, SAMPLE_INPUT, 0);
    state = wrongOrbPenalty(state);
    expect(state.lives).toBe(INITIAL_LIVES - 1);
    expect(state.stunned).toBe(true);
  });

  it("no effect while invincible", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = { ...state, invincible: true };
    state = wrongOrbPenalty(state);
    expect(state.lives).toBe(INITIAL_LIVES);
  });
});

// ---- Power-up ----

describe("activateGoblinHunt / deactivateGoblinHunt", () => {
  it("goblins flee on activate, patrol on deactivate", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = activateGoblinHunt(state);
    expect(state.goblinHuntActive).toBe(true);
    for (const g of state.goblins) expect(g.mode).toBe("flee");

    state = deactivateGoblinHunt(state);
    expect(state.goblinHuntActive).toBe(false);
    for (const g of state.goblins) expect(g.mode).toBe("patrol");
  });
});

describe("tickPowerUpTimer", () => {
  it("expires correctly", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = activateGoblinHunt(state);
    state = tickPowerUpTimer(state, POWER_UP_DURATION + 1);
    expect(state.goblinHuntActive).toBe(false);
  });
});

// ---- Goblin Mechanics ----

describe("getCollidingGoblin", () => {
  it("returns -1 when no collision", () => {
    expect(getCollidingGoblin(createCrystalMazeState(SAMPLE_INPUT, 0))).toBe(-1);
  });
});

describe("defeatGoblin", () => {
  it("works during power-up only", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = activateGoblinHunt(state);
    state = defeatGoblin(state, 0);
    expect(state.goblins[0]!.mode).toBe("defeated");
    expect(state.score).toBe(SCORE_PER_GOBLIN);
  });

  it("does nothing without power-up", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = defeatGoblin(state, 0);
    expect(state.goblins[0]!.mode).toBe("patrol");
    expect(state.score).toBe(0);
  });
});

// ---- Game Results ----

describe("getGameResults", () => {
  it("calculates correctly", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = initOrbsForWord(state, SAMPLE_INPUT, 0);
    state = collectOrb(state, 0);
    state = { ...state, completed: true, won: true, lives: 2 };
    const r = getGameResults(state);
    expect(r.correctAnswers).toBe(1);
    expect(r.totalAttempts).toBe(1);
    expect(r.accuracy).toBe(1);
  });

  it("accuracy 0 without attempts", () => {
    let state = createCrystalMazeState(SAMPLE_INPUT, 0);
    state = { ...state, completed: true, won: false };
    expect(getGameResults(state).accuracy).toBe(0);
  });
});
