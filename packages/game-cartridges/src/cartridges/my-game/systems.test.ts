import { describe, expect, it } from "vitest";
import {
  createGameState,
  processShot,
  advanceLevel,
  applyUpgrade,
  results,
  getBossIndices,
  getCorrectLane,
  getBossLabels,
  getDifficulty,
  getGigyCount,
  getBossMaxHP,
  SHIELD_MAX,
  SHIELD_DAMAGE,
  TOTAL_LEVELS,
  DISTRACTOR_MAP,
  BOSS_SCALES,
} from "./systems";
import type { VocabularyItem } from "@reading-advantage/game-contracts";

const MOCK_VOCABULARY: VocabularyItem[] = [
  { term: "DOCTOR", translation: "บุคคลสวมชุดขาว ทำงานตรวจรักษาผู้ป่วยในโรงพยาบาล" },
  { term: "POLICE", translation: "ผู้พิทักษ์สันติราษฎร์ สวมเครื่องแบบ คอยจับผู้ร้ายและจัดระเบียบเมือง" },
  { term: "HAPPY", translation: "อารมณ์สดใส ยิ้มกว้าง มีความสุขเมื่อได้ทำสิ่งที่ชอบ" },
  { term: "TIRED", translation: "ความรู้สึกอยากหลับตาพักผ่อนหลังเล่นกีฬาหรือทำงานมาเหนื่อยๆ" },
  { term: "CLOUD", translation: "กลุ่มก้อนปุยขาวลอยอยู่บนท้องฟ้า ยามฝนตกจะเปลี่ยนเป็นสีเทาเข้ม" },
  { term: "RIVER", translation: "สายน้ำยาวไหลผ่านหุบเขาและหมู่บ้าน เป็นที่อยู่อาศัยของปลา" },
  { term: "BUTTERFLY", translation: "แมลงปีกสวยงาม คอยบินตอมดมเกสรดอกไม้ตามสวนธรรมชาติ" },
  { term: "AIRPLANE", translation: "พาหนะบินได้ขนาดใหญ่พานักท่องเที่ยวข้ามทวีปผ่านกลีบเมฆ" },
  { term: "SUNNY", translation: "อากาศร้อนจัด มีแดดแรง ท้องฟ้าเปิดแจ่มใส เหมาะแก่การไปทะเล" },
  { term: "PLAYGROUND", translation: "สถานที่กว้างขวาง เต็มไปด้วยเครื่องเล่นสนุกๆ และสายไหมหวานฉ่ำ" },
];

describe("getBossIndices", () => {
  it("returns 3 unique boss indices for each level", () => {
    for (let level = 0; level < TOTAL_LEVELS; level++) {
      const indices = getBossIndices(level);
      expect(indices).toHaveLength(3);
      for (const idx of indices) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(10);
      }
    }
  });

  it("does not duplicate indices within a level", () => {
    for (let level = 0; level < TOTAL_LEVELS; level++) {
      const indices = getBossIndices(level);
      expect(new Set(indices).size).toBe(3);
    }
  });
});

describe("getCorrectLane", () => {
  it("returns 0, 1, or 2 for every level", () => {
    for (let level = 0; level < TOTAL_LEVELS; level++) {
      const lane = getCorrectLane(level);
      expect(lane).toBeGreaterThanOrEqual(0);
      expect(lane).toBeLessThan(3);
    }
  });

  it("distributes across all 3 lanes", () => {
    const counts = [0, 0, 0];
    for (let level = 0; level < TOTAL_LEVELS; level++) {
      counts[getCorrectLane(level)]++;
    }
    expect(counts[0]).toBeGreaterThan(0);
    expect(counts[1]).toBeGreaterThan(0);
    expect(counts[2]).toBeGreaterThan(0);
  });
});

describe("getBossLabels", () => {
  it("returns 3 labels with exactly one correct term", () => {
    for (let level = 0; level < MOCK_VOCABULARY.length; level++) {
      const labels = getBossLabels(MOCK_VOCABULARY, level);
      expect(labels).toHaveLength(3);
      const correctTerm = MOCK_VOCABULARY[level]!.term;
      const correctCount = labels.filter((l) => l === correctTerm).length;
      expect(correctCount).toBe(1);
    }
  });

  it("fills distractor slots with words from DISTRACTOR_MAP", () => {
    for (let level = 0; level < MOCK_VOCABULARY.length; level++) {
      const labels = getBossLabels(MOCK_VOCABULARY, level);
      const correctTerm = MOCK_VOCABULARY[level]!.term;
      const distractors = DISTRACTOR_MAP[correctTerm]!;
      for (const label of labels) {
        if (label !== correctTerm) {
          expect(distractors).toContain(label);
        }
      }
    }
  });
});

