import type {
  GameResults,
  VocabularyItem,
} from "@reading-advantage/game-contracts";

/** Number of lives a run starts with. */
export const STARTING_LIVES = 3;

/** Duration of the Goblin Hunt power-up in milliseconds. */
export const POWER_UP_MS = 6000;

/** Duration of the wrong-orb stun in milliseconds. */
export const STUN_MS = 850;

/** Score awarded for collecting the next correct word orb. */
export const SCORE_PER_ORB = 100;

/** Score awarded for completing a sentence in the correct order. */
export const SCORE_PER_SENTENCE = 250;

/** Score awarded for defeating a fleeing goblin during Goblin Hunt. */
export const SCORE_PER_GOBLIN = 150;

/** Score awarded for a bonus coin pickup. */
export const SCORE_PER_COIN = 25;

/** Score removed when the learner grabs an out-of-order orb. */
export const SCORE_WRONG_ORB = 25;

/**
 * Portrait-authored maze template, where `#` is wall and `.` is corridor.
 * The wide layout is the transpose of this same source, so one maze
 * definition composes both required viewport profiles.
 */
export const MAZE_TEMPLATE: readonly string[] = Object.freeze([
  "###############",
  "#.....#.#.....#",
  "#.###.#.#.###.#",
  "#.#.........#.#",
  "#.#.###.###.#.#",
  "#.....#.#.....#",
  "###.#.#.#.#.###",
  "#...#.....#...#",
  "#.#####.#####.#",
  "#.............#",
  "#.#####.#####.#",
  "#...#.....#...#",
  "###.#.#.#.#.###",
  "#.....#.#.....#",
  "#.#.###.###.#.#",
  "#.#.........#.#",
  "#.###.#.#.###.#",
  "#.....#.#.....#",
  "###############",
]);

/** Hero start cell in the portrait orientation. */
export const HERO_SPAWN: MazeCell = Object.freeze({ col: 7, row: 9 });

/** Goblin home cells in the portrait orientation. */
export const GOBLIN_SPAWNS: readonly MazeCell[] = Object.freeze([
  Object.freeze({ col: 1, row: 1 }),
  Object.freeze({ col: 13, row: 17 }),
  Object.freeze({ col: 13, row: 1 }),
  Object.freeze({ col: 1, row: 17 }),
]);

/** A maze as rows of walkable flags, where `true` means the cell is a corridor. */
export type MazeGrid = readonly (readonly boolean[])[];

/** A discrete maze coordinate. */
export interface MazeCell {
  /** Zero-based column. */
  readonly col: number;
  /** Zero-based row. */
  readonly row: number;
}

/** A unit heading in grid space. */
export interface Direction {
  /** Column delta, one of -1, 0, or 1. */
  readonly dirCol: number;
  /** Row delta, one of -1, 0, or 1. */
  readonly dirRow: number;
}

/** Continuous position and heading of a maze walker. */
export interface MoverState extends Direction {
  /** Fractional column position. */
  readonly col: number;
  /** Fractional row position. */
  readonly row: number;
}

/** The four legal maze headings. */
export const DIRECTIONS: readonly Direction[] = Object.freeze([
  Object.freeze({ dirCol: 1, dirRow: 0 }),
  Object.freeze({ dirCol: -1, dirRow: 0 }),
  Object.freeze({ dirCol: 0, dirRow: 1 }),
  Object.freeze({ dirCol: 0, dirRow: -1 }),
]);

/** The stopped heading. */
export const STOPPED: Direction = Object.freeze({ dirCol: 0, dirRow: 0 });

/** One playable sentence round derived from host input. */
export interface SentenceRound {
  /** Thai sentence shown as the learning prompt. */
  readonly prompt: string;
  /** Full English sentence, kept for the completion summary. */
  readonly sentence: string;
  /** English words the learner must collect in order. */
  readonly words: readonly string[];
}

/** Deterministic session state kept independent from Phaser rendering. */
export interface GameState {
  /** Index of the active sentence round. */
  readonly roundIndex: number;
  /** Index of the next word the learner must collect. */
  readonly wordIndex: number;
  /** Remaining lives. */
  readonly lives: number;
  /** Display score. */
  readonly score: number;
  /** Orbs collected in the correct order. */
  readonly correctAnswers: number;
  /** Every orb the learner touched, correct or not. */
  readonly totalAttempts: number;
  /** Sentences finished in the correct order. */
  readonly sentencesCompleted: number;
  /** Goblins defeated during Goblin Hunt. */
  readonly goblinsDefeated: number;
  /** Terminal or active run status. */
  readonly status: "playing" | "won" | "lost";
}

