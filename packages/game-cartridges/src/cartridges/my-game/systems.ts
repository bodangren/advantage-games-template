import type { GameResults, VocabularyItem } from "@reading-advantage/game-contracts";

// ---- Types ----

/** Cardinal direction for hero and goblin movement. */
export type Direction = "up" | "down" | "left" | "right";

/** Goblin behaviour mode. */
export type GoblinMode = "patrol" | "flee" | "defeated";

/** Row / column position in the maze grid. */
export interface GridPos {
  row: number;
  col: number;
}

/** One goblin enemy in the maze. */
export interface Goblin {
  pos: GridPos;
  mode: GoblinMode;
  moveTimer: number;
  speed: number;
}

/** One letter orb placed in the maze for spelling the current word. */
export interface Orb {
  pos: GridPos;
  letter: string;
  letterIndex: number;
  collected: boolean;
}

/** Complete deterministic game state for Crystal Maze. */
export interface CrystalMazeState {
  maze: number[][];
  rows: number;
  cols: number;

  sentenceIndex: number;
  wordProgress: number;
  letterProgress: number;
  totalSentences: number;

  heroPos: GridPos;
  heroDirection: Direction;

  orbs: Orb[];

  goblins: Goblin[];
  goblinHuntActive: boolean;
  goblinHuntTimer: number;
  goblinHuntDuration: number;

  lives: number;
  maxLives: number;
  score: number;
  correctAnswers: number;
  totalAttempts: number;
  bonusGoblinKills: number;

  stunned: boolean;
  stunnedTimer: number;
  stunDuration: number;

  invincible: boolean;
  invincibleTimer: number;
  invincibleDuration: number;

  completedWords: string[];

  collectedLetters: string[];
  arranging: boolean;
  arrangedWord: string;

  sentenceComplete: boolean;
  gateOpen: boolean;

  completed: boolean;
  won: boolean;
}

// ---- Constants ----

/** Default maze grid width and height. Must be odd for proper corridor carving. */
export const DEFAULT_MAZE_ROWS = 13;
export const DEFAULT_MAZE_COLS = 13;

/** Number of lives the player starts with. */
export const INITIAL_LIVES = 10;

/** Goblin Hunt power-up duration in seconds. */
export const POWER_UP_DURATION = 8;

/** Stun duration in seconds after taking damage or wrong orb. */
export const STUN_DURATION = 1.5;

/** Invincibility duration in seconds after taking damage (includes stun). */
export const INVINCIBLE_DURATION = 3;

/** Score awarded per correctly collected orb. */
export const SCORE_PER_ORB = 100;

/** Score awarded per goblin defeated during Goblin Hunt. */
export const SCORE_PER_GOBLIN = 200;

/** Score awarded per remaining life on victory. */
export const SURVIVAL_BONUS = 50;

/** Number of goblins to place in the maze. */
export const GOBLIN_COUNT = 2;

// Grid delta for each direction
const DIRECTION_DELTA: Record<Direction, GridPos> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

const ALL_DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

// ---- Seeded PRNG ----

/**
 * Creates a deterministic pseudo-random number generator using a linear congruential generator.
 * Returns a function that produces values in [0, 1).
 */
