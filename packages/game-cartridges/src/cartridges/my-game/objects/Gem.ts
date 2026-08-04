import Phaser from "phaser";
import type { WordDifficulty } from "../data/words";
import { FONT, GEM_SHADE, letterVisual } from "../data/visual";

/**
 * A Terraria-style gem drawn as a faceted diamond (code graphics) with the
 * revealed letter shown on its face. Easy gems are small and lime green; hard
 * gems are larger and amber gold.
 */
export class Gem {
  readonly container: Phaser.GameObjects.Container;
  private g: Phaser.GameObjects.Graphics;
  private letter: string;
  private difficulty: WordDifficulty;
  private size: number;

  constructor(scene: Phaser.Scene, x: number, y: number, letter: string, difficulty: WordDifficulty, size: number) {
    this.letter = letter;
    this.difficulty = difficulty;
    this.size = size;
    this.container = scene.add.container(x, y);
    this.g = scene.add.graphics();
    this.container.add(this.g);
    this.draw();
  }

  /**
   * Reveals the letter on the gem face after `delayMs`. The gem bounces out of
   * the dug block first, then the letter pops on top with a clear, bouncy pop
   * and a quick flash so the letter is easy to read.
   */
  revealLetter(delayMs: number): void {
    const scene = this.container.scene;
    const s = this.size;
    scene.time.delayedCall(delayMs, () => {
      if (!this.container.active) return;
      // Quick white flash behind the gem for clarity.
      const flash = scene.add.circle(0, 0, s * 1.6, 0xffffff, 0.7).setDepth(-1);
      this.container.add(flash);
      scene.tweens.add({ targets: flash, alpha: 0, scale: 1.6, duration: 220, ease: "Quad.easeOut", onComplete: () => flash.destroy() });

      const label = scene.add
        .text(0, 0, this.letter, {
          fontFamily: FONT,
          fontSize: `${Math.round(s * 0.85)}px`,
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#101010",
          strokeThickness: Math.max(3, Math.round(s * 0.12)),
        })
        .setOrigin(0.5)
        .setScale(0.1);
      this.container.add(label);
      scene.tweens.add({ targets: label, scale: 1.6, duration: 110, ease: "Back.easeIn" });
      scene.tweens.add({ targets: label, scale: 1, duration: 130, delay: 110, ease: "Back.easeOut" });
    });
  }

  private draw(): void {
    const g = this.g;
    g.clear();
    const vis = letterVisual(this.difficulty);
    const s = this.size;
    // Faceted diamond: top, left, right, bottom facets with a bright core.
    g.fillStyle(vis.color, 0.55);
    g.beginPath();
    g.moveTo(0, -s);
    g.lineTo(s, 0);
    g.lineTo(0, s);
    g.lineTo(-s, 0);
    g.closePath();
    g.fillPath();
    // Inner brighter core
    g.fillStyle(0xffffff, 0.5);
    g.beginPath();
    g.moveTo(0, -s * 0.5);
    g.lineTo(s * 0.5, 0);
    g.lineTo(0, s * 0.5);
    g.lineTo(-s * 0.5, 0);
    g.closePath();
    g.fillPath();
    // Shade edge (bottom-left) for depth
    g.lineStyle(s * 0.08, GEM_SHADE, 0.35);
    g.beginPath();
    g.moveTo(-s, 0);
    g.lineTo(0, s);
    g.lineTo(s, 0);
    g.strokePath();
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  setScrollFactor(value: number): void {
    this.container.setScrollFactor(value);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  setAlpha(alpha: number): void {
    this.container.setAlpha(alpha);
  }

  destroy(): void {
    this.container.destroy();
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }
}