/** What a collected orb did to the run. */
export type CollectOutcome =
  | "ignored"
  | "correct"
  | "wrong"
  | "sentence-complete"
  | "won";

/** Result of applying an orb collection to the session state. */
export interface CollectResult {
  /** The state after the collection. */
  readonly state: GameState;
  /** What the collection meant for the learner. */
  readonly outcome: CollectOutcome;
}

/**
 * Parses a maze template into a walkable-flag grid.
 * @param template Rows of `#` and `.` characters.
 * @returns Row-major grid where `true` marks a corridor cell.
 */
export function parseMaze(
  template: readonly string[] = MAZE_TEMPLATE,
): MazeGrid {
  return template.map((row) => Array.from(row, (cell) => cell === "."));
}

/**
 * Transposes a maze so the tall portrait source becomes the wide landscape maze.
 * @param grid Grid to transpose.
 * @returns Grid with rows and columns swapped.
 */
export function transposeMaze(grid: MazeGrid): MazeGrid {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const flipped: boolean[][] = [];
  for (let col = 0; col < cols; col += 1) {
    const line: boolean[] = [];
    for (let row = 0; row < rows; row += 1) line.push(grid[row]![col] === true);
    flipped.push(line);
  }
  return flipped;
}

/**
 * Selects the maze orientation that suits a viewport profile.
 * @param grid Portrait-authored grid.
 * @param wide True when the host viewport is landscape.
 * @returns The portrait grid, or its transpose for landscape.
 */
export function orientMaze(grid: MazeGrid, wide: boolean): MazeGrid {
  return wide ? transposeMaze(grid) : grid;
}

/**
 * Maps a cell between the portrait and landscape orientations.
 * @param cell Cell in the current orientation.
 * @returns The same cell with column and row swapped.
 */
export function flipCell(cell: MazeCell): MazeCell {
  return { col: cell.row, row: cell.col };
}

/**
 * Places a cell into the requested orientation.
 * @param cell Portrait-authored cell.
 * @param wide True when the host viewport is landscape.
 * @returns The cell in the active orientation.
 */
export function orientCell(cell: MazeCell, wide: boolean): MazeCell {
  return wide ? flipCell(cell) : cell;
}

/**
 * Reports whether a walker may occupy a cell.
 * @param grid Grid to test.
 * @param col Column to test.
 * @param row Row to test.
 * @returns True when the cell exists and is a corridor.
 */
export function canEnter(grid: MazeGrid, col: number, row: number): boolean {
  return grid[row]?.[col] === true;
}

/**
 * Lists every corridor cell in stable row-major order.
 * @param grid Grid to scan.
 * @returns All walkable cells.
 */
export function openCells(grid: MazeGrid): readonly MazeCell[] {
  const cells: MazeCell[] = [];
  grid.forEach((line, row) =>
    line.forEach((open, col) => {
      if (open) cells.push({ col, row });
    }),
  );
  return cells;
}

/**
 * Creates a small deterministic pseudo-random generator.
 * @param seed Seed supplied by the host or derived from the round index.
 * @returns A function producing values in the range 0 to 1.
 */