describe("createGameState", () => {
  it("initializes with correct defaults", () => {
    const state = createGameState(MOCK_VOCABULARY);
    expect(state.currentLevel).toBe(0);
    expect(state.levelType).toBe("boss");
    expect(state.shieldHP).toBe(SHIELD_MAX);
    expect(state.score).toBe(0);
    expect(state.correctAnswers).toBe(0);
    expect(state.totalAttempts).toBe(0);
    expect(state.completed).toBe(false);
    expect(state.gameOver).toBe(false);
    expect(state.upgrade).toBe("none");
    expect(state.bossHP).toHaveLength(3);
    expect(state.chainTriggered).toBe(false);
  });

  it("sets boss HP based on level difficulty", () => {
    const state = createGameState(MOCK_VOCABULARY);
    expect(state.bossMaxHP).toBe(5); // level 0 → 5 hits
    expect(state.bossHP).toEqual([5, 5, 5]);
  });
});

describe("processShot", () => {
  it("correct shot at boss with full HP reduces HP by 1", () => {
    const state = createGameState(MOCK_VOCABULARY);
    const correctLane = state.correctLane;
    const { state: newState, correct } = processShot(state, correctLane);
    expect(correct).toBe(true);
    expect(newState.bossHP[correctLane]).toBe(state.bossMaxHP - 1);
  });

  it("correct shot that defeats boss triggers chain", () => {
    const state = createGameState(MOCK_VOCABULARY);
    const correctLane = state.correctLane;
    // Drain boss HP to 1
    let s = { ...state, bossHP: [...state.bossHP] } as typeof state;
    const hpArr = [...s.bossHP] as number[];
    hpArr[correctLane] = 1;
    s = { ...s, bossHP: hpArr as readonly number[] };
    const { state: newState, correct } = processShot(s, correctLane);
    expect(correct).toBe(true);
    expect(newState.chainTriggered).toBe(true);
    expect(newState.bossHP[correctLane]).toBe(0);
    expect(newState.score).toBeGreaterThan(0);
  });

  it("incorrect shot damages boss but no shield penalty", () => {
    const state = createGameState(MOCK_VOCABULARY);
    const wrongLane = (state.correctLane + 1) % 3;
    const { state: newState, correct } = processShot(state, wrongLane);
    expect(correct).toBe(false);
    expect(newState.shieldHP).toBe(SHIELD_MAX);
    expect(newState.bossHP[wrongLane]).toBe(state.bossMaxHP - 1);
  });

  it("shield reduces when wrong boss is destroyed", () => {
    const state = createGameState(MOCK_VOCABULARY);
    const wrongLane = (state.correctLane + 1) % 3;
    const bossHP = [...state.bossHP] as number[];
    bossHP[wrongLane] = 1;
    let s = { ...state, bossHP } as typeof state;
    const { state: newState, correct } = processShot(s, wrongLane);
    expect(correct).toBe(false);
    expect(newState.shieldHP).toBe(SHIELD_MAX - SHIELD_DAMAGE);
    expect(newState.bossHP[wrongLane]).toBe(state.bossMaxHP);
  });

  it("game over when shield HP reaches 0", () => {
    const state = createGameState(MOCK_VOCABULARY);
    const wrongLane = (state.correctLane + 1) % 3;
    const bossHP = [...state.bossHP] as number[];
    bossHP[wrongLane] = 1;
    let s = { ...state, shieldHP: SHIELD_DAMAGE, bossHP } as typeof state;
    const { state: newState, correct } = processShot(s, wrongLane);
    expect(correct).toBe(false);
    expect(newState.shieldHP).toBe(0);
    expect(newState.gameOver).toBe(true);
  });

  it("does nothing when game is already completed", () => {
    let state = createGameState(MOCK_VOCABULARY);
    state = { ...state, completed: true };
    const { state: newState } = processShot(state, state.correctLane);
    expect(newState).toBe(state);
  });

  it("does nothing when game is over", () => {
    let state = createGameState(MOCK_VOCABULARY);
    state = { ...state, gameOver: true };
    const { state: newState } = processShot(state, state.correctLane);
    expect(newState).toBe(state);
  });

  it("does nothing when chain is already triggered", () => {
    let state = createGameState(MOCK_VOCABULARY);
    state = { ...state, chainTriggered: true };
    const { state: newState } = processShot(state, state.correctLane);
    expect(newState).toBe(state);
  });

  it("increments totalAttempts", () => {
    const state = createGameState(MOCK_VOCABULARY);
    const { state: s1 } = processShot(state, state.correctLane);
    expect(s1.totalAttempts).toBe(1);
    const wrongLane = (state.correctLane + 1) % 3;
    const { state: s2 } = processShot(s1, wrongLane);
    expect(s2.totalAttempts).toBe(2);
  });
});

