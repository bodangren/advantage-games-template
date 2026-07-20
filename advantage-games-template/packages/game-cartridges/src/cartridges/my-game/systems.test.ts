import { describe, expect, it } from "vitest";
import {
  createGameState,
  shoot,
  shootObstacle,
  tick,
  results,
  targetTranslation,
  gridLayout,
  comboScore,
  comboTier,
  wordResults,
  TIMER_SECONDS,
  TIME_BONUS_PER_HIT,
  BOMB_TIME_PENALTY,
} from "./systems";
import type { VocabularyItem } from "@reading-advantage/game-contracts";

const input: VocabularyItem[] = [
  { term: "courage", translation: "ความกล้าหาญ" },
  { term: "journey", translation: "การเดินทาง" },
  { term: "protect", translation: "ปกป้อง" },
];

function shootUntilDead(s: ReturnType<typeof createGameState>, monsterId: number) {
  let state = s;
  for (let i = 0; i < 3; i++) {
    const m = state.monsters.find((x) => x.id === monsterId);
    if (!m || !m.alive) break;
    state = shoot(state, monsterId);
  }
  return state;
}

describe("createGameState", () => {
  it("creates all monsters alive with one target", () => {
    const s = createGameState(input, 42);
    expect(s.monsters).toHaveLength(3);
    expect(s.monsters.filter((m) => m.alive)).toHaveLength(3);
    expect(s.monsters.filter((m) => m.isTarget)).toHaveLength(1);
    expect(s.completed).toBe(false);
    expect(s.gameOver).toBe(false);
    expect(s.combo).toBe(0);
    expect(s.timeLeft).toBe(TIMER_SECONDS);
  });

  it("creates obstacles", () => {
    const s = createGameState(input, 42);
    expect(s.obstacles.length).toBeGreaterThanOrEqual(2);
    expect(s.obstacles.filter((o) => o.type === "bomb").length).toBeGreaterThanOrEqual(2);
    expect(s.obstacles.filter((o) => o.type === "bat").length).toBeGreaterThanOrEqual(1);
  });

  it("is deterministic with same seed", () => {
    const a = createGameState(input, 7);
    const b = createGameState(input, 7);
    expect(a.monsters.map((m) => m.gridIndex)).toEqual(b.monsters.map((m) => m.gridIndex));
    expect(a.obstacles.length).toBe(b.obstacles.length);
  });
});

describe("comboScore", () => {
  it("returns 100 for combo 0", () => { expect(comboScore(0)).toBe(100); });
  it("returns 125 for combo 1", () => { expect(comboScore(1)).toBe(125); });
  it("caps at 300 for combo 10+", () => { expect(comboScore(10)).toBe(300); });
});

describe("comboTier", () => {
  it("returns normal for 0-2", () => { expect(comboTier(0)).toBe("normal"); expect(comboTier(2)).toBe("normal"); });
  it("returns good for 3-4", () => { expect(comboTier(3)).toBe("good"); });
  it("returns great for 5-9", () => { expect(comboTier(5)).toBe("great"); });
  it("returns incredible for 10+", () => { expect(comboTier(10)).toBe("incredible"); });
});

describe("shoot", () => {
  it("kills non-shield target and increments combo", () => {
    let s = createGameState(input, 42);
    const target = s.monsters.find((m) => m.isTarget)!;
    if (target.type === "shield") {
      s = shootUntilDead(s, target.id);
    } else {
      s = shoot(s, target.id);
    }
    const killed = s.monsters.find((m) => m.id === target.id)!;
    expect(killed.alive).toBe(false);
    expect(s.combo).toBeGreaterThanOrEqual(1);
    expect(s.correctAnswers).toBeGreaterThanOrEqual(1);
  });

  it("resets combo on wrong shot", () => {
    let s = createGameState(input, 42);
    const target = s.monsters.find((m) => m.isTarget)!;
    s = shootUntilDead(s, target.id);
    expect(s.combo).toBeGreaterThanOrEqual(1);
    const wrong = s.monsters.find((m) => m.alive && !m.isTarget)!;
    s = shoot(s, wrong.id);
    expect(s.combo).toBe(0);
  });

  it("adds time bonus on correct kill", () => {
    let s = createGameState(input, 42);
    s = { ...s, timeLeft: TIMER_SECONDS - 5 };
    const target = s.monsters.find((m) => m.isTarget)!;
    s = shootUntilDead(s, target.id);
    expect(s.timeLeft).toBeGreaterThanOrEqual(TIMER_SECONDS - 5 + TIME_BONUS_PER_HIT);
  });

  it("ignores shots when gameOver", () => {
    let s = createGameState(input, 42);
    s = { ...s, gameOver: true };
    expect(shoot(s, 0)).toBe(s);
  });

  it("completes when all dead", () => {
    let s = createGameState(input, 42);
    for (const m of s.monsters) {
      s = shootUntilDead(s, m.id);
    }
    expect(s.completed).toBe(true);
  });

  it("tracks answeredCorrectly for non-shield", () => {
    let s = createGameState(input, 42);
    const target = s.monsters.find((m) => m.isTarget)!;
    if (target.type === "shield") {
      s = shootUntilDead(s, target.id);
    } else {
      s = shoot(s, target.id);
    }
    expect(s.monsters.find((m) => m.id === target.id)!.answeredCorrectly).toBe(true);
  });

  it("shield monster takes 2 hits", () => {
    let s = createGameState(input, 42);
    const shield = s.monsters.find((m) => m.type === "shield");
    if (!shield) return;
    s = { ...s, monsters: s.monsters.map((m) => m.id === shield.id ? { ...m, isTarget: true } : m) };
    const first = shoot(s, shield.id);
    expect(first.monsters.find((m) => m.id === shield.id)!.alive).toBe(true);
    const second = shoot(first, shield.id);
    expect(second.monsters.find((m) => m.id === shield.id)!.alive).toBe(false);
  });
});