function createRng(seed?: number): () => number {
  let s = seed ?? Date.now();
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Fisher-Yates shuffle using the provided rng. */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

// ---- Maze Generation ----

/**
 * Generates a maze using the recursive-backtracker algorithm.
 * 0 = walkable corridor, 1 = wall, 2 = gate (exit tile).
 * Carves from center outward, then opens deliberate rooms and wider corridors
 * for clear, interesting gameplay paths.
 * @param rows Number of rows (should be odd).
 * @param cols Number of columns (should be odd).
 * @param seed Optional deterministic seed.
 */
export function generateMaze(rows: number, cols: number, seed?: number): number[][] {
  const rng = createRng(seed);
  const maze: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(1));

  function carve(row: number, col: number): void {
    maze[row]![col] = 0;
    const dirs = shuffle(ALL_DIRECTIONS, rng);
    for (const dir of dirs) {
      const d = DIRECTION_DELTA[dir];
      const nr = row + d.row * 2;
      const nc = col + d.col * 2;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && maze[nr]![nc] === 1) {
        maze[row + d.row]![nc + d.col] = 0;
        carve(nr, nc);
      }
    }
  }

  // Start from center
  const cr = Math.floor(rows / 2);
  const cc = Math.floor(cols / 2);
  carve(cr, cc);

  // ---- Open wider paths by selectively removing wall clusters ----
  // Remove walls that have 2+ adjacent walkable cells (creates loops naturally)
  for (let r = 2; r < rows - 2; r += 1) {
    for (let c = 2; c < cols - 2; c += 1) {
      if (maze[r]![c] !== 1) continue;
      let n = 0;
      if (maze[r - 1]![c] === 0) n += 1;
      if (maze[r + 1]![c] === 0) n += 1;
      if (maze[r]![c - 1] === 0) n += 1;
      if (maze[r]![c + 1] === 0) n += 1;
      if (n >= 2 && rng() < 0.25) {
        maze[r]![c] = 0;
      }
    }
  }

  // ---- Deliberate rooms (2×2 open areas) at strategic positions ----
  const rooms = [
    { r: 2, c: 2 },                          // top-left chamber
    { r: rows - 4, c: cols - 4 },             // bottom-right chamber
    { r: Math.floor(rows / 2) - 1, c: 2 },   // mid-left chamber
    { r: rows - 4, c: Math.floor(cols / 2) - 1 }, // bottom-center chamber
  ];

  for (const room of rooms) {
    for (let dr = 0; dr < 2; dr += 1) {
      for (let dc = 0; dc < 2; dc += 1) {
        const rr = room.r + dr;
        const rc = room.c + dc;
        if (rr > 0 && rr < rows - 1 && rc > 0 && rc < cols - 1) {
          maze[rr]![rc] = 0;
        }
      }
    }
  }

  // ---- Gate at centre-right edge with clear approach ----
  const gateRow = Math.floor((rows - 1) / 2);
  const gateCol = cols - 2;
  // Clear path to gate
  maze[gateRow]![gateCol - 1] = 0;
  maze[gateRow]![gateCol] = 2;

  return maze;
}

/**
 * Finds the nearest walkable cell from a starting position using BFS.
 * Guarantees the hero always spawns on a valid floor cell.
 */
export function findNearbyWalkable(maze: number[][], pos: GridPos): GridPos {
  if (maze[pos.row]![pos.col] === 0) return pos;

  const rows = maze.length;
  const cols = maze[0]!.length;
  const visited = new Set<string>();
  const queue: GridPos[] = [pos];
  visited.add(`${pos.row},${pos.col}`);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (maze[cur.row]![cur.col] === 0) return cur;

    for (const dir of ALL_DIRECTIONS) {
      const nr = cur.row + DIRECTION_DELTA[dir].row;
      const nc = cur.col + DIRECTION_DELTA[dir].col;
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(key)) {
        visited.add(key);
        queue.push({ row: nr, col: nc });
      }
    }
  }

  return pos; // fallback
}

/**
 * Returns all walkable corridor cells (value 0) in the maze.
 */
