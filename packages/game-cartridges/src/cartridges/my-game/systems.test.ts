import { describe, expect, it } from "vitest";
import { answer, createGameState, results } from "./systems";
import { buildDeck, sampleSessionDeck } from "./data/words";
import { WordAccumulator, GOALS_PER_ROUND } from "./systems/WordAccumulator";
import { MineGrid } from "./systems/MineGrid";
import { seededRng } from "./systems/LetterBag";
import { GameState, WIN_GOAL, MAX_HEALTH, HIT_INVULNERABILITY_MS, WORD_INVULNERABILITY_MS } from "./systems/GameState";
import { buildLaserSchedule, LaserScheduler, hitsPoint, isGuiding, sweepOffset } from "./systems/LaserSystem";

describe("starter educational loop", () => {
  it("records attempts and produces valid results", () => {
    const state = answer(answer(createGameState(), true, 2), false, 2);
    expect(results(state)).toEqual({ accuracy: 0.5, xp: 0, score: 100, correctAnswers: 1, totalAttempts: 2 });
  });
});

describe("buildDeck", () => {
  it("builds 20 words with 10 easy (4-letter) and 10 hard (5-letter)", () => {
    const deck = buildDeck([]);
    expect(deck).toHaveLength(20);
    expect(deck.filter((w) => w.difficulty === "easy")).toHaveLength(10);
    expect(deck.filter((w) => w.difficulty === "hard")).toHaveLength(10);
    for (const w of deck) expect(w.letters.length).toBeGreaterThanOrEqual(4);
  });

  it("merges context.input terms first and fills the remainder from fallback", () => {
    const input = [
      { term: "rock", translation: "หิน" },
      { term: "light", translation: "แสง" },
    ];
    const deck = buildDeck(input);
    const rock = deck.find((w) => w.text === "ROCK");
    const light = deck.find((w) => w.text === "LIGHT");
    expect(rock?.fromInput).toBe(true);
    expect(rock?.thai).toBe("หิน");
    expect(light?.fromInput).toBe(true);
    expect(deck.filter((w) => w.fromInput).length).toBeGreaterThanOrEqual(2);
  });
});

describe("sampleSessionDeck", () => {
  it("draws 10 words with 5 easy and 5 hard from the full pool", () => {
    const pool = buildDeck([]);
    const deck = sampleSessionDeck(pool, seededRng("session-a"));
    expect(deck).toHaveLength(10);
    expect(deck.filter((w) => w.difficulty === "easy")).toHaveLength(5);
    expect(deck.filter((w) => w.difficulty === "hard")).toHaveLength(5);
  });

  it("mixes easy and hard words in the session deck", () => {
    const pool = buildDeck([]);
    const deck = sampleSessionDeck(pool, seededRng("session-mix"));
    const easy = deck.filter((w) => w.difficulty === "easy").length;
    const hard = deck.length - easy;
    expect(easy).toBeGreaterThan(0);
    expect(hard).toBeGreaterThan(0);
  });

  it("draws different words for different seeds", () => {
    const pool = buildDeck([]);
    const a = sampleSessionDeck(pool, seededRng("one"));
    const b = sampleSessionDeck(pool, seededRng("two"));
    expect(a.map((w) => w.text).join(",")).not.toBe(b.map((w) => w.text).join(","));
  });
});

