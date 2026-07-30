import Phaser from "phaser";

/** Global event bus for SpellLab Potion Master. */
export const EventBus = new Phaser.Events.EventEmitter();

/** All game events. */
export const Events = {
  /** A bottle was tapped or dragged to the cauldron. */
  BOTTLE_POUR: "bottle:pour",
  /** The poured letter was correct. */
  LETTER_CORRECT: "letter:correct",
  /** The poured letter was wrong. */
  LETTER_WRONG: "letter:wrong",
  /** Current word was completed successfully. */
  WORD_COMPLETE: "word:complete",
  /** Current word failed (wrong letter). */
  WORD_FAIL: "word:fail",
  /** A batch of 5 words is done — show review. */
  BATCH_COMPLETE: "batch:complete",
  /** Review card dismissed — continue to next batch or end. */
  REVIEW_DISMISSED: "review:dismissed",
  /** All 10 words done — show game over. */
  GAME_COMPLETE: "game:complete",
  /** Star toggled on a word. */
  STAR_TOGGLE: "star:toggle",
  /** Player requests help screen. */
  HELP_REQUEST: "help:request",
  /** Help screen dismissed. */
  HELP_DISMISSED: "help:dismissed",
  /** Game restart requested. */
  GAME_RESTART: "game:restart",
} as const;