export function getWalkableCells(maze: number[][]): GridPos[] {
  const cells: GridPos[] = [];
  for (let r = 0; r < maze.length; r += 1) {
    for (let c = 0; c < maze[r]!.length; c += 1) {
      if (maze[r]![c] === 0) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

/** Manhattan distance between two grid positions. */
function manhattan(a: GridPos, b: GridPos): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/** BFS shortest-path distance through walkable cells and the gate. */
function bfsDistance(maze: number[][], from: GridPos, to: GridPos): number {
  if (from.row === to.row && from.col === to.col) return 0;
  const visited = new Set<string>();
  const queue: { pos: GridPos; dist: number }[] = [{ pos: from, dist: 0 }];
  visited.add(`${from.row},${from.col}`);

  while (queue.length > 0) {
    const { pos, dist } = queue.shift()!;
    for (const dir of ALL_DIRECTIONS) {
      const d = DIRECTION_DELTA[dir];
      const nr = pos.row + d.row;
      const nc = pos.col + d.col;
      const key = `${nr},${nc}`;
      if (
        nr >= 0 &&
        nr < maze.length &&
        nc >= 0 &&
        nc < maze[0]!.length &&
        (maze[nr]![nc] === 0 || maze[nr]![nc] === 2) &&
        !visited.has(key)
      ) {
        if (nr === to.row && nc === to.col) return dist + 1;
        visited.add(key);
        queue.push({ pos: { row: nr, col: nc }, dist: dist + 1 });
      }
    }
  }
  return Infinity;
}

// ---- Orb Placement ----

/**
 * Places orbs for each letter of the current word at valid, reachable positions.
 * Guarantees no orb blocks the path to any other orb from the hero.
 * @param maze The maze grid.
 * @param letters The letters of the current word being spelled.
 * @param heroPos Current hero position (to avoid).
 * @param seed Optional deterministic seed.
 */
export function placeOrbs(
  maze: number[][],
  letters: string[],
  heroPos: GridPos,
  seed?: number,
): Orb[] {
  const rng = createRng(seed);
  const walkable = getWalkableCells(maze);

  const candidates = walkable.filter((c) => {
    if (c.row === heroPos.row && c.col === heroPos.col) return false;
    const dist = bfsDistance(maze, heroPos, c);
    return dist > 2 && dist < 30;
  });

  const pool = candidates.length > 0 ? candidates : walkable.filter(
    (c) => !(c.row === heroPos.row && c.col === heroPos.col),
  );
  const shuffled = shuffle(pool, rng);
  const orbs: Orb[] = [];
  const used = new Set<string>();

  for (let i = 0; i < letters.length; i += 1) {
    // Find a reachable position that isn't blocked by already-placed orbs
    let placed = false;
    for (let attempt = 0; attempt < shuffled.length; attempt += 1) {
      const pos = shuffled[(i + attempt) % shuffled.length]!;
      const key = `${pos.row},${pos.col}`;
      if (used.has(key)) continue;

      // Verify this position is reachable from hero without crossing other orbs
      const blockedMaze = maze.map((row) => [...row]);
      for (const existing of orbs) {
        blockedMaze[existing.pos.row]![existing.pos.col] = 1; // treat as wall
      }
      if (bfsDistance(blockedMaze, heroPos, pos) === Infinity) continue;

      used.add(key);
      orbs.push({
        pos: { row: pos.row, col: pos.col },
        letter: letters[i]!,
        letterIndex: i,
        collected: false,
      });
      placed = true;
      break;
    }

    // Fallback: use any unused walkable cell (reachability might be blocked)
    if (!placed) {
      for (const pos of shuffled) {
        const key = `${pos.row},${pos.col}`;
        if (!used.has(key)) {
          used.add(key);
          orbs.push({
            pos: { row: pos.row, col: pos.col },
            letter: letters[i]!,
            letterIndex: i,
            collected: false,
          });
          placed = true;
          break;
        }
      }
    }
  }

  return orbs;
}

// ---- Goblin Placement ----

/**
 * Places goblins in the maze at positions far enough from the hero.
 * @param maze The maze grid.
 * @param heroPos Current hero position.
 * @param count Number of goblins to place.
 * @param seed Optional deterministic seed.
 */
export function placeGoblins(
  maze: number[][],
  heroPos: GridPos,
  count: number,
  seed?: number,
): Goblin[] {
  const rng = createRng(seed);
  const walkable = getWalkableCells(maze);

  const candidates = walkable.filter((c) => {
    if (c.row === heroPos.row && c.col === heroPos.col) return false;
    return bfsDistance(maze, heroPos, c) > 5;
  });

  const pool = candidates.length > 0 ? candidates : walkable.filter(
    (c) => !(c.row === heroPos.row && c.col === heroPos.col),
  );
  const shuffled = shuffle(pool, rng);
  const goblins: Goblin[] = [];
  const baseSpeed = 3;

  for (let i = 0; i < Math.min(count, shuffled.length); i += 1) {
    const pos = shuffled[i]!;
    const speed = baseSpeed + Math.floor(rng() * 3);
    goblins.push({
      pos: { row: pos.row, col: pos.col },
      mode: "patrol",
      moveTimer: speed,
      speed,
    });
  }

  return goblins;
}

// ---- State Creation ----

/**
 * Creates the initial Crystal Maze game state.
 * Generates the maze, places goblins, and sets starting values.
 * Call {@link initOrbsForSentence} after this to populate the first sentence's orbs.
 * @param input The sentence pairs from the host.
 * @param seed Optional deterministic seed.
 */
export function createCrystalMazeState(
  input: readonly VocabularyItem[],
  seed?: number,
): CrystalMazeState {
  const rows = DEFAULT_MAZE_ROWS;
  const cols = DEFAULT_MAZE_COLS;
  const maze = generateMaze(rows, cols, seed);
  // Place hero at a guaranteed walkable cell near center
  const heroPos: GridPos = findNearbyWalkable(maze, { row: Math.floor(rows / 2), col: Math.floor(cols / 2) });

  // Force-clear hero cell and all 4 exits so player can never be trapped
  const hr = heroPos.row, hc = heroPos.col;
  maze[hr]![hc] = 0;
  if (hr > 0) maze[hr - 1]![hc] = 0;
  if (hr < rows - 1) maze[hr + 1]![hc] = 0;
  if (hc > 0) maze[hr]![hc - 1] = 0;
  if (hc < cols - 1) maze[hr]![hc + 1] = 0;

  return {
    maze,
    rows,
    cols,

    sentenceIndex: 0,
    wordProgress: 0,
    letterProgress: 0,
    totalSentences: input.length,

    heroPos,
    heroDirection: "right",

    orbs: [],

    goblins: placeGoblins(maze, heroPos, GOBLIN_COUNT, seed),
    goblinHuntActive: false,
    goblinHuntTimer: 0,
    goblinHuntDuration: POWER_UP_DURATION,

    lives: INITIAL_LIVES,
    maxLives: INITIAL_LIVES,
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    bonusGoblinKills: 0,

    stunned: false,
    stunnedTimer: 0,
    stunDuration: STUN_DURATION,

    invincible: false,
    invincibleTimer: 0,
    invincibleDuration: INVINCIBLE_DURATION,

    completedWords: [],

    collectedLetters: [],
    arranging: false,
    arrangedWord: "",

    sentenceComplete: false,
    gateOpen: false,

    completed: false,
    won: false,
  };
}

// ---- Sentence Helpers ----

/**
 * Returns the current sentence item from the input array.
 */
export function getCurrentSentence(
  state: CrystalMazeState,
  input: readonly VocabularyItem[],
): VocabularyItem {
  if (state.sentenceIndex >= input.length) {
    return input[input.length - 1]!;
  }
  return input[state.sentenceIndex]!;
}

/**
 * Splits the current English sentence into whitespace-delimited words.
 */
export function getCurrentWords(
  state: CrystalMazeState,
  input: readonly VocabularyItem[],
): string[] {
  return getCurrentSentence(state, input).term.split(" ");
}

/**
 * Returns the current word the player must spell, or empty string if all words done.
 */
export function getCurrentWord(
  state: CrystalMazeState,
  input: readonly VocabularyItem[],
): string {
  const words = getCurrentWords(state, input);
  return words[state.wordProgress] ?? "";
}

/**
 * Returns the next letter the player must collect, or empty string if word is done.
 */
export function getNextLetter(state: CrystalMazeState): string {
  for (const orb of state.orbs) {
    if (orb.letterIndex === state.letterProgress && !orb.collected) return orb.letter;
  }
  // All letters at this position already collected (duplicates) — find next
  for (const orb of state.orbs) {
    if (orb.letterIndex === state.letterProgress) return orb.letter;
  }
  return "";
}

/**
 * Returns whether the orb at the given index is collectible (any uncollected orb).
 */
export function isOrbNext(state: CrystalMazeState, orbIndex: number): boolean {
  const orb = state.orbs[orbIndex];
  return !!(orb && !orb.collected);
}

/**
 * Returns whether all orbs have been collected (ready for gate).
 */
export function isWordComplete(state: CrystalMazeState): boolean {
  if (state.gateOpen) return true;
  return state.orbs.length > 0 && state.orbs.every((o) => o.collected);
}

/**
 * Marks a word as completed in the tracking array.
 * @param key Unique word key: `${sentenceIndex},${wordIndex}`
 */
export function markWordComplete(state: CrystalMazeState, key: string): CrystalMazeState {
  if (state.completedWords.includes(key)) return state;
  return { ...state, completedWords: [...state.completedWords, key] };
}

/**
 * Returns whether a specific word has been completed.
 */
export function isWordDone(state: CrystalMazeState, sentenceIdx: number, wordIdx: number): boolean {
  return state.completedWords.includes(`${sentenceIdx},${wordIdx}`);
}

// ---- Arrangement (Gate Puzzle) ----

/**
 * Starts the arrangement mode when player reaches the gate.
 */
export function startArranging(state: CrystalMazeState): CrystalMazeState {
  return { ...state, arranging: true, arrangedWord: "" };
}

/**
 * Adds a letter to the player's arrangement.
 */
export function addLetterToArrangement(state: CrystalMazeState, letter: string): CrystalMazeState {
  return { ...state, arrangedWord: state.arrangedWord + letter };
}

/**
 * Removes the last letter from the arrangement.
 */
export function removeLastLetter(state: CrystalMazeState): CrystalMazeState {
  return { ...state, arrangedWord: state.arrangedWord.slice(0, -1) };
}

/**
 * Checks if the arranged word matches the target word.
 */
export function checkArrangement(
  state: CrystalMazeState,
  input: readonly VocabularyItem[],
): boolean {
  const word = getCurrentWord(state, input);
  return state.arrangedWord === word;
}

/**
 * Player correctly arranged the word — advance to next word via gate logic.
 */
export function arrangementCorrect(
  state: CrystalMazeState,
  input: readonly VocabularyItem[],
): CrystalMazeState {
  // Same logic as old collectOrb when word complete
  const newWord = state.wordProgress + 1;
  const words = getCurrentWords(state, input);
  const sentenceDone = newWord >= words.length;

  if (sentenceDone) {
    const key = `${state.sentenceIndex},${state.wordProgress}`;
    return activateGoblinHunt(markWordComplete({
      ...state,
      wordProgress: newWord,
      letterProgress: 0,
      orbs: [],
      gateOpen: false,
      arranging: false,
      arrangedWord: "",
      sentenceComplete: true,
    }, key));
  }

  const key = `${state.sentenceIndex},${state.wordProgress}`;
  const newMaze = generateMaze(state.rows, state.cols, state.sentenceIndex * 100 + newWord);
  const heroPos = findNearbyWalkable(newMaze, { row: Math.floor(state.rows / 2), col: Math.floor(state.cols / 2) });

  // Guarantee exits
  const hr = heroPos.row, hc = heroPos.col;
  if (hr > 0) newMaze[hr - 1]![hc] = 0;
  if (hr < state.rows - 1) newMaze[hr + 1]![hc] = 0;
  if (hc > 0) newMaze[hr]![hc - 1] = 0;
  if (hc < state.cols - 1) newMaze[hr]![hc + 1] = 0;

  const newOrbs = placeOrbs(newMaze, words[newWord]!.split(""), heroPos, state.sentenceIndex * 100 + newWord);

  return markWordComplete({
    ...state,
    maze: newMaze,
    heroPos,
    heroDirection: "right",
    orbs: newOrbs,
    gateOpen: false,
    arranging: false,
    arrangedWord: "",
    collectedLetters: [],
    wordProgress: newWord,
    letterProgress: 0,
    goblins: placeGoblins(newMaze, heroPos, GOBLIN_COUNT, state.sentenceIndex * 100 + newWord),
  }, key);
}

// ---- Gate System ----

/**
 * Returns whether the hero is standing on a gate cell.
 */
export function isHeroAtGate(state: CrystalMazeState): boolean {
  return state.maze[state.heroPos.row]![state.heroPos.col] === 2;
}

/**
 * Opens the gate after a word is spelled correctly.
 * Clears orbs so the player has a clean path to the gate.
 */
export function openGate(state: CrystalMazeState): CrystalMazeState {
  return {
    ...state,
    gateOpen: true,
    orbs: [],
  };
}

/**
 * Advances the game from the gate — regenerates maze and places next word's orbs.
 * If the sentence is complete, activates Goblin Hunt instead.
 * @param seed Optional deterministic seed for the new maze.
 */
export function advanceFromGate(
  state: CrystalMazeState,
  input: readonly VocabularyItem[],
  seed?: number,
): CrystalMazeState {
  const words = getCurrentWords(state, input);
  const sentenceDone = state.wordProgress >= words.length;

  if (sentenceDone) {
    const key = `${state.sentenceIndex},${state.wordProgress - 1}`;
    return activateGoblinHunt(markWordComplete({
      ...state,
      gateOpen: false,
      orbs: [],
      sentenceComplete: true,
    }, key));
  }

  // Regenerate maze for new level
  const rows = state.rows;
  const cols = state.cols;
  const newMaze = generateMaze(rows, cols, seed ?? state.sentenceIndex * 100 + state.wordProgress);
  const heroPos: GridPos = findNearbyWalkable(newMaze, { row: Math.floor(rows / 2), col: Math.floor(cols / 2) });

  // Guarantee hero has open exits in all 4 directions
  const hr = heroPos.row, hc = heroPos.col;
  if (hr > 0) newMaze[hr - 1]![hc] = 0;
  if (hr < rows - 1) newMaze[hr + 1]![hc] = 0;
  if (hc > 0) newMaze[hr]![hc - 1] = 0;
  if (hc < cols - 1) newMaze[hr]![hc + 1] = 0;

  const word = words[state.wordProgress]!;
  const newOrbs = placeOrbs(newMaze, word.split(""), heroPos, seed ?? state.wordProgress);

  const key = `${state.sentenceIndex},${state.wordProgress - 1}`;
  return markWordComplete({
    ...state,
    maze: newMaze,
    heroPos,
    heroDirection: "right",
    orbs: newOrbs,
    gateOpen: false,
    goblins: placeGoblins(newMaze, heroPos, GOBLIN_COUNT, seed ?? state.wordProgress),
  }, key);
}

// ---- Hero Movement ----

/**
 * Returns whether the hero can move one cell in the given direction.
 */
export function canMove(state: CrystalMazeState, direction: Direction): boolean {
  const d = DIRECTION_DELTA[direction];
  const nr = state.heroPos.row + d.row;
  const nc = state.heroPos.col + d.col;
  if (nr < 0 || nr >= state.rows || nc < 0 || nc >= state.cols) return false;
  return state.maze[nr]![nc] !== 1;
}

/**
 * Moves the hero one cell in the given direction if valid.
 * Returns a new state when movement succeeds; returns the same state when
 * blocked, stunned, or the game is completed.
 */
export function moveHero(
  state: CrystalMazeState,
  direction: Direction,
): CrystalMazeState {
  if (state.completed || state.stunned) return state;
  if (!canMove(state, direction)) return state;

  const d = DIRECTION_DELTA[direction];
  return {
    ...state,
    heroPos: {
      row: state.heroPos.row + d.row,
      col: state.heroPos.col + d.col,
    },
    heroDirection: direction,
  };
}

// ---- Orb Collision & Collection ----

/**
 * Returns the index of an uncollected orb at the hero's current position, or -1.
 */
export function getCollidingOrb(state: CrystalMazeState): number {
  for (let i = 0; i < state.orbs.length; i += 1) {
    const orb = state.orbs[i]!;
    if (
      !orb.collected &&
      orb.pos.row === state.heroPos.row &&
      orb.pos.col === state.heroPos.col
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Collects any uncollected orb. Adds its letter to the collected list.
 * No order restriction — player can collect in any order, then arrange at the gate.
 */
export function collectOrb(
  state: CrystalMazeState,
  orbIndex: number,
): CrystalMazeState {
  const orb = state.orbs[orbIndex]!;
  if (orb.collected) return state;

  const orbs = state.orbs.map((o, i) =>
    i === orbIndex ? { ...o, collected: true } : o,
  );

  const collectedLetters = [...state.collectedLetters, orb.letter];

  const next: CrystalMazeState = {
    ...state,
    orbs,
    collectedLetters,
    score: state.score + SCORE_PER_ORB,
    correctAnswers: state.correctAnswers + 1,
    totalAttempts: state.totalAttempts + 1,
  };

  return next;
}

/**
 * Applies the penalty for collecting the wrong orb or touching a goblin.
 * Always costs one life and stuns the hero to give escape time.
 * No effect while invincible.
 */
export function wrongOrbPenalty(state: CrystalMazeState): CrystalMazeState {
  if (state.invincible) return state;

  const next: CrystalMazeState = {
    ...state,
    totalAttempts: state.totalAttempts + 1,
  };

  return heroDamaged(next);
}

// ---- Stun & Damage ----

/**
 * Stuns the hero for the configured stun duration.
 */
export function stunHero(state: CrystalMazeState): CrystalMazeState {
  return {
    ...state,
    stunned: true,
    stunnedTimer: state.stunDuration,
  };
}

/**
 * Reduces hero lives by one, applies stun and invincibility, and marks the game as lost
 * when lives reach zero.
 */
export function heroDamaged(state: CrystalMazeState): CrystalMazeState {
  if (state.invincible) return state;
  const newLives = state.lives - 1;
  return {
    ...state,
    lives: newLives,
    stunned: true,
    stunnedTimer: state.stunDuration,
    invincible: true,
    invincibleTimer: state.invincibleDuration,
    completed: newLives <= 0,
    won: false,
  };
}

// ---- Goblin Hunt Power-up ----

/**
 * Activates the Goblin Hunt power-up.
 * All non-defeated goblins switch to flee mode.
 */
export function activateGoblinHunt(state: CrystalMazeState): CrystalMazeState {
  const goblins = state.goblins.map((g) => ({
    ...g,
    mode: g.mode === "defeated" ? "defeated" : ("flee" as GoblinMode),
  }));

  return {
    ...state,
    goblinHuntActive: true,
    goblinHuntTimer: state.goblinHuntDuration,
    goblins,
  };
}

/**
 * Deactivates the Goblin Hunt power-up.
 * Fleeing goblins return to patrol mode.
 */
export function deactivateGoblinHunt(state: CrystalMazeState): CrystalMazeState {
  const goblins = state.goblins.map((g) => ({
    ...g,
    mode: g.mode === "flee" ? ("patrol" as GoblinMode) : g.mode,
  }));

  return {
    ...state,
    goblinHuntActive: false,
    goblinHuntTimer: 0,
    goblins,
  };
}

/**
 * Ticks the power-up timer by deltaSeconds.
 * Deactivates the power-up when the timer reaches zero.
 */
export function tickPowerUpTimer(
  state: CrystalMazeState,
  deltaSeconds: number,
): CrystalMazeState {
  if (!state.goblinHuntActive) return state;

  const newTimer = state.goblinHuntTimer - deltaSeconds;
  if (newTimer <= 0) {
    return deactivateGoblinHunt(state);
  }

  return { ...state, goblinHuntTimer: newTimer };
}

/**
 * Ticks the stun timer by deltaSeconds.
 * Clears the stun flag when the timer reaches zero.
 */
export function tickStunTimer(
  state: CrystalMazeState,
  deltaSeconds: number,
): CrystalMazeState {
  if (!state.stunned) return state;

  const newTimer = state.stunnedTimer - deltaSeconds;
  if (newTimer <= 0) {
    return { ...state, stunned: false, stunnedTimer: 0 };
  }

  return { ...state, stunnedTimer: newTimer };
}

/**
 * Ticks the invincibility timer by deltaSeconds.
 * Clears the invincible flag when the timer reaches zero.
 */
export function tickInvincibleTimer(
  state: CrystalMazeState,
  deltaSeconds: number,
): CrystalMazeState {
  if (!state.invincible) return state;

  const newTimer = state.invincibleTimer - deltaSeconds;
  if (newTimer <= 0) {
    return { ...state, invincible: false, invincibleTimer: 0 };
  }

  return { ...state, invincibleTimer: newTimer };
}

// ---- Goblin AI ----

/**
 * Returns the index of an active (non-defeated) goblin at the hero's position, or -1.
 */
export function getCollidingGoblin(state: CrystalMazeState): number {
  for (let i = 0; i < state.goblins.length; i += 1) {
    const g = state.goblins[i]!;
    if (
      g.mode !== "defeated" &&
      g.pos.row === state.heroPos.row &&
      g.pos.col === state.heroPos.col
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Defeats a goblin. Only valid during the Goblin Hunt power-up.
 * Awards bonus score and marks the goblin as defeated.
 */
export function defeatGoblin(
  state: CrystalMazeState,
  goblinIndex: number,
): CrystalMazeState {
  if (!state.goblinHuntActive) return state;

  const goblins = state.goblins.map((g, i) =>
    i === goblinIndex ? { ...g, mode: "defeated" as GoblinMode } : g,
  );

  return {
    ...state,
    goblins,
    score: state.score + SCORE_PER_GOBLIN,
    bonusGoblinKills: state.bonusGoblinKills + 1,
  };
}

/**
 * Advances all goblin positions by one simulation tick.
 * Goblin movement speed is controlled by each goblin's internal moveTimer.
 */
export function updateGoblins(state: CrystalMazeState): CrystalMazeState {
  const newGoblins = state.goblins.map((g) => updateGoblin(state, g));
  return { ...state, goblins: newGoblins };
}

/** Advances a single goblin's state by one tick. */
function updateGoblin(state: CrystalMazeState, goblin: Goblin): Goblin {
  if (goblin.mode === "defeated") return goblin;

  const nextTimer = goblin.moveTimer - 1;
  if (nextTimer > 0) return { ...goblin, moveTimer: nextTimer };

  const newPos = computeGoblinMove(state, goblin);

  return {
    ...goblin,
    pos: newPos,
    moveTimer: goblin.speed,
  };
}

/** Picks the goblin's next cell based on its current mode. */
function computeGoblinMove(state: CrystalMazeState, goblin: Goblin): GridPos {
  const candidates: GridPos[] = [];

  for (const dir of ALL_DIRECTIONS) {
    const d = DIRECTION_DELTA[dir];
    const nr = goblin.pos.row + d.row;
    const nc = goblin.pos.col + d.col;

    if (
      nr >= 0 &&
      nr < state.rows &&
      nc >= 0 &&
      nc < state.cols &&
      state.maze[nr]![nc] !== 1
    ) {
      candidates.push({ row: nr, col: nc });
    }
  }

  if (candidates.length === 0) return goblin.pos;

  if (goblin.mode === "flee") {
    // Move to the cell farthest from the hero
    let best = candidates[0]!;
    let bestDist = manhattan(best, state.heroPos);
    for (let i = 1; i < candidates.length; i += 1) {
      const dist = manhattan(candidates[i]!, state.heroPos);
      if (dist > bestDist) {
        bestDist = dist;
        best = candidates[i]!;
      }
    }
    return best;
  }

  // Patrol: random walk (biased against reversing direction)
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

// ---- Sentence Progression ----

/**
 * Advances the game to the next sentence.
 * Resets word and letter progress. Re-places goblins for variety.
 * Sets `won: true` and `completed: true` when all sentences have been completed.
 */
export function nextSentence(
  state: CrystalMazeState,
  input: readonly VocabularyItem[],
): CrystalMazeState {
  const nextIndex = state.sentenceIndex + 1;
  const isComplete = nextIndex >= state.totalSentences;

  return {
    ...state,
    sentenceIndex: nextIndex,
    wordProgress: 0,
    letterProgress: 0,
    orbs: [],
    sentenceComplete: false,
    gateOpen: false,
    completed: isComplete,
    won: isComplete,
    goblins: isComplete ? state.goblins : placeGoblins(state.maze, state.heroPos, GOBLIN_COUNT, nextIndex),
  };
}

/**
 * Advances to the next word within the current sentence.
 * Clears orbs and places new ones for the next word's letters.
 * If the sentence is complete, activates Goblin Hunt.
 */
export function advanceWord(
  state: CrystalMazeState,
  input: readonly VocabularyItem[],
): CrystalMazeState {
  const nextWord = state.wordProgress;
  const words = getCurrentWords(state, input);
  const sentenceDone = nextWord >= words.length;

  if (sentenceDone) {
    return activateGoblinHunt({
      ...state,
      wordProgress: nextWord,
      letterProgress: 0,
      orbs: [],
      sentenceComplete: true,
    });
  }

  const nextOrbs = placeOrbs(state.maze, words[nextWord]!.split(""), state.heroPos, state.sentenceIndex * 100 + nextWord);
  return {
    ...state,
    wordProgress: nextWord,
    letterProgress: 0,
    orbs: nextOrbs,
  };
}

/**
 * Initialises orbs for the current word being spelled.
 * Places one orb per letter of the word at the current wordProgress.
 * Call this after {@link createCrystalMazeState}, {@link nextSentence}, and {@link advanceWord}.
 */
export function initOrbsForWord(
  state: CrystalMazeState,
  input: readonly VocabularyItem[],
  seed?: number,
): CrystalMazeState {
  const word = getCurrentWord(state, input);
  if (word.length === 0) return state;

  const letters = word.split("");
  const orbs = placeOrbs(state.maze, letters, state.heroPos, seed ?? state.sentenceIndex * 100 + state.wordProgress);
  return { ...state, orbs };
}

// ---- Game Results ----

/**
 * Builds the final {@link GameResults} from the terminal game state.
 */
export function getGameResults(state: CrystalMazeState): GameResults {
  const accuracy = state.totalAttempts === 0
    ? 0
    : state.correctAnswers / state.totalAttempts;

  return {
    accuracy: Math.min(accuracy, 1),
    xp: Math.floor(state.correctAnswers * accuracy),
    score: state.score + (state.won ? state.lives * SURVIVAL_BONUS : 0),
    correctAnswers: state.correctAnswers,
    totalAttempts: state.totalAttempts,
  };
}
