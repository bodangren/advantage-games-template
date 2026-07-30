import Phaser from "phaser";
import { CAULDRON, COLORS } from "../core/Constants";

/**
 * Cauldron game object with Cult of the Lamb style procedural art.
 * Supports shake animation (wrong answer) and bubble effects.
 */
export class Cauldron extends Phaser.GameObjects.Container {
  private cauldronGraphics: Phaser.GameObjects.Graphics;
  private liquidGraphics: Phaser.GameObjects.Graphics;
  private bubbles: Phaser.GameObjects.Arc[] = [];
  private pouredLetters: Phaser.GameObjects.Text[] = [];
  private usedLetterTexts: Phaser.GameObjects.Text[] = [];
  private glowCircle: Phaser.GameObjects.Arc;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Glow
    this.glowCircle = scene.add.circle(0, 10, CAULDRON.WIDTH * 0.8, COLORS.CAULDRON_GLOW, 0.08);
    this.add(this.glowCircle);

    // Cauldron body
    this.cauldronGraphics = scene.add.graphics();
    this.drawCauldron();
    this.add(this.cauldronGraphics);

    // Liquid surface
    this.liquidGraphics = scene.add.graphics();
    this.drawLiquid();
    this.add(this.liquidGraphics);

    // Drop zone
    this.setSize(CAULDRON.WIDTH, CAULDRON.HEIGHT);
    this.setInteractive({ useHandCursor: false, dropZone: true });

    // Start bubble animation
    this.startBubbles();

