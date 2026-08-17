import type { GameResults } from "@reading-advantage/game-contracts";

/** Capability identifiers accepted by the pinned developer-kit beta. */
export const ACCEPTED_CAPABILITY_IDS = Object.freeze([
  "capability:nonempty-content-precondition",
  "capability:language-target-progression",
  "capability:single-completion-emission",
  "capability:result-accounting",
  "capability:input-action-normalization",
  "capability:bounded-frame-delta",
  "capability:time-and-frame-loop",
] as const);

/** One validated playable content item. */
export interface NonEmptyContentItem {
  readonly term: string;
  readonly translation: string;
}

/** Validated nonempty playable content. */
export interface NonEmptyContent {
  readonly kind: "vocabulary" | "sentence";
  readonly items: readonly NonEmptyContentItem[];
}

/**
 * Validates playable content before game-specific setup.
 * @param input Untrusted host content.
 * @param kind Educational content kind.
 * @returns Frozen, nonblank content.
 */
export function validateNonEmptyContent(
  input: unknown,
  kind: "vocabulary" | "sentence" = "vocabulary",
): NonEmptyContent {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("Nonempty content precondition rejects empty content");
  }
  const items = input.map((entry, index) => {
    if (entry === null || typeof entry !== "object") {
      throw new Error(`Content entry ${index} must be an object`);
    }
    const { term, translation } = entry as Record<string, unknown>;
    if (typeof term !== "string" || !term.trim()) {
      throw new Error(`Content entry ${index} has a blank term`);
    }
    if (typeof translation !== "string" || !translation.trim()) {
      throw new Error(`Content entry ${index} has a blank translation`);
    }
    return Object.freeze({ term, translation });
  });
  return Object.freeze({ kind, items: Object.freeze(items) });
}

/** Ordered target progression state. */
export interface LanguageTargetProgression {
  readonly index: number;
  readonly complete: boolean;
  readonly current: string | undefined;
  match(candidate: string): Readonly<{
    matched: boolean;
    index: number;
    complete: boolean;
  }>;
}

/**
 * Creates deterministic ordered target progression.
 * @param targets Ordered language targets.
 * @returns A progression matcher.
 */
export function createLanguageTargetProgression(
  targets: readonly string[],
): LanguageTargetProgression {
  if (targets.length === 0 || targets.some((target) => !target.trim())) {
    throw new Error("Language targets must be nonempty and nonblank");
  }
  let index = 0;
  return Object.freeze({
    get index() {
      return index;
    },
    get complete() {
      return index >= targets.length;
    },
    get current() {
      return targets[index];
    },
    match(candidate: string) {
      const matched = candidate === targets[index];
      if (matched) index += 1;
      return Object.freeze({ matched, index, complete: index >= targets.length });
    },
  });
}

/** Explicit game-owned display XP policy. */
export interface ResultAccountingPolicy {
  readonly xpPerCorrect: number;
  readonly xpPerAccuracyPoint: number;
  readonly xpCap?: number;
  readonly zeroAttemptsXp?: number;
}

/** Mutable result counters owned by the shared accountant. */
export interface ResultAccountant {
  readonly correctAnswers: number;
  readonly totalAttempts: number;
  readonly accuracy: number;
  readonly score: number;
  recordAttempt(attempt: { readonly correct: boolean }): void;
  addScore(points: number): void;
}

/**
 * Creates zero-initialized result counters.
 * @returns A result accountant.
 */
export function createResultAccountant(): ResultAccountant {
  let correctAnswers = 0;
  let totalAttempts = 0;
  let score = 0;
  return Object.freeze({
    get correctAnswers() {
      return correctAnswers;
    },
    get totalAttempts() {
      return totalAttempts;
    },
    get accuracy() {
      return totalAttempts === 0 ? 0 : correctAnswers / totalAttempts;
    },
    get score() {
      return score;
    },
    recordAttempt({ correct }: { readonly correct: boolean }) {
      totalAttempts += 1;
      if (correct) correctAnswers += 1;
    },
    addScore(points: number) {
      if (!Number.isFinite(points)) throw new Error("Score points must be finite");
      score += points;
    },
  });
}

/**
 * Finalizes shared counters into the stable result contract.
 * @param accountant Counters to finalize.
 * @param policy Display XP policy owned by the game.
 * @returns A frozen five-field result.
 */
export function finalizeResult(
  accountant: ResultAccountant,
  policy: ResultAccountingPolicy,
): GameResults {
  const rawXp = accountant.totalAttempts === 0
    ? (policy.zeroAttemptsXp ?? 0)
    : accountant.correctAnswers * policy.xpPerCorrect +
      accountant.accuracy * policy.xpPerAccuracyPoint;
  const xp = Math.min(
    Math.max(0, Math.floor(rawXp)),
    policy.xpCap === undefined ? Number.MAX_SAFE_INTEGER : Math.max(0, Math.floor(policy.xpCap)),
  );
  return Object.freeze({
    accuracy: accountant.accuracy,
    xp,
    score: Math.max(0, Math.floor(accountant.score)),
    correctAnswers: accountant.correctAnswers,
    totalAttempts: accountant.totalAttempts,
  });
}

/** Fire-once completion boundary. */
export interface CompletionLatch {
  readonly completed: boolean;
  complete(result: GameResults): boolean;
}

/**
 * Creates an exactly-once completion emitter.
 * @param emit Host result callback.
 * @returns A completion latch.
 */
export function createCompletionLatch(
  emit: (result: GameResults) => void,
): CompletionLatch {
  let completed = false;
  return Object.freeze({
    get completed() {
      return completed;
    },
    complete(result: GameResults) {
      if (completed) return false;
      completed = true;
      emit(result);
      return true;
    },
  });
}

/**
 * Clamps an animation delta to protect deterministic simulation steps.
 * @param deltaMs Raw frame delta in milliseconds.
 * @param maximumMs Maximum accepted delta.
 * @returns A finite delta from zero through the maximum.
 */
export function clampFrameDelta(deltaMs: number, maximumMs = 50): number {
  if (!Number.isFinite(deltaMs)) return 0;
  return Math.min(Math.max(0, deltaMs), maximumMs);
}