describe("advanceLevel", () => {
  it("boss level → gigy-wave with same currentLevel", () => {
    const state = createGameState(MOCK_VOCABULARY);
    expect(state.levelType).toBe("boss");
    const next = advanceLevel(state);
    expect(next.currentLevel).toBe(0);
    expect(next.levelType).toBe("gigy-wave");
    expect(next.chainTriggered).toBe(false);
  });

  it("gigy-wave → next boss level with incremented level", () => {
    let state = createGameState(MOCK_VOCABULARY);
    state = advanceLevel(state); // → gigy-wave
    expect(state.levelType).toBe("gigy-wave");
    const next = advanceLevel(state); // → boss level 1
    expect(next.currentLevel).toBe(1);
    expect(next.levelType).toBe("boss");
    expect(next.bossMaxHP).toBe(5);
    expect(next.bossHP).toEqual([5, 5, 5]);
  });

  it("marks completed after all boss levels + gigy waves", () => {
    let state = createGameState(MOCK_VOCABULARY);
    // 10 boss levels + 10 gigy waves = 20 advances
    for (let i = 0; i < TOTAL_LEVELS * 2; i++) {
      state = advanceLevel(state);
    }
    expect(state.completed).toBe(true);
  });

  it("increases difficulty after level 3 boss", () => {
    let state = createGameState(MOCK_VOCABULARY);
    // boss0 → gigy0 → boss1 → gigy1 → boss2 → gigy2 → boss3 → gigy3 → boss4
    for (let i = 0; i < 8; i++) {
      state = advanceLevel(state);
    }
    expect(state.levelType).toBe("boss");
    expect(state.currentLevel).toBe(4);
    expect(state.bossMaxHP).toBe(15);
    expect(state.gigyCount).toBe(9);
  });
});

describe("applyUpgrade", () => {
  it("sets weapon upgrade for doubleshot/laser", () => {
    const state = createGameState(MOCK_VOCABULARY);
    expect(applyUpgrade(state, "doubleshot").upgrade).toBe("doubleshot");
    expect(applyUpgrade(state, "laser").upgrade).toBe("laser");
  });
  it("fire rate stacks up to 2", () => {
    const state = createGameState(MOCK_VOCABULARY);
    const s1 = applyUpgrade(state, "firerate");
    expect(s1.fireRateStacks).toBe(1);
    expect(s1.upgrade).toBe("none");
    const s2 = applyUpgrade(s1, "firerate");
    expect(s2.fireRateStacks).toBe(2);
    const s3 = applyUpgrade(s2, "firerate");
    expect(s3.fireRateStacks).toBe(2);
  });
});

describe("results", () => {
  it("produces valid GameResults with 0 attempts", () => {
    const state = createGameState(MOCK_VOCABULARY);
    const r = results(state);
    expect(r.accuracy).toBe(0);
    expect(r.xp).toBe(0);
    expect(r.score).toBe(0);
    expect(r.correctAnswers).toBe(0);
    expect(r.totalAttempts).toBe(0);
  });

  it("produces valid GameResults with mixed attempts", () => {
    let state = createGameState(MOCK_VOCABULARY);
    // Correctly defeat boss (5 hits at correct lane), with 1 miss in between
    const { state: s1 } = processShot(state, state.correctLane); // hit 1
    const wrongLane = (state.correctLane + 1) % 3;
    const { state: s2 } = processShot(s1, wrongLane); // miss
    const { state: s3 } = processShot(s2, s2.correctLane); // hit 2
    const { state: s4 } = processShot(s3, s3.correctLane); // hit 3
    const { state: s5 } = processShot(s4, s4.correctLane); // hit 4
    const { state: s6 } = processShot(s5, s5.correctLane); // hit 5 — boss defeated
    expect(s6.chainTriggered).toBe(true);
    expect(s6.correctAnswers).toBe(1);
    expect(s6.totalAttempts).toBe(6);
    const r = results(s6);
    expect(r.accuracy).toBeCloseTo(1 / 6);
    expect(r.correctAnswers).toBe(1);
    expect(r.totalAttempts).toBe(6);
    expect(r.score).toBeGreaterThan(0);
  });

  it("accuracy is between 0 and 1", () => {
    const state = createGameState(MOCK_VOCABULARY);
    const r = results(state);
    expect(r.accuracy).toBeGreaterThanOrEqual(0);
    expect(r.accuracy).toBeLessThanOrEqual(1);
  });
});

describe("getDifficulty", () => {
  it("starts at 1.0 and ends at 2.0", () => {
    expect(getDifficulty(0)).toBeCloseTo(1.0);
    expect(getDifficulty(9)).toBeCloseTo(2.0);
  });
});

describe("getGigyCount", () => {
  it("returns 5 for levels 0-1", () => {
    expect(getGigyCount(0)).toBe(5);
    expect(getGigyCount(1)).toBe(5);
  });
  it("returns 7 for levels 2-3", () => {
    expect(getGigyCount(2)).toBe(7);
    expect(getGigyCount(3)).toBe(7);
  });
  it("returns 9 for levels 4-5", () => {
    expect(getGigyCount(4)).toBe(9);
    expect(getGigyCount(5)).toBe(9);
  });
  it("returns 15 for levels 8-9", () => {
    expect(getGigyCount(8)).toBe(15);
    expect(getGigyCount(9)).toBe(15);
  });
});

describe("BOSS_SCALES", () => {
  it("has exactly 10 entries", () => {
    expect(BOSS_SCALES).toHaveLength(10);
  });
  it("all values are between 0.8 and 1.2", () => {
    for (const s of BOSS_SCALES) {
      expect(s).toBeGreaterThan(0.8);
      expect(s).toBeLessThan(1.2);
    }
  });
});
