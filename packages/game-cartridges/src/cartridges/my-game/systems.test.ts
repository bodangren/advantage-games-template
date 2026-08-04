import { describe, expect, it } from "vitest";
import {
  GOBLIN_SPAWNS,
  HERO_SPAWN,
  MAZE_TEMPLATE,
  SCORE_PER_ORB,
  SCORE_PER_SENTENCE,
  STARTING_LIVES,
  buildRounds,
  canEnter,
  chooseGoblinDirection,
  collectOrb,
  createGameState,
  createRandom,
  defeatGoblin,
  loseLife,
  openCells,
  orientCell,
  orientMaze,
  parseMaze,
  placeOrbs,
  results,
  sentenceProgress,
  stepMover,
  transposeMaze,
  type SentenceRound,
} from "./systems";

const input = [
  { term: "We journey through the ancient maze together", translation: "เราเดินทางผ่านเขาวงกตโบราณด้วยกัน" },
  { term: "The cat runs", translation: "แมววิ่ง" },
  { term: "She collects crystals in the cave", translation: "เธอเก็บคริสตัลในถ้ำ" },
];

const rounds: readonly SentenceRound[] = buildRounds(input);

/** Collects every word of a round in the correct order. */
function playRound(state = createGameState(), roundList = rounds) {
  let current = state;
  const round = roundList[current.roundIndex]!;
  let outcome = "";
  for (let index = 0; index < round.words.length; index += 1) {
    const applied = collectOrb(current, roundList, index);
    current = applied.state;
    outcome = applied.outcome;
  }
  return { state: current, outcome };
}

describe("maze geometry", () => {
  it("parses a rectangular grid with a walled border", () => {
    const grid = parseMaze();
    expect(grid).toHaveLength(MAZE_TEMPLATE.length);
    expect(new Set(grid.map((row) => row.length)).size).toBe(1);
    expect(canEnter(grid, 0, 0)).toBe(false);
    expect(canEnter(grid, HERO_SPAWN.col, HERO_SPAWN.row)).toBe(true);
  });

  it("spawns the hero and every goblin on corridor cells in both orientations", () => {
    for (const wide of [false, true]) {
      const grid = orientMaze(parseMaze(), wide);
      const hero = orientCell(HERO_SPAWN, wide);
      expect(canEnter(grid, hero.col, hero.row)).toBe(true);
      for (const spawn of GOBLIN_SPAWNS) {
        const cell = orientCell(spawn, wide);
        expect(canEnter(grid, cell.col, cell.row)).toBe(true);
      }
    }
  });

  it("transposes the portrait maze into the wide maze without losing corridors", () => {
    const grid = parseMaze();
    const wide = transposeMaze(grid);
    expect(wide).toHaveLength(grid[0]!.length);
    expect(wide[0]).toHaveLength(grid.length);
    expect(openCells(wide)).toHaveLength(openCells(grid).length);
    expect(transposeMaze(wide)).toEqual(grid);
  });

  it("keeps every corridor reachable from the hero spawn", () => {
    const grid = parseMaze();
    const seen = new Set([`${HERO_SPAWN.col}:${HERO_SPAWN.row}`]);
    const queue = [HERO_SPAWN];
    while (queue.length > 0) {
      const cell = queue.pop()!;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const next = { col: cell.col + dc, row: cell.row + dr };
        const key = `${next.col}:${next.row}`;
        if (seen.has(key) || !canEnter(grid, next.col, next.row)) continue;
        seen.add(key);
        queue.push(next);
      }
    }
    expect(seen.size).toBe(openCells(grid).length);
  });
});

describe("movement", () => {
  it("only turns into corridors and stops at walls", () => {
    const grid = parseMaze();
    const start = { col: 1, row: 9, dirCol: 0, dirRow: 0 };
    expect(canEnter(grid, 0, 9)).toBe(false);
    const intoWall = stepMover(grid, start, { dirCol: -1, dirRow: 0 }, 0.25);
    expect(intoWall).toEqual({ col: 1, row: 9, dirCol: 0, dirRow: 0 });

    const along = stepMover(grid, start, { dirCol: 1, dirRow: 0 }, 0.25);
    expect(along.col).toBeCloseTo(1.25);
    expect(along.dirCol).toBe(1);
  });

  it("travels a corridor when each frame step is smaller than the turn window", () => {
    const grid = parseMaze();
    let mover = { col: 1, row: 9, dirCol: 0, dirRow: 0 };
    const want = { dirCol: 1, dirRow: 0 };
    for (let frame = 0; frame < 30; frame += 1) {
      mover = stepMover(grid, mover, want, 0.09);
    }
    expect(mover.col).toBeCloseTo(1 + 30 * 0.09, 5);
    expect(mover.dirCol).toBe(1);
  });

  it("keeps walkers inside the maze over a long deterministic run", () => {
    const grid = parseMaze();
    const random = createRandom(7);
    let mover = { col: HERO_SPAWN.col, row: HERO_SPAWN.row, dirCol: 0, dirRow: 0 };
    for (let frame = 0; frame < 600; frame += 1) {
      const want = chooseGoblinDirection(grid, mover, { col: 1, row: 1 }, random, "patrol");
      mover = stepMover(grid, mover, want, 0.08);
      expect(canEnter(grid, Math.round(mover.col), Math.round(mover.row))).toBe(true);
    }
  });

  it("chases toward the hero and flees away from it", () => {
    const grid = parseMaze();
    const random = createRandom(3);
    const mover = { col: 7, row: 9, dirCol: 0, dirRow: 0 };
    const chase = chooseGoblinDirection(grid, mover, { col: 1, row: 9 }, random, "chase");
    expect(chase.dirCol).toBe(-1);
    const flee = chooseGoblinDirection(grid, mover, { col: 1, row: 9 }, random, "flee");
    expect(flee.dirCol).toBe(1);
  });
});

