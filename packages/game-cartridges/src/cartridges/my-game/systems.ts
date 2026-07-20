import type { GameResults, VocabularyItem } from "@reading-advantage/game-contracts";

/** Upgrade type the player can select after a correct chain explosion. */
export type UpgradeType = "none" | "firerate" | "doubleshot" | "laser";

/** Distractor map — each term maps to two distractor English words. */
export const DISTRACTOR_MAP: Record<string, readonly string[]> = {
  DOCTOR: ["TEACHER", "POLICE"],
  POLICE: ["DENTIST", "SOLDIER"],
  HAPPY: ["ANGRY", "SAD"],
  TIRED: ["SLEEPY", "HUNGRY"],
  CLOUD: ["RIVER", "STONE"],
  RIVER: ["OCEAN", "POND"],
  BUTTERFLY: ["SPIDER", "DRAGONFLY"],
  AIRPLANE: ["HELICOPTER", "ROCKET"],
  SUNNY: ["RAINY", "WINDY"],
  PLAYGROUND: ["LIBRARY", "HOSPITAL"],
};

/** Boss image index assignments per level (0-indexed into Boss1–Boss10). */
const BOSS_ASSIGNMENTS: readonly (readonly number[])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [9, 0, 1],
  [2, 3, 4],
  [5, 6, 7],
  [8, 9, 0],
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

/** Scale multipliers for each boss image (slight size variation). */
export const BOSS_SCALES: readonly number[] = [
  1.0, 0.95, 1.05, 0.9, 1.1, 0.92, 1.08, 0.88, 1.12, 0.97,
];

/** Total number of boss levels in the game. */
export const TOTAL_LEVELS = 10;

/** Max shield HP. */
export const SHIELD_MAX = 100;

/** Shield damage per incorrect answer (percentage points). */
export const SHIELD_DAMAGE = 15;

/** Level type — boss fight or gigy wave. */
export type LevelType = "boss" | "gigy-wave";

/** Total number of boss levels in the game. */
export const TOTAL_BOSS_LEVELS = 10;

/**
 * Complete game state kept independent from Phaser rendering.
 * All fields are immutable from the systems layer — scene.ts mutates via pure functions.
 */
export interface GameState {
  /** Current boss level index (0-9). */
  currentLevel: number;
  /** Current level type. */
  levelType: LevelType;
  /** Vocabulary items passed by the host. */
  readonly vocabulary: readonly VocabularyItem[];
  /** Boss image indices for the current level (3 items). */
  readonly bossIndices: readonly number[];
  /** Which lane (0, 1, 2) holds the correct boss. */
  correctLane: number;
  /** Remaining shield HP (0 = game over). */
  shieldHP: number;
  /** Accumulated score. */
  score: number;
  /** Total correct answers across all levels. */
  correctAnswers: number;
  /** Total shots fired across all levels. */
  totalAttempts: number;
  /** Whether all levels are completed. */
  completed: boolean;
  /** Whether shield is depleted. */
  gameOver: boolean;
  /** Current weapon upgrade. */
  upgrade: UpgradeType;
  /** Fire rate buff stacks (0, 1, or 2). */
  fireRateStacks: number;
  /** Difficulty multiplier (1.0 → 2.0). */
  difficulty: number;
  /** Number of gigy minions for the current level. */
  gigyCount: number;
  /** Boss HP (hits required) for the current level. */
  bossMaxHP: number;
  /** Current HP of each boss lane [lane0, lane1, lane2]. */
  bossHP: readonly number[];
  /** Whether the current level's chain explosion has been triggered. */
  chainTriggered: boolean;
}

/** Skin theme colors used by the scene renderer. */
export interface SkinTheme {
  readonly name: string;
  readonly background: number;
  readonly starColor: number;
  readonly neonGrid: number;
  readonly playerTint: number;
  readonly bulletColor: number;
  readonly explosionCorrect: number;
  readonly explosionWrong: number;
  readonly bannerBg: number;
  readonly bannerText: string;
}