export function createRandom(seed: number): () => number {
  let value = Math.abs(Math.floor(seed)) % 2147483646;
  if (value <= 0) value = 1;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

/**
 * Splits host sentence input into rounds ordered from short to long, so the
 * brief's 3-to-7 word difficulty ramp emerges from any supplied sentence set.
 * @param input Host-supplied `{ term, translation }` records.
 * @returns Playable rounds in ascending word-count order.
 */
export function buildRounds(
  input: readonly VocabularyItem[],
): readonly SentenceRound[] {
  return input
    .map((item) => ({
      prompt: item.translation,
      sentence: item.term,
      words: item.term.split(/\s+/).filter((word) => word.length > 0),
    }))
    .filter((round) => round.words.length > 0)
    .sort((left, right) => left.words.length - right.words.length);
}

/**
 * Spreads pickup cells deterministically across the maze.
 * @param grid Oriented maze grid.
 * @param count Number of cells required.
 * @param seed Deterministic seed.
 * @param reserved Cells that must not host a pickup.
 * @returns Distinct corridor cells, one per requested pickup.
 */
export function placeOrbs(
  grid: MazeGrid,
  count: number,
  seed: number,
  reserved: readonly MazeCell[] = [],
): readonly MazeCell[] {
  const blocked = new Set(reserved.map((cell) => `${cell.col}:${cell.row}`));
  const candidates = openCells(grid).filter(
    (cell) => !blocked.has(`${cell.col}:${cell.row}`),
  );
  if (candidates.length === 0 || count <= 0) return [];

  const random = createRandom(seed);
  const stride = Math.max(1, Math.floor(candidates.length / count));
  const offset = Math.floor(random() * candidates.length);
  const picked: MazeCell[] = [];
  const used = new Set<number>();
  for (let index = 0; index < count; index += 1) {
    let slot = (offset + index * stride) % candidates.length;
    while (used.has(slot)) slot = (slot + 1) % candidates.length;
    used.add(slot);
    picked.push(candidates[slot]!);
  }
  return picked;
}

/**
 * Creates a fresh run.
 * @returns The starting session state.
 */
export function createGameState(): GameState {
  return {
    roundIndex: 0,
    wordIndex: 0,
    lives: STARTING_LIVES,
    score: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    sentencesCompleted: 0,
    goblinsDefeated: 0,
    status: "playing",
  };
}

/**
 * Applies the sentence-order rule to one collected orb.
 * @param state Current session state.
 * @param rounds All playable rounds.
 * @param wordIndex Sentence position of the collected orb.
 * @returns The next state and what the collection meant.
 */
export function collectOrb(
  state: GameState,
  rounds: readonly SentenceRound[],
  wordIndex: number,
): CollectResult {
  const round = rounds[state.roundIndex];
  if (state.status !== "playing" || !round) {
    return { state, outcome: "ignored" };
  }

  if (wordIndex !== state.wordIndex) {
    return {
      state: {
        ...state,
        totalAttempts: state.totalAttempts + 1,
        score: Math.max(0, state.score - SCORE_WRONG_ORB),
      },
      outcome: "wrong",
    };
  }

  const nextWordIndex = state.wordIndex + 1;
  const advanced: GameState = {
    ...state,
    wordIndex: nextWordIndex,
    correctAnswers: state.correctAnswers + 1,
    totalAttempts: state.totalAttempts + 1,
    score: state.score + SCORE_PER_ORB,
  };
  if (nextWordIndex < round.words.length) {
    return { state: advanced, outcome: "correct" };
  }

  const roundIndex = state.roundIndex + 1;
  const finished = roundIndex >= rounds.length;
  return {
    state: {
      ...advanced,
      wordIndex: 0,
      roundIndex,
      sentencesCompleted: state.sentencesCompleted + 1,
      score: advanced.score + SCORE_PER_SENTENCE,
      status: finished ? "won" : "playing",
    },
    outcome: finished ? "won" : "sentence-complete",
  };
}

/**
 * Removes one life after unshielded goblin contact.
 * @param state Current session state.
 * @returns The state with one fewer life, losing the run at zero.
 */
export function loseLife(state: GameState): GameState {
  if (state.status !== "playing") return state;
  const lives = state.lives - 1;
  return { ...state, lives, status: lives <= 0 ? "lost" : "playing" };
}

/**
 * Awards a goblin defeated during Goblin Hunt.
 * @param state Current session state.
 * @returns The state with bonus score recorded.
 */
export function defeatGoblin(state: GameState): GameState {
  if (state.status !== "playing") return state;
  return {
    ...state,
    score: state.score + SCORE_PER_GOBLIN,
    goblinsDefeated: state.goblinsDefeated + 1,
  };
}

/**
 * Awards a bonus coin pickup.
 * @param state Current session state.
 * @returns The state with the coin score added.
 */
export function collectCoin(state: GameState): GameState {
  if (state.status !== "playing") return state;
  return { ...state, score: state.score + SCORE_PER_COIN };
}

/**
 * Chooses a goblin heading at its current cell.
 * @param grid Oriented maze grid.
 * @param mover Goblin position and heading.
 * @param target Cell the goblin is chasing or fleeing.
 * @param random Deterministic generator used at junctions.
 * @param mode `chase` closes on the target, `flee` retreats, `patrol` wanders.
 * @returns The heading the goblin should take from this cell.
 */
export function chooseGoblinDirection(
  grid: MazeGrid,
  mover: MoverState,
  target: MazeCell,
  random: () => number,
  mode: "chase" | "flee" | "patrol",
): Direction {
  const col = Math.round(mover.col);
  const row = Math.round(mover.row);
  const legal = DIRECTIONS.filter((option) =>
    canEnter(grid, col + option.dirCol, row + option.dirRow),
  );
  if (legal.length === 0) return STOPPED;

  const moving = mover.dirCol !== 0 || mover.dirRow !== 0;
  const forward = legal.filter(
    (option) =>
      !(
        moving &&
        option.dirCol === -mover.dirCol &&
        option.dirRow === -mover.dirRow
      ),
  );
  const choices = forward.length > 0 ? forward : legal;

  if (mode === "patrol") {
    const index = Math.min(
      choices.length - 1,
      Math.floor(random() * choices.length),
    );
    return choices[index]!;
  }

  let best = choices[0]!;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const option of choices) {
    const distance =
      Math.abs(col + option.dirCol - target.col) +
      Math.abs(row + option.dirRow - target.row);
    const score = mode === "chase" ? distance : -distance;
    if (score < bestScore) {
      bestScore = score;
      best = option;
    }
  }
  return best;
}

