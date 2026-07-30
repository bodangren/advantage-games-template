import Phaser from "phaser";
import { COLORS } from "../core/Constants";

/**
 * Displays the English letters that have been poured into the cauldron.
 * Shows letters in order as they are successfully poured.
 */
export class UsedLettersDisplay extends Phaser.GameObjects.Container {
  private letterTexts: Phaser.GameObjects.Text[] = [];
  private panel: Phaser.GameObjects.Graphics;
  private usedLetters: string[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Background panel
    this.panel = scene.add.graphics();
    this.add(this.panel);
    this.drawPanel(200);

    this.setScrollFactor(0);
    this.setDepth(90);
    scene.add.existing(this);
  }

  private drawPanel(width: number): void {
    this.panel.clear();
    this.panel.fillStyle(0x1a1730, 0.7);
    this.panel.fillRoundedRect(-width / 2, -18, width, 36, 8);
    this.panel.lineStyle(1, COLORS.GLOW_PURPLE, 0.2);
    this.panel.strokeRoundedRect(-width / 2, -18, width, 36, 8);
  }

  /** Adds a letter to the display. */
  addLetter(letter: string): void {
    this.usedLetters.push(letter);
    this.refreshDisplay();
  }

  /** Clears all letters and resets the display. */
  clear(): void {
    this.usedLetters = [];
    this.letterTexts.forEach((t) => t.destroy());
    this.letterTexts = [];
    this.drawPanel(200);
  }

  /** Refreshes the visual display of letters. */
  private refreshDisplay(): void {
    // Clear old texts
    this.letterTexts.forEach((t) => t.destroy());
    this.letterTexts = [];

    if (this.usedLetters.length === 0) {
      this.drawPanel(200);
      return;
    }

    // Calculate panel width based on letter count
    const spacing = 24;
    const totalWidth = Math.max(100, this.usedLetters.length * spacing + 40);
    this.drawPanel(totalWidth);

    // Create letter texts
    const startX = -(this.usedLetters.length - 1) * spacing / 2;

    this.usedLetters.forEach((letter, i) => {
      const text = this.scene.add.text(startX + i * spacing, 0, letter, {
        fontSize: "18px",
        fontFamily: "Georgia, serif",
        color: COLORS.LETTER_CORRECT,
        fontStyle: "bold",
      });
      text.setOrigin(0.5);

      // Entrance animation
      text.setAlpha(0);
      text.setScale(0.5);
      this.scene.tweens.add({
        targets: text,
        alpha: 1,
        scale: 1,
        duration: 200,
        ease: "Back.easeOut",
      });

      this.letterTexts.push(text);
      this.add(text);
    });
  }
}