describe("WordAccumulator", () => {
  it("completes only a selected goal once its exact letters are collected", () => {
    const deck = buildDeck([]);
    const easy = deck.filter((w) => w.difficulty === "easy")[0]!;
    const acc = new WordAccumulator([easy]);
    acc.rotate();
    // Without a selection nothing completes.
    let done: string | null = null;
    for (const letter of easy.letters) {
      done = acc.add(letter)?.text ?? null;
    }
    expect(done).toBeNull();
    expect(acc.wordsCompleted).toBe(0);
    // Select the goal; it is already fully collected, so it clears instantly.
    expect(acc.select(easy.text)).toBe(true);
    expect(acc.tryCompleteSelection()?.text).toBe(easy.text);
    expect(acc.wordsCompleted).toBe(1);
  });

  it("does not clear words the player never selected, even when fully collected", () => {
    const deck = buildDeck([]);
    const easy = deck.filter((w) => w.difficulty === "easy")[0]!;
    const hard = deck.filter((w) => w.difficulty === "hard")[0]!;
    const acc = new WordAccumulator([easy, hard]);
    acc.rotate();
    acc.select(easy.text);
    // Collect every letter of the OTHER word; it is not selected, so nothing clears.
    let done = null;
    for (const letter of hard.letters) {
      done = acc.add(letter);
    }
    expect(done).toBeNull();
    expect(acc.wordsCompleted).toBe(0);
    // Selecting that word now completes it because its letters are all present.
    expect(acc.select(hard.text)).toBe(true);
    expect(acc.tryCompleteSelection()?.text).toBe(hard.text);
  });

  it("starts rounds with GOALS_PER_ROUND active words and drops cleared ones", () => {
    const deck = buildDeck([]);
    const acc = new WordAccumulator(deck);
    acc.rotate();
    expect(acc.goals()).toHaveLength(GOALS_PER_ROUND);
    const first = acc.goals()[0];
    acc.select(first.text);
    for (const letter of first.letters) acc.add(letter);
    expect(acc.clearedWords()).toContain(first);
    expect(acc.goals()).not.toContain(first);
  });

  it("keeps partially spelled words in the next round's goals", () => {
    const deck = buildDeck([]);
    const acc = new WordAccumulator(deck);
    acc.rotate();
    const first = acc.goals()[0];
    acc.add(first.letters[0]); // partial progress, never selected
    acc.rotate();
    expect(acc.goals()).toContain(first);
  });

  it("never exceeds GOALS_PER_ROUND active goals", () => {
    const deck = buildDeck([]);
    const acc = new WordAccumulator(deck);
    for (let r = 0; r < 3; r++) {
      acc.rotate();
      expect(acc.goals().length).toBeLessThanOrEqual(GOALS_PER_ROUND);
    }
  });
});

describe("MineGrid", () => {
  it("scatters letters and digs each cell through two layers", () => {
    const grid = new MineGrid(5, 5);
    const rng = seededRng("test");
    const placed = grid.scatter([{ letter: "A", difficulty: "easy" }, { letter: "B", difficulty: "hard" }], rng);
    expect(placed).toHaveLength(2);
    const cell = placed[0];
    // First dig breaks the stone and reveals the gem; the letter stays hidden.
    const first = grid.dig(cell.x, cell.y);
    expect(first?.type).toBe("reveal");
    expect(cell.state).toBe("gem");
    // Second dig pops the hidden letter and empties the cell.
    const second = grid.dig(cell.x, cell.y);
    expect(second?.type).toBe("letter");
    if (second?.type === "letter") expect(second.letter).toBeTruthy();
    expect(cell.state).toBe("dug");
    // Already dug: nothing more to mine.
    expect(grid.dig(cell.x, cell.y)).toBeNull();
  });

  it("digs an empty cell in a single hit", () => {
    const grid = new MineGrid(3, 3);
    expect(grid.dig(0, 0)?.type).toBe("empty");
    expect(grid.at(0, 0)?.state).toBe("dug");
  });
});