/**
 * Advances a walker along corridors, turning only where the maze allows.
 * @param grid Oriented maze grid.
 * @param mover Current position and heading.
 * @param want Heading the controller has requested.
 * @param distance Cells to travel this frame.
 * @returns The walker's next position and heading.
 */
export function stepMover(
  grid: MazeGrid,
  mover: MoverState,
  want: Direction,
  distance: number,
): MoverState {
  const centreCol = Math.round(mover.col);
  const centreRow = Math.round(mover.row);
  const aligned =
    Math.abs(mover.col - centreCol) < 0.2 &&
    Math.abs(mover.row - centreRow) < 0.2;

  let dirCol = mover.dirCol;
  let dirRow = mover.dirRow;
  let col = mover.col;
  let row = mover.row;

  if (aligned) {
    const wants = want.dirCol !== 0 || want.dirRow !== 0;
    const turning =
      wants &&
      (want.dirCol !== dirCol || want.dirRow !== dirRow) &&
      canEnter(grid, centreCol + want.dirCol, centreRow + want.dirRow);
    const blocked = !canEnter(grid, centreCol + dirCol, centreRow + dirRow);

    // Only snap to the cell centre when the heading actually changes, otherwise
    // a frame step smaller than the alignment window would pin the walker in place.
    if (turning || blocked) {
      col = centreCol;
      row = centreRow;
      if (turning) {
        dirCol = want.dirCol;
        dirRow = want.dirRow;
      } else {
        dirCol = 0;
        dirRow = 0;
      }
    }
  }

  return {
    col: col + dirCol * distance,
    row: row + dirRow * distance,
    dirCol,
    dirRow,
  };
}

/**
 * Renders the learner's sentence progress with blanks for uncollected words.
 * @param round Active sentence round.
 * @param wordIndex Index of the next word to collect.
 * @returns A readable progress line such as `The brave ___ ___`.
 */
export function sentenceProgress(
  round: SentenceRound,
  wordIndex: number,
): string {
  return round.words
    .map((word, index) =>
      index < wordIndex ? word : "_".repeat(Math.max(3, word.length)),
    )
    .join(" ");
}

/**
 * Converts session state into the immutable host result contract.
 * @param state Terminal session state.
 * @returns Validated display results for `context.complete`.
 */
export function results(state: GameState): GameResults {
  const accuracy =
    state.totalAttempts === 0 ? 0 : state.correctAnswers / state.totalAttempts;
  return {
    accuracy: Math.min(1, Math.max(0, accuracy)),
    xp: Math.max(
      0,
      Math.round(state.correctAnswers * 10 + state.sentencesCompleted * 25),
    ),
    score: Math.max(0, Math.round(state.score)),
    correctAnswers: state.correctAnswers,
    totalAttempts: state.totalAttempts,
  };
}