describe("sentence rounds", () => {
  it("orders rounds short to long so difficulty ramps", () => {
    expect(rounds.map((round) => round.words.length)).toEqual([3, 6, 7]);
    expect(rounds[0]!.words).toEqual(["The", "cat", "runs"]);
    expect(rounds[0]!.prompt).toBe("แมววิ่ง");
  });

  it("places one distinct corridor cell per word, clear of the hero spawn", () => {
    const grid = parseMaze();
    const cells = placeOrbs(grid, 7, 42, [HERO_SPAWN]);
    expect(cells).toHaveLength(7);
    expect(new Set(cells.map((cell) => `${cell.col}:${cell.row}`)).size).toBe(7);
    for (const cell of cells) {
      expect(canEnter(grid, cell.col, cell.row)).toBe(true);
      expect(`${cell.col}:${cell.row}`).not.toBe(`${HERO_SPAWN.col}:${HERO_SPAWN.row}`);
    }
    expect(placeOrbs(grid, 7, 42, [HERO_SPAWN])).toEqual(cells);
  });
});

describe("order rule", () => {
  it("advances only on the next correct word", () => {
    const first = collectOrb(createGameState(), rounds, 0);
    expect(first.outcome).toBe("correct");
    expect(first.state.wordIndex).toBe(1);
    expect(first.state.score).toBe(SCORE_PER_ORB);
  });

  it("penalises an out-of-order orb without advancing the sentence", () => {
    const wrong = collectOrb(createGameState(), rounds, 2);
    expect(wrong.outcome).toBe("wrong");
    expect(wrong.state.wordIndex).toBe(0);
    expect(wrong.state.correctAnswers).toBe(0);
    expect(wrong.state.totalAttempts).toBe(1);
    expect(wrong.state.score).toBe(0);
  });

  it("shows collected words and blanks the rest", () => {
    expect(sentenceProgress(rounds[0]!, 1)).toBe("The ___ ____");
  });

  it("completes a sentence and moves to the next round", () => {
    const played = playRound();
    expect(played.outcome).toBe("sentence-complete");
    expect(played.state.roundIndex).toBe(1);
    expect(played.state.wordIndex).toBe(0);
    expect(played.state.sentencesCompleted).toBe(1);
    expect(played.state.score).toBe(SCORE_PER_ORB * 3 + SCORE_PER_SENTENCE);
  });
});

describe("lives, power-up, and completion", () => {
  it("loses the run when lives are exhausted", () => {
    let state = createGameState();
    expect(state.lives).toBe(STARTING_LIVES);
    for (let life = 0; life < STARTING_LIVES; life += 1) state = loseLife(state);
    expect(state.lives).toBe(0);
    expect(state.status).toBe("lost");
    expect(loseLife(state)).toEqual(state);
  });

  it("wins after the final sentence and ignores later collections", () => {
    let state = createGameState();
    for (let round = 0; round < rounds.length; round += 1) {
      state = playRound(state).state;
    }
    expect(state.status).toBe("won");
    expect(state.sentencesCompleted).toBe(3);
    expect(collectOrb(state, rounds, 0).outcome).toBe("ignored");
  });

  it("emits a valid contract result", () => {
    let state = createGameState();
    state = collectOrb(state, rounds, 1).state;
    state = playRound(state).state;
    state = defeatGoblin(state);
    const summary = results(state);
    expect(summary).toEqual({
      accuracy: 0.75,
      xp: 55,
      score: SCORE_PER_ORB * 3 + SCORE_PER_SENTENCE + 150,
      correctAnswers: 3,
      totalAttempts: 4,
    });
    expect(Number.isInteger(summary.xp)).toBe(true);
    expect(Number.isInteger(summary.score)).toBe(true);
    expect(summary.accuracy).toBeGreaterThanOrEqual(0);
    expect(summary.accuracy).toBeLessThanOrEqual(1);
  });
});