/** Chibi Quest theme — bright sky, cheerful colors. */
export const SKIN_CHIBI: SkinTheme = {
  name: "Chibi Quest",
  background: 0x87CEEB,
  starColor: 0xffffff,
  neonGrid: 0x4da6ff,
  playerTint: 0x00ffff,
  bulletColor: 0x00ffff,
  explosionCorrect: 0x00ff00,
  explosionWrong: 0xff0000,
  bannerBg: 0x5ba3d9,
  bannerText: "#ffffff",
};

/** Riven Lands theme — dark space, volcanic fire, ember effects. */
export const SKIN_RIVEN: SkinTheme = {
  name: "Riven Lands",
  background: 0x0a0a0a,
  starColor: 0xff4500,
  neonGrid: 0xff6600,
  playerTint: 0xff4500,
  bulletColor: 0xff6600,
  explosionCorrect: 0x00ff00,
  explosionWrong: 0xff0000,
  bannerBg: 0x1a0000,
  bannerText: "#ffcc00",
};

/**
 * Returns the difficulty multiplier for a given level.
 * Scales from 1.0 (level 1) to 2.0 (level 10).
 */
export function getDifficulty(level: number): number {
  return 1.0 + (level / (TOTAL_LEVELS - 1));
}

/** Returns the number of gigy minions for a given level (0-indexed). */
export function getGigyCount(level: number): number {
  if (level < 2) return 5;
  if (level < 4) return 7;
  if (level < 6) return 9;
  if (level < 8) return 12;
  return 15;
}

/** Returns boss max HP (hits required) for a given level (0-indexed). */
export function getBossMaxHP(level: number): number {
  if (level < 2) return 5;
  if (level < 4) return 10;
  if (level < 6) return 15;
  if (level < 8) return 20;
  return 25;
}

/** Returns the 3 boss image indices for a given level (0-indexed). */
export function getBossIndices(level: number): readonly number[] {
  return BOSS_ASSIGNMENTS[level % TOTAL_LEVELS]!;
}

/**
 * Returns the correct lane index (0, 1, or 2) for a given level.
 * Deterministic distribution so each position appears roughly equally.
 */
export function getCorrectLane(level: number): number {
  return ((level * 7 + 3) % 3);
}

/**
 * Builds the 3 labels (English terms) shown on the bosses.
 * One is the correct term; the other two are distractors.
 */
export function getBossLabels(
  vocabulary: readonly VocabularyItem[],
  level: number,
): readonly string[] {
  const item = vocabulary[level % vocabulary.length]!;
  const correct = item.term;
  const distractors = DISTRACTOR_MAP[correct] ?? ["WORD_A", "WORD_B"];
  const lane = getCorrectLane(level);
  const labels = ["", "", ""];
  labels[lane] = correct;
  let dIdx = 0;
  for (let i = 0; i < 3; i++) {
    if (i !== lane) {
      labels[i] = distractors[dIdx]!;
      dIdx++;
    }
  }
  return labels;
}

/** Creates a fresh game state for a new session. */
export function createGameState(
  vocabulary: readonly VocabularyItem[],
): GameState {
  const level = 0;
  return {
    currentLevel: level,
    levelType: "boss",
    vocabulary,
    bossIndices: getBossIndices(level),
    correctLane: getCorrectLane(level),
    shieldHP: SHIELD_MAX,
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    completed: false,
    gameOver: false,
    upgrade: "none",
    fireRateStacks: 0,
    difficulty: getDifficulty(level),
    gigyCount: getGigyCount(level),
    bossMaxHP: getBossMaxHP(level),
    bossHP: [getBossMaxHP(level), getBossMaxHP(level), getBossMaxHP(level)],
    chainTriggered: false,
  };
}

/**
 * Processes a shot at the given lane.
 * Returns the updated state and whether the shot was correct.
 */
