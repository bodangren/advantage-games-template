import Phaser from "phaser";
import { CHIBI, SKELETON } from "../data/visual";

/** Direction the miner faces, drives arm swing and pickaxe side. */
export type Facing = "left" | "right";

/** How many ticks the pickaxe swing animation lasts. */
const SWING_DURATION = 160;

/**
 * Chibi Skeleton Miner drawn entirely from Phaser graphics (no external art).
 * Tiny body, big head, bone limbs, dusty-orange miner helmet with a headlamp,
 * and a pickaxe that swings when the player digs.
 */
export class ChibiSkeletonMiner {
  readonly container: Phaser.GameObjects.Container;
  private g: Phaser.GameObjects.Graphics;
  private facing: Facing = "right";
  private swinging = false;
  private swingStart = 0;
  private moving = false;
  private swayT = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, size: number) {
    this.container = scene.add.container(x, y);
    this.g = scene.add.graphics();
    this.container.add(this.g);
    this.draw(size);
  }

  /** Sets the pixel height of the character and redraws it. */
  setSize(size: number): void {
    this.container.setData("size", size);
    this.draw(size);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  setAlpha(alpha: number): void {
    this.container.setAlpha(alpha);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /** Changes facing so the pickaxe swings from the correct side. */
  setFacing(facing: Facing): void {
    if (this.facing !== facing) {
      this.facing = facing;
      this.draw(this.container.getData("size") as number);
    }
  }

  /** Updates the idle walk sway; call every frame with a time value. */
  update(time: number, moving: boolean): void {
    this.moving = moving;
    if (this.swinging) return;
    if (moving) {
      this.swayT = (time / 140) % (Math.PI * 2);
      this.container.y = this.container.y + Math.sin(this.swayT) * 0.6;
      // Small bob handled by the draw's walk pose flag.
      this.draw(this.container.getData("size") as number);
    } else if (this.container.getData("size")) {
      // Idle: settle to a neutral standing pose once.
      this.container.y = this.container.y;
    }
  }

  /** Begins the pickaxe swing animation. */
  swing(): void {
    this.swinging = true;
    this.swingStart = Date.now();
    this.draw(this.container.getData("size") as number);
  }

  /** Advances the swing animation; call from the scene update. */
  tickSwing(): void {
    if (!this.swinging) return;
    if (Date.now() - this.swingStart > SWING_DURATION) {
      this.swinging = false;
      this.draw(this.container.getData("size") as number);
    } else {
      this.draw(this.container.getData("size") as number);
    }
  }

  private draw(size: number): void {
    if (!size) return;
    const g = this.g;
    g.clear();
    const flip = this.facing === "left" ? -1 : 1;
    const bob = this.moving && !this.swinging ? Math.sin(this.swayT) * size * 0.015 : 0;
    const headR = size * CHIBI.headRadius;
    const bodyR = size * CHIBI.bodyRadius;
    const bodyCx = 0;
    const bodyCy = size * 0.05 - bob;
    const headCy = bodyCy - bodyR - headR * 0.75;
    const swing = this.swinging ? Math.sin(Math.max(0, Math.min(1, (Date.now() - this.swingStart) / SWING_DURATION)) * Math.PI) : 0;

    // ---- Legs (short chibi legs) ----
    const legW = size * 0.07;
    g.lineStyle(legW, SKELETON.bone, 1);
    g.lineBetween(-size * 0.1, bodyCy + bodyR * 0.5, -size * 0.14, bodyCy + bodyR + size * 0.28);
    g.lineBetween(size * 0.1, bodyCy + bodyR * 0.5, size * 0.16, bodyCy + bodyR + size * 0.28);
    // Feet
    g.fillStyle(SKELETON.boneShade, 1);
    g.fillEllipse(-size * 0.14, bodyCy + bodyR + size * 0.3, size * 0.16, size * 0.06);
    g.fillEllipse(size * 0.16, bodyCy + bodyR + size * 0.3, size * 0.16, size * 0.06);

    // ---- Arms ----
    const armW = size * 0.06;
    const backHandY = bodyCy + size * 0.02;
    // Back arm holds pickaxe when swinging.
    if (this.swinging) {
      // Pickaxe raised toward the dig direction.
      g.lineStyle(armW, SKELETON.bone, 1);
      const ax = flip * size * (0.28 + swing * 0.16);
      const ay = bodyCy - size * 0.05 - swing * size * 0.1;
      g.lineBetween(flip * size * 0.18, bodyCy, ax, ay);
      this.drawPickaxe(ax, ay, flip, swing);
    } else {
      // Neutral arms slightly apart.
      g.lineStyle(armW, SKELETON.bone, 1);
      g.lineBetween(flip * size * 0.16, bodyCy, flip * size * 0.3, backHandY + size * 0.06);
      g.lineBetween(-flip * size * 0.16, bodyCy, -flip * size * 0.3, backHandY + size * 0.06);
      this.drawPickaxe(flip * size * 0.3, backHandY + size * 0.06, flip, 0);
    }

    // ---- Torso (rib cage) ----
    g.fillStyle(SKELETON.bone, 1);
    g.fillCircle(bodyCx, bodyCy, bodyR);
    g.fillStyle(SKELETON.boneShade, 1);
    g.fillRect(bodyCx - bodyR, bodyCy - bodyR * 0.4, bodyR * 2, bodyR * 0.5);
    // Ribs
    g.lineStyle(size * 0.02, SKELETON.boneDark, 0.8);
    for (let i = 0; i < 3; i++) {
      const ry = bodyCy - bodyR * 0.3 + i * bodyR * 0.35;
      g.lineBetween(bodyCx - bodyR * 0.85, ry, bodyCx + bodyR * 0.85, ry);
    }
    // Scarf/bandana
    g.fillStyle(SKELETON.scarf, 1);
    g.fillEllipse(bodyCx, bodyCy - bodyR * 0.85, bodyR * 1.9, bodyR * 0.5);
    g.fillStyle(SKELETON.scarf, 1);
    g.fillRect(bodyCx, bodyCy - bodyR * 0.8, bodyR * 0.9, bodyR * 0.4);

    // ---- Head (big chibi skull) ----
    g.fillStyle(SKELETON.bone, 1);
    g.fillCircle(bodyCx, headCy, headR);
    g.fillStyle(SKELETON.boneShade, 1);
    g.fillCircle(bodyCx, headCy + headR * 0.35, headR * 0.9);
    // Jaw
    g.fillStyle(SKELETON.boneDark, 0.35);
    g.fillRect(bodyCx - headR * 0.55, headCy + headR * 0.35, headR * 1.1, headR * 0.25);
    // Eye sockets
    g.fillStyle(SKELETON.outline, 1);
    g.fillCircle(bodyCx - headR * 0.32, headCy - headR * 0.15, headR * 0.22);
    g.fillCircle(bodyCx + headR * 0.32, headCy - headR * 0.15, headR * 0.22);
    g.fillStyle(SKELETON.glove, 1);
    g.fillCircle(bodyCx - headR * 0.32, headCy - headR * 0.15, headR * 0.08);
    g.fillCircle(bodyCx + headR * 0.32, headCy - headR * 0.15, headR * 0.08);
    // Nose hole
    g.fillStyle(SKELETON.outline, 1);
    g.fillCircle(bodyCx, headCy + headR * 0.1, headR * 0.08);

    // ---- Helmet ----
    g.fillStyle(SKELETON.helmet, 1);
    g.beginPath();
    g.arc(bodyCx, headCy - headR * 0.2, headR * 1.02, Math.PI, 0, false);
    g.fillPath();
    g.fillStyle(SKELETON.helmetDark, 1);
    g.fillRect(bodyCx - headR * 1.02, headCy - headR * 0.22, headR * 2.04, headR * 0.18);
    // Headlamp
    g.fillStyle(SKELETON.headlamp, 1);
    g.fillCircle(flip * headR * 0.7, headCy - headR * 0.45, headR * 0.2);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(flip * headR * 0.7, headCy - headR * 0.45, headR * 0.09);
  }

  private drawPickaxe(x: number, y: number, flip: number, swing: number): void {
    const g = this.g;
    // Handle
    const len = this.container.getData("size") as number * 0.36;
    g.lineStyle(len * 0.12, SKELETON.pickHandle, 1);
    g.lineBetween(x, y, x + flip * len, y - swing * len * 0.6);
    g.lineStyle(len * 0.06, SKELETON.pickHandleShade, 1);
    g.lineBetween(x + flip * len * 0.2, y - swing * len * 0.12, x + flip * len, y - swing * len * 0.6);
    // Head (pick)
    const hx = x + flip * len;
    const hy = y - swing * len * 0.6;
    g.fillStyle(SKELETON.pickHead, 1);
    g.fillRect(hx - len * 0.18, hy - len * 0.22, len * 0.42, len * 0.12);
    g.fillStyle(SKELETON.pickHeadShade, 1);
    g.fillRect(hx - len * 0.18, hy - len * 0.22, len * 0.14, len * 0.12);
    // Spike
    g.fillStyle(SKELETON.pickHeadShade, 1);
    g.fillTriangle(hx - len * 0.24, hy - len * 0.22, hx - len * 0.34, hy - len * 0.12, hx - len * 0.1, hy - len * 0.1);
    g.fillTriangle(hx + len * 0.24, hy - len * 0.22, hx + len * 0.34, hy - len * 0.12, hx + len * 0.1, hy - len * 0.1);
  }
}