describe("GameState", () => {
  it("starts with 15 HP and applies a single-point hit with invulnerability", () => {
    const deck = buildDeck([]);
    const state = new GameState(deck);
    expect(state.health).toBe(MAX_HEALTH);
    expect(state.takeHit(0)).toBe(true);
    expect(state.health).toBe(MAX_HEALTH - 1);
    expect(state.takeHit(10)).toBe(false);
    expect(state.takeHit(HIT_INVULNERABILITY_MS + 1)).toBe(true);
  });

  it("grants 10s aura after completing a word", () => {
    const deck = buildDeck([]);
    const easy = deck.filter((w) => w.difficulty === "easy")[0]!;
    const state = new GameState([easy]);
    state.startFirstRound();
    state.selectWord(easy.text);
    for (const letter of easy.letters) state.collectLetter(letter, 150);
    expect(state.isWordAuraActive(200)).toBe(true);
    expect(state.isWordAuraActive(150 + WORD_INVULNERABILITY_MS + 1)).toBe(false);
  });

  it("wins after 10 words and reports a valid result contract", () => {
    const deck = buildDeck([]);
    const state = new GameState(deck);
    state.startFirstRound();
    let t = 0;
    for (let i = 0; i < WIN_GOAL; i++) {
      const goal = state.goals()[0];
      state.selectWord(goal.text);
      for (const letter of goal.letters) {
        t += 1;
        state.collectLetter(letter, t);
      }
      if (state.wordsCompleted >= WIN_GOAL) break;
    }
    expect(state.hasWon()).toBe(true);
    const r = state.results();
    expect(r.accuracy).toBeGreaterThanOrEqual(0);
    expect(r.accuracy).toBeLessThanOrEqual(1);
    expect(r.score).toBeGreaterThan(0);
    expect(r.correctAnswers).toBe(WIN_GOAL);
    expect(r.totalAttempts).toBeGreaterThanOrEqual(WIN_GOAL);
  });

  it("only reports fully spelled words as cleared", () => {
    const deck = buildDeck([]);
    const state = new GameState(deck);
    state.startFirstRound();
    const w = state.goals()[0];
    // A single collected letter is NOT a met word.
    expect(state.collectLetter(w.letters[0], 1)).toBeNull();
    expect(state.clearedWords()).toHaveLength(0);
    // Select it and finish spelling it.
    state.selectWord(w.text);
    for (let i = 0; i < w.letters.length; i++) state.collectLetter(w.letters[i], 10 + i);
    expect(state.clearedWords()).toContain(w);
  });

  it("rotates goals: keeps partially spelled words and never returns cleared words", () => {
    const deck = buildDeck([]);
    const state = new GameState(deck);
    state.startFirstRound();
    const round1 = state.goals();
    expect(round1).toHaveLength(10);

    const done = round1[0];
    state.selectWord(done.text);
    for (let i = 0; i < done.letters.length; i++) state.collectLetter(done.letters[i], 10 + i);
    expect(state.clearedWords()).toContain(done);

    const partial = round1[1];
    state.collectLetter(partial.letters[0], 30);

    state.rotateGoals();
    const round2 = state.goals();
    expect(round2).toHaveLength(10);
    expect(round2).not.toContain(done);
    expect(round2).toContain(partial);
  });
});

describe("LaserSystem", () => {
  it("schedules guide before fire and intervals of 2/3/4 seconds", () => {
    const events = buildLaserSchedule(6, 0, seededRng("laser"));
    expect(events).toHaveLength(6);
    for (const ev of events) {
      expect(ev.guideStart).toBeLessThan(ev.fireStart);
      expect(ev.fireStart).toBeLessThan(ev.end);
    }
    for (let i = 1; i < events.length; i++) {
      const gap = events[i].guideStart - events[i - 1].guideStart;
      expect([2000, 3000, 4000]).toContain(gap);
    }
    expect(isGuiding(events[0], events[0].guideStart + 100)).toBe(true);
  });

  it("hits a point that the sweeping beam passes through", () => {
    const rng = seededRng("beam");
    const events = buildLaserSchedule(20, 0, rng);
    const ev = events.find((e) => e.direction === "vertical")!;
    const offset = sweepOffset(ev, ev.fireStart + 10);
    expect(offset).not.toBeNull();
    expect(hitsPoint(ev, ev.fireStart + 10, offset ?? 0, 0.5, 0.05)).toBe(true);
  });

  it("keeps generating lasers indefinitely, far beyond any fixed count", () => {
    const scheduler = new LaserScheduler(seededRng("endless"), 0);
    let t = 0;
    for (let i = 0; i < 50; i++) {
      t += 60000; // jump ahead one minute at a time
      scheduler.ensureUpTo(t);
      const active = scheduler.activeAt(t);
      expect(active.length).toBeGreaterThan(0);
    }
    // Events remain correctly ordered and non-overlapping in time.
    const all = scheduler.activeAt(t);
    for (let i = 1; i < all.length; i++) {
      expect(all[i].guideStart).toBeGreaterThan(all[i - 1].end);
    }
  });
});
