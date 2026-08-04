import type { Rng } from "./LetterBag";

/** Orientation of a sweeping laser beam. */
export type LaserDirection = "vertical" | "horizontal" | "diag-left" | "diag-right";

/** One scheduled laser sweep with absolute event timeline. */
export interface LaserEvent {
  /** Milliseconds (game clock) when the guide line first appears. */
  guideStart: number;
  /** Milliseconds when the dangerous beam starts sweeping. */
  fireStart: number;
  /** Milliseconds when the beam disappears. */
  end: number;
  direction: LaserDirection;
  /** Sweep offset along the beam's normal at fire start (0..1). */
  sweepFrom: number;
  /** Sweep offset along the beam's normal when it finishes (0..1). */
  sweepTo: number;
}

/** Warning duration before a beam becomes lethal. */
export const GUIDE_DURATION = 800;
/** Lethal sweep duration. */
export const FIRE_DURATION = 1100;
/** Randomised intervals (ms) between beam appearances: 2 / 3 / 4 seconds. */
export const INTERVALS: readonly number[] = [2000, 3000, 4000];

/** Picks one of the allowed random intervals. */
export function pickInterval(rng: Rng): number {
  const idx = Math.floor(rng() * INTERVALS.length);
  return INTERVALS[Math.min(idx, INTERVALS.length - 1)];
}

/** Picks one of the four sweep orientations at random. */
export function pickDirection(rng: Rng): LaserDirection {
  const all: LaserDirection[] = ["vertical", "horizontal", "diag-left", "diag-right"];
  const idx = Math.floor(rng() * all.length);
  return all[Math.min(idx, all.length - 1)];
}

/**
 * Builds one laser event whose guide line starts at `guideStart`, drawing its
 * direction and sweep range from the deterministic `rng`.
 */
export function nextEvent(guideStart: number, rng: Rng): LaserEvent {
  const direction = pickDirection(rng);
  return {
    guideStart,
    fireStart: guideStart + GUIDE_DURATION,
    end: guideStart + GUIDE_DURATION + FIRE_DURATION,
    direction,
    sweepFrom: rng(),
    sweepTo: Math.min(1, Math.max(0, rng())),
  };
}

/**
 * Builds a fixed chain of `count` laser events. The first guide starts at
 * `firstGuideStart`; subsequent guides start `interval` ms after the previous
 * guide. This is a bounded helper for tests and short previews; the live game
 * uses {@link LaserScheduler} so lasers keep firing until the game ends.
 */
export function buildLaserSchedule(
  count: number,
  firstGuideStart: number,
  rng: Rng,
  opts?: { guide?: number; fire?: number }
): LaserEvent[] {
  const guide = opts?.guide ?? GUIDE_DURATION;
  const fire = opts?.fire ?? FIRE_DURATION;
  const events: LaserEvent[] = [];
  let guideStart = firstGuideStart;
  for (let i = 0; i < count; i++) {
    const interval = pickInterval(rng);
    const ev = nextEvent(guideStart, rng);
    events.push({ ...ev, fireStart: guideStart + guide, end: guideStart + guide + fire });
    guideStart += interval;
  }
  return events;
}

/**
 * An unbounded, seeded laser generator. It produces new {@link LaserEvent}s on
 * demand so beams keep sweeping for as long as a run lasts (until win or loss),
 * never stopping at a fixed count. Old events are pruned as time advances.
 */
export class LaserScheduler {
  private rng: Rng;
  private events: LaserEvent[] = [];
  private nextGuideStart: number;
  private bufferMs: number;

  /**
   * @param rng Deterministic generator shared with the rest of the run.
   * @param firstGuideStart Game-clock ms when the first guide line appears.
   * @param bufferMs How far ahead of the current time to pre-generate events.
   */
  constructor(rng: Rng, firstGuideStart = 0, bufferMs = 30000) {
    this.rng = rng;
    this.nextGuideStart = firstGuideStart;
    this.bufferMs = bufferMs;
  }

  /** Drops events that finished before `time` to bound memory. */
  private prune(time: number): void {
    if (this.events.length === 0) return;
    const firstAlive = this.events.findIndex((e) => e.end > time);
    if (firstAlive > 0) this.events = this.events.slice(firstAlive);
  }

  /**
   * Generates laser events until the schedule covers `time` plus the lookahead
   * buffer. Call every frame with the current game clock.
   */
  ensureUpTo(time: number): void {
    this.prune(time);
    const horizon = time + this.bufferMs;
    let last = this.events[this.events.length - 1];
    while (!last || last.end < horizon) {
      const ev = nextEvent(this.nextGuideStart, this.rng);
      this.events.push(ev);
      this.nextGuideStart += pickInterval(this.rng);
      last = ev;
    }
  }

  /** Events that are still guiding or firing at `time`. */
  activeAt(time: number): LaserEvent[] {
    return this.events.filter((e) => e.end > time);
  }
}

/** Current normal-axis offset of the beam at time t, or null when not firing. */
export function sweepOffset(event: LaserEvent, t: number): number | null {
  if (t < event.fireStart || t >= event.end) return null;
  const span = Math.max(1, event.end - event.fireStart);
  const f = Math.min(1, Math.max(0, (t - event.fireStart) / span));
  return event.sweepFrom + (event.sweepTo - event.sweepFrom) * f;
}

/** Whether the guide line should be visible at time t. */
export function isGuiding(event: LaserEvent, t: number): boolean {
  return t >= event.guideStart && t < event.fireStart;
}

/** Whether the lethal beam is sweeping at time t. */
export function isFiring(event: LaserEvent, t: number): boolean {
  return t >= event.fireStart && t < event.end;
}

/** Normal unit vector (nx, ny) of the beam band for a direction. */
export function beamNormal(direction: LaserDirection): { nx: number; ny: number } {
  switch (direction) {
    case "vertical":
      return { nx: 1, ny: 0 };
    case "horizontal":
      return { nx: 0, ny: 1 };
    case "diag-left":
      return { nx: Math.SQRT1_2, ny: -Math.SQRT1_2 };
    case "diag-right":
      return { nx: Math.SQRT1_2, ny: Math.SQRT1_2 };
  }
}

/** Signed distance from a normalized point (0..1 each axis) to the beam line. */
export function distanceToBeam(direction: LaserDirection, offset: number, px: number, py: number): number {
  const { nx, ny } = beamNormal(direction);
  return Math.abs(nx * px + ny * py - offset);
}

/** True when the point is within `thickness` of the current sweeping beam. */
export function hitsPoint(event: LaserEvent, t: number, px: number, py: number, thickness: number): boolean {
  if (!isFiring(event, t)) return false;
  const offset = sweepOffset(event, t);
  if (offset === null) return false;
  return distanceToBeam(event.direction, offset, px, py) <= thickness;
}

/** Whether a laser event is still in its warning or firing window. */
export function isVisible(event: LaserEvent, t: number): boolean {
  return isGuiding(event, t) || isFiring(event, t);
}