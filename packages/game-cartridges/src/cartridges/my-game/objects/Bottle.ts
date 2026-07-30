import Phaser from "phaser";
import { BOTTLE, COLORS } from "../core/Constants";
import type { PreparedBottle } from "../systems";

/**
 * A potion bottle game object with procedural Cult of the Lamb style art.
 * Supports drag-and-drop and tap interactions.
 */
export class Bottle extends Phaser.GameObjects.Container {
  private bottleData: PreparedBottle;
  private bottleGraphics: Phaser.GameObjects.Graphics;
  private letterTexts: Phaser.GameObjects.Text[] = [];
  private glowCircle: Phaser.GameObjects.Arc;
  private originalX: number;
  private originalY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, data: PreparedBottle) {
    super(scene, x, y);
    this.bottleData = data;
    this.originalX = x;
    this.originalY = y;

    const color = COLORS.BOTTLE_COLORS[data.colorIndex % COLORS.BOTTLE_COLORS.length]!;

    // Glow effect behind bottle
    this.glowCircle = scene.add.circle(0, 0, BOTTLE.WIDTH * 0.7, color, 0.15);
    this.add(this.glowCircle);

    // Draw bottle body
    this.bottleGraphics = scene.add.graphics();
    this.drawBottle(color);
    this.add(this.bottleGraphics);

    // Draw letters on bottle
    this.createLetterDisplay(data.letters);

    // Make interactive
    this.setSize(BOTTLE.WIDTH, BOTTLE.HEIGHT + BOTTLE.NECK_HEIGHT);
    this.setInteractive({ useHandCursor: true, draggable: true });

    scene.add.existing(this);
  }

  private drawBottle(color: number): void {
    const g = this.bottleGraphics;
    const w = BOTTLE.WIDTH;
    const h = BOTTLE.HEIGHT;
    const nw = BOTTLE.NECK_WIDTH;
    const nh = BOTTLE.NECK_HEIGHT;
    const cr = BOTTLE.CORNER_RADIUS;

    g.clear();

    // Bottle neck
    g.fillStyle(color, 0.9);
    g.fillRoundedRect(-nw / 2, -h / 2 - nh, nw, nh, 4);

    // Neck rim
    g.fillStyle(0xffffff, 0.3);
    g.fillRoundedRect(-nw / 2 - 2, -h / 2 - nh, nw + 4, 4, 2);

    // Bottle body
    g.fillStyle(color, 0.85);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, cr);

    // Inner highlight (glass effect)
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w * 0.3, h - 8, cr - 2);

    // Potion liquid inside (bottom portion)
    g.fillStyle(color, 0.5);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + h * 0.4, w - 6, h * 0.55, cr - 2);

    // Shine dot on liquid
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(-w / 4, -h / 2 + h * 0.5, 3);

    // Bottom shadow
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(-w / 2 + 2, h / 2 - 6, w - 4, 6, 3);
  }

  private createLetterDisplay(letters: readonly string[]): void {
    const count = letters.length;
    const bottleH = BOTTLE.HEIGHT;
    const padding = 18;
    const usableH = bottleH - padding * 2;
    const spacing = Math.min(22, usableH / Math.max(count, 1));
    const totalH = (count - 1) * spacing;
    const startY = -totalH / 2;

    letters.forEach((letter, i) => {
      const text = this.scene.add.text(0, startY + i * spacing, letter, {
        fontSize: BOTTLE.LETTER_SIZE,
        fontFamily: BOTTLE.LETTER_FONT,
        color: COLORS.LETTER_ON_BOTTLE,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      });
      text.setOrigin(0.5);
      this.letterTexts.push(text);
      this.add(text);
    });
  }

  /** Returns the bottle's unique ID. */
  getBottleId(): string {
    return this.bottleData.id;
  }

  /** Returns the first (top) letter of this bottle, or null if empty. */
  getTopLetter(): string | null {
    return this.bottleData.letters.length > 0 ? this.bottleData.letters[0]! : null;
  }

  /** Returns the underlying bottle data. */
  getBottleData(): PreparedBottle {
    return this.bottleData;
  }

  /** Highlights the bottle when the player hovers or selects it. */
  highlight(on: boolean): void {
    this.glowCircle.setAlpha(on ? 0.4 : 0.15);
    if (on) {
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        ease: "Back.easeOut",
      });
    } else {
      this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
      });
    }
  }

  /** Removes a specific letter from the bottle display. */
  removeLetter(letter: string): void {
    const idx = this.bottleData.letters.indexOf(letter);
    if (idx === -1) return;

    // Find and animate the corresponding text
    if (idx >= 0 && idx < this.letterTexts.length) {
      const text = this.letterTexts[idx]!;
      this.scene.tweens.add({
        targets: text,
        alpha: 0,
        scale: 1.5,
        y: text.y - 20,
        duration: 300,
        onComplete: () => text.destroy(),
      });
      this.letterTexts.splice(idx, 1);
    }

    // Update data
    const newLetters = [...this.bottleData.letters];
    newLetters.splice(idx, 1);
    this.bottleData = { ...this.bottleData, letters: newLetters };
  }

  /** Updates the bottle data after a word restart. */
  updateData(data: PreparedBottle): void {
    this.bottleData = data;
    this.letterTexts.forEach((t) => t.destroy());
    this.letterTexts = [];
    const color = COLORS.BOTTLE_COLORS[data.colorIndex % COLORS.BOTTLE_COLORS.length]!;
    this.drawBottle(color);
    this.createLetterDisplay(data.letters);
  }

  /** Returns the bottle to its original position. */
  returnToOriginal(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.originalX,
      y: this.originalY,
      duration: 300,
      ease: "Back.easeOut",
    });
  }

  /** Plays a pour animation toward a target position. */
  playPourAnimation(targetX: number, targetY: number, onComplete: () => void): void {
    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY - 40,
      angle: -30,
      duration: 300,
      ease: "Quad.easeOut",
      onComplete: () => {
        const color =
          COLORS.BOTTLE_COLORS[this.bottleData.colorIndex % COLORS.BOTTLE_COLORS.length]!;
        for (let i = 0; i < 5; i++) {
          const drip = this.scene.add.circle(
            targetX + Phaser.Math.Between(-10, 10),
            targetY - 20,
            Phaser.Math.Between(2, 4),
            color,
            0.8,
          );
          this.scene.tweens.add({
            targets: drip,
            y: targetY + 20,
            alpha: 0,
            duration: 400,
            delay: i * 50,
            onComplete: () => drip.destroy(),
          });
        }

        this.scene.time.delayedCall(200, () => {
          this.angle = 0;
          onComplete();
        });
      },
    });
  }

  /** Pulse effect on correct pour. */
  playCorrectEffect(): void {
    const flash = this.scene.add.circle(0, 0, BOTTLE.WIDTH, COLORS.GLOW_GREEN, 0.5);
    this.add(flash);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 400,
      onComplete: () => flash.destroy(),
    });
  }

  /** Shake effect on wrong pour. */
  playWrongEffect(): void {
    const color = COLORS.BOTTLE_COLORS[this.bottleData.colorIndex % COLORS.BOTTLE_COLORS.length]!;
    this.drawBottle(0xff4444);
    this.scene.time.delayedCall(300, () => this.drawBottle(color));
  }

  /** Update the stored original position. */
  setOriginalPosition(x: number, y: number): void {
    this.originalX = x;
    this.originalY = y;
  }
}