    scene.add.existing(this);
  }

  private drawCauldron(): void {
    const g = this.cauldronGraphics;
    const w = CAULDRON.WIDTH;
    const h = CAULDRON.HEIGHT;
    const rim = CAULDRON.RIM_HEIGHT;

    g.clear();

    // Shadow beneath
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(0, h / 2 + 5, w * 0.9, 20);

    // Main body
    g.fillStyle(COLORS.CAULDRON_BODY, 1);
    g.beginPath();
    g.moveTo(-w / 2, -h / 2);
    g.lineTo(w / 2, -h / 2);
    g.lineTo(w / 2 - 20, h / 2);
    g.lineTo(-w / 2 + 20, h / 2);
    g.closePath();
    g.fillPath();

    // Rim
    g.fillStyle(COLORS.CAULDRON_RIM, 1);
    g.fillRoundedRect(-w / 2 - 5, -h / 2 - rim, w + 10, rim + 5, 6);

    // Rim highlight
    g.fillStyle(0xffffff, 0.15);
    g.fillRoundedRect(-w / 2, -h / 2 - rim + 2, w, 4, 2);

    // Side handles
    g.lineStyle(6, COLORS.CAULDRON_RIM, 1);
    g.beginPath();
    g.arc(-w / 2 - 15, -h / 4, 20, -Math.PI / 2, Math.PI / 2, false);
    g.strokePath();
    g.beginPath();
    g.arc(w / 2 + 15, -h / 4, 20, Math.PI / 2, -Math.PI / 2, false);
    g.strokePath();

    // Decorative runes
    g.lineStyle(2, COLORS.GLOW_PURPLE, 0.3);
    g.strokeCircle(0, 0, 15);
    g.strokeCircle(-30, 10, 8);
    g.strokeCircle(30, 10, 8);

    // Inner shadow
    g.fillStyle(0x000000, 0.3);
    g.beginPath();
    g.moveTo(-w / 2 + 15, -h / 2 + 5);
    g.lineTo(w / 2 - 15, -h / 2 + 5);
    g.lineTo(w / 2 - 25, h / 2 - 10);
    g.lineTo(-w / 2 + 25, h / 2 - 10);
    g.closePath();
    g.fillPath();
  }

  private drawLiquid(): void {
    const g = this.liquidGraphics;
    const w = CAULDRON.WIDTH - 50;
    const y = -10;

    g.clear();

    g.fillStyle(COLORS.CAULDRON_LIQUID_DARK, 0.6);
    g.fillEllipse(0, y, w, 30);

    g.fillStyle(COLORS.CAULDRON_LIQUID, 0.3);
    g.fillEllipse(0, y - 2, w * 0.8, 20);

    g.fillStyle(0xffffff, 0.15);
    g.fillEllipse(-15, y - 5, w * 0.3, 8);
  }

  private startBubbles(): void {
    this.bubbleTimer = this.scene.time.addEvent({
      delay: 400,
      callback: () => this.spawnBubble(),
      loop: true,
    });
  }

  private spawnBubble(): void {
    if (this.bubbles.length >= CAULDRON.BUBBLE_COUNT) return;

    const x = Phaser.Math.Between(-40, 40);
    const y = -10;
    const size = Phaser.Math.Between(2, 5);
    const bubble = this.scene.add.circle(x, y, size, COLORS.CAULDRON_LIQUID, 0.5);
    this.add(bubble);
    this.bubbles.push(bubble);

    this.scene.tweens.add({
      targets: bubble,
      y: y - 40,
      alpha: 0,
      scale: 0.3,
      duration: Phaser.Math.Between(600, 1200),
      onComplete: () => {
        const idx = this.bubbles.indexOf(bubble);
        if (idx !== -1) this.bubbles.splice(idx, 1);
        bubble.destroy();
      },
    });
  }

  /** Shake animation on wrong letter. */
  playShakeAnimation(): void {
    const originalX = this.x;

    this.scene.tweens.add({
      targets: this,
      x: {
        from: originalX - CAULDRON.SHAKE_INTENSITY,
        to: originalX + CAULDRON.SHAKE_INTENSITY,
      },
      duration: CAULDRON.SHAKE_DURATION,
      repeat: CAULDRON.SHAKE_REPEAT,
      yoyo: true,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.x = originalX;
      },
    });

    // Red flash
    this.scene.tweens.add({
      targets: this.glowCircle,
      alpha: { from: 0.3, to: 0.08 },
      duration: 500,
      ease: "Quad.easeOut",
    });

    // Smoke particles
    for (let i = 0; i < 8; i++) {
      const smoke = this.scene.add.circle(
        Phaser.Math.Between(-30, 30),
        -CAULDRON.HEIGHT / 2 - 10,
        Phaser.Math.Between(4, 8),
        0xff4444,
        0.6,
      );
      this.add(smoke);
      this.scene.tweens.add({
        targets: smoke,
        y: smoke.y - 60,
        x: smoke.x + Phaser.Math.Between(-20, 20),
        alpha: 0,
        scale: 2,
        duration: 600 + i * 50,
        onComplete: () => smoke.destroy(),
      });
    }
  }

  /** Adds a poured letter to the cauldron display, arranged left to right. */
  addPouredLetter(letter: string): void {
    const letterSpacing = 28;
    const count = this.pouredLetters.length;
    const totalWidth = count * letterSpacing;
    const x = -totalWidth / 2 + count * letterSpacing;
    const y = 5;

    const text = this.scene.add.text(x, y, letter, {
      fontSize: "22px",
      fontFamily: "Georgia, serif",
      color: COLORS.LETTER_CORRECT,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setAlpha(0);
    this.add(text);
    this.pouredLetters.push(text);

    // Re-center all letters when a new one is added
    this.repositionPouredLetters();

    this.scene.tweens.add({
      targets: text,
      alpha: 0.9,
      scale: { from: 1.5, to: 1 },
      duration: 300,
    });

    for (let i = 0; i < 4; i++) {
      const sparkle = this.scene.add.circle(
        x + Phaser.Math.Between(-10, 10),
        y + Phaser.Math.Between(-10, 10),
        2,
        COLORS.GLOW_GREEN,
        0.8,
      );
      this.add(sparkle);
      this.scene.tweens.add({
        targets: sparkle,
        alpha: 0,
        y: sparkle.y - 20,
        duration: 400,
        delay: i * 80,
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  /** Repositions all poured letters to be centered and evenly spaced. */
  private repositionPouredLetters(): void {
    const letterSpacing = 28;
    const count = this.pouredLetters.length;
    const totalWidth = (count - 1) * letterSpacing;
    const startX = -totalWidth / 2;

    this.pouredLetters.forEach((text, i) => {
      this.scene.tweens.add({
        targets: text,
        x: startX + i * letterSpacing,
        duration: 200,
        ease: "Sine.easeOut",
      });
    });
  }

  /** Clears all poured letters. */
  clearPouredLetters(): void {
    this.pouredLetters.forEach((t) => t.destroy());
    this.pouredLetters = [];
    this.usedLetterTexts.forEach((t) => t.destroy());
    this.usedLetterTexts = [];
  }

  /** Adds a used letter display above the cauldron rim. */
  addUsedLetter(letter: string): void {
    const spacing = 24;
    const count = this.usedLetterTexts.length;
    const totalWidth = count * spacing;
    const x = -totalWidth / 2 + count * spacing;
    const y = -CAULDRON.HEIGHT / 2 - CAULDRON.RIM_HEIGHT - 30;

    const text = this.scene.add.text(x, y, letter, {
      fontSize: "20px",
      fontFamily: "Georgia, serif",
      color: COLORS.LETTER_CORRECT,
      fontStyle: "bold",
    });
    text.setOrigin(0.5);
    text.setAlpha(0);
    this.add(text);
    this.usedLetterTexts.push(text);

    // Re-center all used letters when a new one is added
    this.repositionUsedLetters();

    // Fade-in animation
    this.scene.tweens.add({
      targets: text,
      alpha: 1,
      duration: 200,
    });
  }

  /** Repositions all used letters to be centered and evenly spaced. */
  private repositionUsedLetters(): void {
    const spacing = 24;
    const count = this.usedLetterTexts.length;
    const totalWidth = (count - 1) * spacing;
    const startX = -totalWidth / 2;

    this.usedLetterTexts.forEach((text, i) => {
      this.scene.tweens.add({
        targets: text,
        x: startX + i * spacing,
        duration: 150,
        ease: "Sine.easeOut",
      });
    });
  }

  /** Success burst effect. */
  playSuccessBurst(): void {
    const bigGlow = this.scene.add.circle(0, 0, CAULDRON.WIDTH, COLORS.GLOW_GREEN, 0.3);
    this.add(bigGlow);
    this.scene.tweens.add({
      targets: bigGlow,
      alpha: 0,
      scale: 2,
      duration: 800,
      onComplete: () => bigGlow.destroy(),
    });

    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const dist = 80;
      const sparkle = this.scene.add.circle(
        Math.cos(angle) * 20,
        Math.sin(angle) * 20 - 10,
        3,
        COLORS.GLOW_GREEN,
        1,
      );
      this.add(sparkle);
      this.scene.tweens.add({
        targets: sparkle,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 10,
        alpha: 0,
        duration: 600,
        delay: i * 30,
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.bubbleTimer) {
      this.bubbleTimer.destroy();
    }
    this.bubbles.forEach((b) => b.destroy());
    this.pouredLetters.forEach((t) => t.destroy());
    this.usedLetterTexts.forEach((t) => t.destroy());
    super.destroy(fromScene);
  }
}