describe("shootObstacle", () => {
  it("bomb resets combo and penalizes time", () => {
    let s = createGameState(input, 42);
    s = { ...s, combo: 5, timeLeft: 20 };
    const bomb = s.obstacles.find((o) => o.type === "bomb")!;
    const next = shootObstacle(s, bomb.id);
    expect(next.combo).toBe(0);
    expect(next.timeLeft).toBe(20 - BOMB_TIME_PENALTY);
    expect(next.obstacles.find((o) => o.id === bomb.id)!.alive).toBe(false);
  });

  it("bomb does not affect score or attempts", () => {
    let s = createGameState(input, 42);
    const bomb = s.obstacles.find((o) => o.type === "bomb")!;
    const next = shootObstacle(s, bomb.id);
    expect(next.score).toBe(s.score);
    expect(next.totalAttempts).toBe(s.totalAttempts);
  });

  it("bat returns state unchanged", () => {
    let s = createGameState(input, 42);
    const bat = s.obstacles.find((o) => o.type === "bat")!;
    const next = shootObstacle(s, bat.id);
    expect(next).toBe(s);
  });

  it("dead obstacle returns state unchanged", () => {
    let s = createGameState(input, 42);
    const bomb = s.obstacles.find((o) => o.type === "bomb")!;
    s = shootObstacle(s, bomb.id);
    expect(shootObstacle(s, bomb.id)).toBe(s);
  });
});

describe("tick", () => {
  it("decrements timeLeft", () => {
    let s = createGameState(input, 42);
    s = tick(s);
    expect(s.timeLeft).toBe(TIMER_SECONDS - 1);
  });

  it("sets gameOver when timeLeft hits 0", () => {
    let s = createGameState(input, 42);
    s = { ...s, timeLeft: 1 };
    s = tick(s);
    expect(s.timeLeft).toBe(0);
    expect(s.gameOver).toBe(true);
  });

  it("does not tick when completed", () => {
    let s = createGameState(input, 42);
    s = { ...s, completed: true };
    expect(tick(s)).toBe(s);
  });
});

describe("results", () => {
  it("calculates accuracy correctly", () => {
    let s = createGameState(input, 42);
    const target1 = s.monsters.find((m) => m.isTarget)!;
    s = shootUntilDead(s, target1.id);
    const wrong = s.monsters.find((m) => m.alive && !m.isTarget)!;
    s = shoot(s, wrong.id);
    const target2 = s.monsters.find((m) => m.isTarget)!;
    s = shootUntilDead(s, target2.id);
    const target3 = s.monsters.find((m) => m.isTarget)!;
    s = shootUntilDead(s, target3.id);
    const r = results(s);
    expect(r.correctAnswers).toBe(3);
    expect(r.totalAttempts).toBeGreaterThanOrEqual(4);
  });

  it("returns zeros for fresh state", () => {
    const r = results(createGameState(input));
    expect(r.accuracy).toBe(0);
    expect(r.score).toBe(0);
  });
});

describe("wordResults", () => {
  it("returns per-word results", () => {
    let s = createGameState(input, 42);
    const target = s.monsters.find((m) => m.isTarget)!;
    s = shootUntilDead(s, target.id);
    const wr = wordResults(s);
    expect(wr.find((w) => w.term === target.term)!.correct).toBe(true);
  });
});

describe("targetTranslation", () => {
  it("returns current target translation", () => {
    const s = createGameState(input, 42);
    const target = s.monsters.find((m) => m.isTarget)!;
    expect(targetTranslation(s)).toBe(target.translation);
  });

  it("returns null when completed", () => {
    let s = createGameState(input, 42);
    for (const m of s.monsters) s = shootUntilDead(s, m.id);
    expect(targetTranslation(s)).toBeNull();
  });
});

describe("gridLayout", () => {
  it("compact: 1 col for <=2, 2 for <=6, 3 for >6", () => {
    expect(gridLayout(1, true)).toEqual({ cols: 1, rows: 1 });
    expect(gridLayout(4, true)).toEqual({ cols: 2, rows: 2 });
    expect(gridLayout(8, true)).toEqual({ cols: 3, rows: 3 });
  });

  it("wide: 2 cols for <=4, 3 for <=9, 4 for >9", () => {
    expect(gridLayout(3, false)).toEqual({ cols: 2, rows: 2 });
    expect(gridLayout(6, false)).toEqual({ cols: 3, rows: 2 });
    expect(gridLayout(12, false)).toEqual({ cols: 4, rows: 3 });
  });
});
