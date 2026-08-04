import type { Rng } from "./LetterBag";
import type { WordDifficulty } from "../data/words";

/** Soil color depth used to shade tiles (0 = shallow, 2 = deep). */
export type SoilLevel = 0 | 1 | 2;

/** Lifespan of a cell: hidden stone, exposed gem, or emptied hole. */
export type CellState = "stone" | "gem" | "dug";

/** Result of digging a cell: which stage happened and the revealed letter. */
export type DigResult =
  | { type: "empty"; cell: MineCell }
  | { type: "reveal"; cell: MineCell }
  | { type: "letter"; cell: MineCell; letter: string };

/** One grid cell on the mining floor. */
export interface MineCell {
  x: number;
  y: number;
  letter: string | null;
  difficulty: WordDifficulty | null;
  state: CellState;
  soil: SoilLevel;
}

/** A letter to place on the grid, with the difficulty driving its visuals. */
export interface LetterPlacement {
  letter: string;
  difficulty: WordDifficulty;
}

/** A 2D top-down grid of diggable cells. */
export class MineGrid {
  readonly cols: number;
  readonly rows: number;
  readonly cells: MineCell[];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.cells = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.cells.push({ x, y, letter: null, difficulty: null, state: "stone", soil: soilFor(y, rows) });
      }
    }
  }

  /** Places the given letters at random unoccupied cells, returning the cells used. */
  scatter(placements: readonly LetterPlacement[], rng: Rng): MineCell[] {
    const placed: MineCell[] = [];
    const open = this.cells.filter((c) => c.letter === null);
    for (const p of placements) {
      if (open.length === 0) break;
      const idx = Math.floor(rng() * open.length);
      const cell = open.splice(idx, 1)[0];
      cell.letter = p.letter;
      cell.difficulty = p.difficulty;
      placed.push(cell);
    }
    return placed;
  }

  /** Cell at grid coordinates, or undefined when out of bounds. */
  at(x: number, y: number): MineCell | undefined {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return undefined;
    return this.cells[y * this.cols + x];
  }

  /**
   * Digs a cell through its two layers. First dig breaks the stone, revealing an
   * embedded gem (letter stays hidden). Second dig breaks the gem and returns
   * the hidden letter. Empty cells become dug holes in a single dig.
   */
  dig(x: number, y: number): DigResult | null {
    const cell = this.at(x, y);
    if (!cell || cell.state === "dug") return null;
    if (cell.state === "gem") {
      cell.state = "dug";
      const letter = cell.letter;
      cell.letter = null;
      return letter === null ? { type: "empty", cell } : { type: "letter", cell, letter };
    }
    // stone
    if (cell.letter === null) {
      cell.state = "dug";
      return { type: "empty", cell };
    }
    cell.state = "gem";
    return { type: "reveal", cell };
  }

  /** Total cells still holding an unrevealed letter. */
  get remainingLetters(): number {
    return this.cells.filter((c) => c.state === "stone" && c.letter !== null).length;
  }
}

/** Maps a row to a soil depth (deeper rows are richer soil). */
function soilFor(y: number, rows: number): SoilLevel {
  const ratio = y / Math.max(1, rows - 1);
  if (ratio > 0.66) return 2;
  if (ratio > 0.33) return 1;
  return 0;
}