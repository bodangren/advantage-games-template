import type { GameResults, VocabularyItem } from "@reading-advantage/game-contracts";

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type MonsterType = "normal" | "shy" | "fast" | "shield";
export type ObstacleType = "bomb" | "bat";

export interface MonsterData {
  id: number;
  term: string;
  translation: string;
  gridIndex: number;
  alive: boolean;
  isTarget: boolean;
  type: MonsterType;
  shieldHp: number;
  answeredCorrectly: boolean | null;
}

export interface ObstacleData {
  id: number;
  type: ObstacleType;
  gridIndex: number;
  alive: boolean;
}

export interface GameState {
  monsters: MonsterData[];
  obstacles: ObstacleData[];
  correctAnswers: number;
  totalAttempts: number;
  score: number;
  combo: number;
  timeLeft: number;
  gameOver: boolean;
  completed: boolean;
  rand: () => number;
}

export const TIMER_SECONDS = 30;
export const TIME_BONUS_PER_HIT = 2;
export const BOMB_TIME_PENALTY = 3;

function assignMonsterType(rand: () => number): MonsterType {
  const r = rand();
  if (r < 0.25) return "shy";
  if (r < 0.4) return "fast";
  if (r < 0.5) return "shield";
  return "normal";
}

function createObstacles(monsters: MonsterData[], rand: () => number): ObstacleData[] {
  const obstacles: ObstacleData[] = [];
  let id = 1000;

  const bombCount = 2 + Math.floor(rand() * 2);
  const usedIndices = new Set<number>();
  for (let i = 0; i < bombCount; i++) {
    let idx: number;
    do { idx = Math.floor(rand() * monsters.length); } while (usedIndices.has(idx));
    usedIndices.add(idx);
    obstacles.push({ id: id++, type: "bomb", gridIndex: idx, alive: true });
  }

  const batCount = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < batCount; i++) {
    obstacles.push({ id: id++, type: "bat", gridIndex: -1, alive: true });
  }

  return obstacles;
}

export function createGameState(input: readonly VocabularyItem[], seed?: number): GameState {
  const rand = mulberry32(seed ?? Date.now());

  const monsters: MonsterData[] = input.map((item, i) => {
    const type = assignMonsterType(rand);
    return {
      id: i,
      term: item.term,
      translation: item.translation,
      gridIndex: i,
      alive: true,
      isTarget: false,
      type,
      shieldHp: type === "shield" ? 2 : 1,
      answeredCorrectly: null,
    };
  });

  for (let i = monsters.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = monsters[i]!;
    monsters[i] = { ...monsters[j]!, gridIndex: i };
    monsters[j] = { ...tmp, gridIndex: j };
  }

  if (monsters.length > 0) {
    const first = monsters.find((m) => m.gridIndex === 0);
    if (first) first.isTarget = true;
  }

  const obstacles = createObstacles(monsters, rand);

  return {
    monsters,
    obstacles,
    correctAnswers: 0,
    totalAttempts: 0,
    score: 0,
    combo: 0,
    timeLeft: TIMER_SECONDS,
    gameOver: false,
    completed: false,
    rand,
  };
}

export function comboScore(combo: number): number {
  return Math.min(300, 100 + combo * 25);
}

export function comboTier(combo: number): "normal" | "good" | "great" | "incredible" {
  if (combo >= 10) return "incredible";
  if (combo >= 5) return "great";
  if (combo >= 3) return "good";
  return "normal";
}

export function shoot(state: GameState, monsterId: number): GameState {
  if (state.completed || state.gameOver) return state;
  const monster = state.monsters.find((m) => m.id === monsterId);
  if (!monster || !monster.alive) return state;

  const isCorrect = monster.isTarget;
  const wasAlive = monster.alive;
  const nextMonsters = state.monsters.map((m) => ({ ...m }));
  const hit = nextMonsters.find((m) => m.id === monsterId)!;

  if (isCorrect) {
    if (hit.shieldHp > 1) {
      hit.shieldHp--;
    } else {
      hit.alive = false;
      hit.isTarget = false;
      hit.answeredCorrectly = true;
      const alive = nextMonsters.filter((m) => m.alive);
      if (alive.length > 0) {
        const idx = Math.floor(state.rand() * alive.length);
        alive[idx]!.isTarget = true;
      }
    }
  } else {
    hit.answeredCorrectly = false;
  }

  const isNowDead = !hit.alive;
  const wasKilled = wasAlive && isNowDead;
  const shieldAbsorbed = isCorrect && !isNowDead;
  const allDead = nextMonsters.every((m) => !m.alive);
  const nextCombo = wasKilled ? state.combo + 1 : isCorrect ? state.combo : 0;
  const hitScore = wasKilled ? comboScore(nextCombo) : 0;
  const timeBonus = wasKilled ? TIME_BONUS_PER_HIT : 0;

  return {
    monsters: nextMonsters,
    obstacles: state.obstacles,
    correctAnswers: state.correctAnswers + (wasKilled ? 1 : 0),
    totalAttempts: state.totalAttempts + (shieldAbsorbed ? 0 : 1),
    score: state.score + hitScore,
    combo: nextCombo,
    timeLeft: Math.min(TIMER_SECONDS, state.timeLeft + timeBonus),
    gameOver: false,
    completed: allDead,
    rand: state.rand,
  };
}

export function shootObstacle(state: GameState, obstacleId: number): GameState {
  const obstacle = state.obstacles.find((o) => o.id === obstacleId);
  if (!obstacle || !obstacle.alive) return state;

  if (obstacle.type === "bomb") {
    return {
      ...state,
      combo: 0,
      timeLeft: Math.max(0, state.timeLeft - BOMB_TIME_PENALTY),
      obstacles: state.obstacles.map((o) => (o.id === obstacleId ? { ...o, alive: false } : o)),
    };
  }

  return state;
}

export function tick(state: GameState): GameState {
  if (state.completed || state.gameOver) return state;
  const nextTime = state.timeLeft - 1;
  return { ...state, timeLeft: nextTime, gameOver: nextTime <= 0 };
}

export function results(state: GameState): GameResults {
  const accuracy = state.totalAttempts === 0 ? 0 : state.correctAnswers / state.totalAttempts;
  return {
    accuracy,
    xp: Math.floor(state.correctAnswers * accuracy),
    score: state.score,
    correctAnswers: state.correctAnswers,
    totalAttempts: state.totalAttempts,
  };
}

export function wordResults(state: GameState): { term: string; translation: string; correct: boolean }[] {
  return state.monsters.map((m) => ({
    term: m.term,
    translation: m.translation,
    correct: m.answeredCorrectly === true,
  }));
}

export function targetTranslation(state: GameState): string | null {
  const target = state.monsters.find((m) => m.isTarget && m.alive);
  return target ? target.translation : null;
}

export function gridLayout(count: number, compact: boolean): { cols: number; rows: number } {
  if (compact) {
    const cols = count <= 2 ? 1 : count <= 6 ? 2 : 3;
    return { cols, rows: Math.ceil(count / cols) };
  }
  const cols = count <= 2 ? 2 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
  return { cols, rows: Math.ceil(count / cols) };
}
