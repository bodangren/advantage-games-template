import type { CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit";
import type { DeckWord } from "../data/words";
import { buildDeck, sampleSessionDeck } from "../data/words";
import { seededRng } from "./LetterBag";
import { GameState } from "./GameState";

/**
 * Module-scoped runtime shared by every scene. The host mounts one cartridge
 * instance, so a single holder is sufficient and keeps Phaser scene classes
 * free of constructor dependencies.
 */
export interface Runtime {
  context: CartridgeGameConfigContext;
  /** The full 20-word pool (input merged with the fallback deck). */
  pool: DeckWord[];
  /** The 10 words (5 easy + 5 hard) active for the current run. */
  deck: DeckWord[];
  state: GameState;
  /** Starred word texts for the review screen (session-local, not sent to host). */
  starred: string[];
}

let runtime: Runtime | null = null;

/** Draws a fresh 10-word session deck from the full pool. */
function drawSessionDeck(pool: readonly DeckWord[]): DeckWord[] {
  return sampleSessionDeck(pool, seededRng(`deck:${Date.now()}`));
}

/** Initialises the shared runtime from the host context. */
export function configureRuntime(context: CartridgeGameConfigContext): Runtime {
  const pool = buildDeck(context.input);
  const deck = drawSessionDeck(pool);
  runtime = { context, pool, deck, state: new GameState(deck), starred: [] };
  return runtime;
}

/** The current shared runtime; callers must configure first. */
export function getRuntime(): Runtime {
  if (!runtime) throw new Error("Runtime not configured");
  return runtime;
}

/** Resets gameplay state and draws a fresh random 10-word deck for the next run. */
export function resetGame(): GameState {
  const current = getRuntime();
  current.deck = drawSessionDeck(current.pool);
  current.state = new GameState(current.deck);
  return current.state;
}

/** Toggles the star flag for a word and returns the new flag value. */
export function toggleStar(text: string): boolean {
  const current = getRuntime();
  const idx = current.starred.indexOf(text);
  if (idx >= 0) {
    current.starred.splice(idx, 1);
    return false;
  }
  current.starred.push(text);
  return true;
}

/** True when the given word text is currently starred. */
export function isStarred(text: string): boolean {
  return getRuntime().starred.indexOf(text) >= 0;
}