export function processShot(
  state: GameState,
  shotLane: number,
): { state: GameState; correct: boolean } {
  if (state.completed || state.gameOver || state.chainTriggered) {
    return { state, correct: false };
  }

  const correct = shotLane === state.correctLane;
  const newTotalAttempts = state.totalAttempts + 1;

  if (correct) {
    const newBossHP = [...state.bossHP];
    newBossHP[shotLane] = Math.max(0, newBossHP[shotLane]! - 1);

    const bossDefeated = newBossHP[shotLane] === 0;

    if (bossDefeated) {
      return {
        state: {
          ...state,
          bossHP: [0, 0, 0],
          chainTriggered: true,
          correctAnswers: state.correctAnswers + 1,
          totalAttempts: newTotalAttempts,
          score: state.score + 100 + Math.floor(state.difficulty * 50),
        },
        correct: true,
      };
    }

    return {
      state: {
        ...state,
        bossHP: newBossHP,
        totalAttempts: newTotalAttempts,
      },
      correct: true,
    };
  }

  // Incorrect shot — boss takes damage like correct
  const newBossHP = [...state.bossHP];
  newBossHP[shotLane] = Math.max(0, newBossHP[shotLane]! - 1);

  const wrongBossDefeated = newBossHP[shotLane] === 0;

  if (wrongBossDefeated) {
    // Wrong boss destroyed → shield decreases
    const newShieldHP = Math.max(0, state.shieldHP - SHIELD_DAMAGE);
    const isGameOver = newShieldHP <= 0;
    // Respawn the hit boss with new distractors
    newBossHP[shotLane] = state.bossMaxHP;

    return {
      state: {
        ...state,
        shieldHP: newShieldHP,
        bossHP: newBossHP,
        totalAttempts: newTotalAttempts,
        gameOver: isGameOver,
      },
      correct: false,
    };
  }

  // Wrong boss not dead yet → just damage, no shield penalty
  return {
    state: {
      ...state,
      bossHP: newBossHP,
      totalAttempts: newTotalAttempts,
    },
    correct: false,
  };
}

/** Advances the game to the next level after completing the current one. */
export function advanceLevel(state: GameState): GameState {
  if (state.levelType === "boss") {
    // Boss level done → go to gigy wave (same boss level index)
    return {
      ...state,
      levelType: "gigy-wave",
      gigyCount: getGigyCount(state.currentLevel),
      chainTriggered: false,
    };
  }
  // Gigy wave done → go to next boss level
  const nextBoss = state.currentLevel + 1;
  if (nextBoss >= TOTAL_LEVELS) {
    return { ...state, completed: true, chainTriggered: false };
  }
  return {
    ...state,
    currentLevel: nextBoss,
    levelType: "boss",
    bossIndices: getBossIndices(nextBoss),
    correctLane: getCorrectLane(nextBoss),
    difficulty: getDifficulty(nextBoss),
    gigyCount: getGigyCount(nextBoss),
    bossMaxHP: getBossMaxHP(nextBoss),
    bossHP: [getBossMaxHP(nextBoss), getBossMaxHP(nextBoss), getBossMaxHP(nextBoss)],
    chainTriggered: false,
  };
}

/** Applies the selected upgrade to the game state. */
export function applyUpgrade(
  state: GameState,
  choice: UpgradeType,
): GameState {
  if (choice === "firerate") {
    return {
      ...state,
      fireRateStacks: Math.min(2, state.fireRateStacks + 1),
    };
  }
  return { ...state, upgrade: choice };
}

/** Converts terminal game state to the immutable host result contract. */
export function results(state: GameState): GameResults {
  const accuracy =
    state.totalAttempts === 0
      ? 0
      : state.correctAnswers / state.totalAttempts;
  return {
    accuracy,
    xp: Math.floor(state.correctAnswers * accuracy * 10),
    score: state.score,
    correctAnswers: state.correctAnswers,
    totalAttempts: state.totalAttempts,
  };
}
