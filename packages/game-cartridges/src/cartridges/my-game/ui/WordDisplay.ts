import Phaser from "phaser";
import { COLORS, UI } from "../core/Constants";
import { isWordStarred, toggleStarredWord } from "../systems";
import { Events } from "../core/EventBus";

/**
 * Displays the Thai translation only (no English word).
 * Fixed to the top of the screen (scrollFactor 0).
 */
export class WordDisplay extends Phaser.GameObjects.Container {
  private thaiText: Phaser.GameObjects.Text;
  private starButton: Phaser.GameObjects.Text;
  private progressText: Phaser.GameObjects.Text;
  private panel: Phaser.GameObjects.Graphics;
  private thaiHeartbeat: Phaser.Tweens.Tween | null = null;
  private currentWord = "";
  private currentThai = "";
  private isStarred = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Background panel
    this.panel = scene.add.graphics();
    this.add(this.panel);
    this.drawPanel(350);

    // Thai translation — white, 28px, bold, centered
    this.thaiText = scene.add.text(0, 5, "", {
      fontSize: "28px",
      fontFamily: UI.FONT_BODY,
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.thaiText.setOrigin(0.5);
    this.add(this.thaiText);

    // Star/favorite button (positioned dynamically)
    this.starButton = scene.add.text(0, 0, "\u2606", {
      fontSize: "24px",
      fontFamily: UI.FONT_BODY,
      color: "#888888",
    });
    this.starButton.setOrigin(0.5);
    this.starButton.setInteractive({ useHandCursor: true });
    this.starButton.on("pointerdown", () => this.onStarToggle());
    this.add(this.starButton);

    // Progress indicator — white color
    this.progressText = scene.add.text(0, 0, "", {
      fontSize: UI.FONT_SIZE_SMALL,
      fontFamily: UI.FONT_BODY,
      color: "#ffffff",
    });
    this.progressText.setOrigin(0.5);
    this.add(this.progressText);

    this.setScrollFactor(0);
    this.setDepth(100);
    scene.add.existing(this);
  }

  private drawPanel(width: number): void {
    this.panel.clear();
    this.panel.fillStyle(0x1a1730, 0.85);
    this.panel.fillRoundedRect(-width / 2, -25, width, 55, 12);
    this.panel.lineStyle(2, COLORS.GLOW_PURPLE, 0.3);
    this.panel.strokeRoundedRect(-width / 2, -25, width, 55, 12);
  }

  /** Updates the displayed Thai translation and star state. */
  setWord(word: string, thai: string, wordIndex: number, totalInBatch: number): void {
    this.currentWord = word;
    this.currentThai = thai;
    this.isStarred = isWordStarred(word);

    // Calculate dynamic panel width based on Thai text length
    const panelWidth = Math.max(300, thai.length * 20 + 120);
    this.drawPanel(panelWidth);

    // Position star button and progress text
    this.starButton.setPosition(panelWidth / 2 - 25, 5);
    this.progressText.setPosition(-panelWidth / 2 + 25, 5);

    // Show only Thai translation
    this.thaiText.setText(thai);
    this.updateStarDisplay();
    this.progressText.setText(`${wordIndex + 1} / ${totalInBatch}`);

    // Start heartbeat animation on Thai text
    this.startThaiHeartbeat();
  }

  private startThaiHeartbeat(): void {
    // Stop existing heartbeat if any
    if (this.thaiHeartbeat) {
      this.thaiHeartbeat.destroy();
      this.thaiHeartbeat = null;
    }

    // Reset scale
    this.thaiText.setScale(1);

    // Create heartbeat pulse animation — continuous, starts immediately
    this.thaiHeartbeat = this.scene.tweens.add({
      targets: this.thaiText,
      scale: { from: 1, to: 1.08 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** Highlights the next letter to spell (no-op since English text removed). */
  highlightLetter(_letterIndex: number): void {
    // No English letters to highlight
  }

  private onStarToggle(): void {
    const updated = toggleStarredWord(this.currentWord, this.currentThai);
    this.isStarred = updated.some((w) => w.word === this.currentWord);
    this.updateStarDisplay();

    this.scene.tweens.add({
      targets: this.starButton,
      scale: { from: 1.3, to: 1 },
      duration: 200,
      ease: "Back.easeOut",
    });

    this.scene.events.emit(Events.STAR_TOGGLE, this.currentWord, this.isStarred);
  }

  private updateStarDisplay(): void {
    this.starButton.setText(this.isStarred ? "\u2605" : "\u2606");
    this.starButton.setColor(this.isStarred ? "#feca57" : "#888888");
  }

  destroy(fromScene?: boolean): void {
    if (this.thaiHeartbeat) {
      this.thaiHeartbeat.destroy();
      this.thaiHeartbeat = null;
    }
    super.destroy(fromScene);
  }
}
