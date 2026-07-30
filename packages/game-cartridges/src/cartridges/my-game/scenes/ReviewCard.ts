import Phaser from "phaser";
import { COLORS, GAME, UI } from "../core/Constants";
import { EventBus, Events } from "../core/EventBus";
import type { CompletedWord } from "../systems";
import type { CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit";

/** Full-screen review card shown after every 5 words. */
export class ReviewCard extends Phaser.Scene {
  private context!: CartridgeGameConfigContext;
  private completedWords!: readonly CompletedWord[];
  private batchIndex!: number;

  constructor() {
    super("ReviewCard");
  }

  init(data: {
    contestContext: CartridgeGameConfigContext;
    completedWords: readonly CompletedWord[];
    batchIndex: number;
  }): void {
    this.context = data.contestContext;
    this.completedWords = data.completedWords;
    this.batchIndex = data.batchIndex;
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // Backdrop
    const backdrop = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.75);
    backdrop.setInteractive();

    // Scroll/card background
    const cardW = 380;
    const cardH = 420;
    const card = this.add.graphics();
    card.fillStyle(COLORS.BG_CARD, 0.95);
    card.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16);
    card.lineStyle(2, COLORS.GLOW_PURPLE, 0.4);
    card.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16);

    // Decorative top border
    card.lineStyle(3, COLORS.GLOW_GREEN, 0.3);
    card.beginPath();
    card.moveTo(cx - 100, cy - cardH / 2 + 8);
    card.lineTo(cx + 100, cy - cardH / 2 + 8);
    card.strokePath();

    // Title
    const batchLabel = this.batchIndex === 0 ? "First" : "Second";
    this.add.text(cx, cy - cardH / 2 + 35, `${batchLabel} 5 Words Complete!`, {
      fontSize: "22px",
      fontFamily: UI.FONT_TITLE,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: "bold",
    }).setOrigin(0.5);

    // Word list
    const startY = cy - cardH / 2 + 75;
    this.completedWords.forEach((entry, i) => {
      const y = startY + i * 55;

      // Entry background
      const entryBg = this.add.graphics();
      entryBg.fillStyle(entry.correct ? 0x1a3020 : 0x301a1a, 0.5);
      entryBg.fillRoundedRect(cx - 150, y - 8, 300, 45, 8);

      // Status icon
      const statusIcon = entry.correct ? "\u2705" : "\u274C";
      this.add.text(cx - 135, y + 5, statusIcon, { fontSize: "18px" });

      // Word
      this.add.text(cx - 105, y, entry.word.toUpperCase(), {
        fontSize: "18px",
        fontFamily: UI.FONT_LETTER,
        color: COLORS.TEXT_PRIMARY,
        fontStyle: "bold",
      });

      // Thai translation
      this.add.text(cx + 135, y + 5, entry.thai, {
        fontSize: "14px",
        fontFamily: UI.FONT_BODY,
        color: COLORS.TEXT_SECONDARY,
      }).setOrigin(1, 0);
    });

    // Continue button
    const btnY = cy + cardH / 2 - 45;
    const btnLabel = this.batchIndex === 0 ? "Continue Brewing" : "See Results";
    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLORS.GLOW_GREEN, 0.2);
    btnBg.fillRoundedRect(cx - 100, btnY - 20, 200, 40, 10);
    btnBg.lineStyle(2, COLORS.GLOW_GREEN, 0.6);
    btnBg.strokeRoundedRect(cx - 100, btnY - 20, 200, 40, 10);

    const btnText = this.add.text(cx, btnY, btnLabel, {
      fontSize: "18px",
      fontFamily: UI.FONT_BODY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: "bold",
    });
    btnText.setOrigin(0.5);

    const btnHit = this.add.rectangle(cx, btnY, 200, 40, 0xffffff, 0);
    btnHit.setInteractive({ useHandCursor: true });

    btnHit.on("pointerdown", () => {
      this.scene.stop();
      // Emit event on EventBus so Game scene can receive it
      EventBus.emit(Events.REVIEW_DISMISSED);
    });
  }
}
