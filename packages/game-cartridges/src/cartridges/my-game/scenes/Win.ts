import Phaser from "phaser";
import { getRuntime, resetGame, toggleStar, isStarred } from "../systems/runtime";
import { FONT, EASY_LETTER_COLOR, HARD_LETTER_COLOR, MENU_BG } from "../data/visual";
import { WIN_GOAL } from "../systems/GameState";
import type { DeckWord } from "../data/words";

/** Win screen: shows collected word cards with star-to-save, then reports results. */
export class Win extends Phaser.Scene {
  private emitted = false;

  constructor() {
    super("Win");
  }

  create(): void {
    const { context, state } = getRuntime();
    this.emitted = false;
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor(MENU_BG);

    if (state.hasWon()) {
      this.add
        .text(cx, H * 0.1, "YOU WIN! 🎉", {
          fontFamily: FONT,
          fontSize: Math.max(30, Math.min(52, W * 0.11)),
          color: "#a3ff4d",
          fontStyle: "bold",
          stroke: "#000",
          strokeThickness: 5,
        })
        .setOrigin(0.5);
      this.add
        .text(cx, H * 0.17, `Collected ${WIN_GOAL} words`, {
          fontFamily: FONT,
          fontSize: Math.max(14, Math.min(20, W * 0.04)),
          color: "#e2e8f0",
        })
        .setOrigin(0.5);
      this.renderCards(W, H, state.completed);
      this.createButton(cx, H * 0.9, "CONTINUE →", 0x44aaff, () => {
        resetGame();
        this.scene.start("Title");
      });
    } else {
      // Should not normally render; guard anyway.
      this.scene.start("GameOver");
    }

    this.emitted = true;
    context.complete(state.results());
    void this.emitted;
  }

  private createButton(x: number, y: number, label: string, color: number, callback: () => void): void {
    const W = this.scale.width;
    const bg = this.add.rectangle(x, y, Math.min(300, W * 0.8), 50, color, 0.9).setStrokeStyle(2, 0xffffff, 0.3);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => bg.setFillStyle(color, 1));
    bg.on("pointerout", () => bg.setFillStyle(color, 0.9));
    bg.on("pointerdown", callback);
    this.add.text(x, y, label, { fontFamily: FONT, fontSize: 20, color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
  }

  private renderCards(W: number, H: number, words: readonly DeckWord[]): void {
    const cardsPerRow = W > 800 ? 4 : 2;
    const cardW = Math.min(160, (W - 40) / cardsPerRow);
    const cardH = Math.min(74, (H * 0.55) / Math.max(1, Math.ceil(words.length / cardsPerRow)));
    const startY = H * 0.24;

    words.forEach((word, i) => {
      const row = Math.floor(i / cardsPerRow);
      const col = i % cardsPerRow;
      const x = W / 2 + (col - (cardsPerRow - 1) / 2) * (cardW + 8);
      const y = startY + row * (cardH + 8);
      const color = word.difficulty === "hard" ? HARD_LETTER_COLOR : EASY_LETTER_COLOR;
      const bg = this.add.rectangle(x, y, cardW, cardH, 0xffffff, 0.08).setStrokeStyle(2, color, 0.9).setDepth(1);
      this.add
        .text(x, y - cardH * 0.18, word.text, {
          fontFamily: FONT,
          fontSize: Math.max(14, Math.min(20, cardW * 0.16)),
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(1);
      this.add
        .text(x, y + cardH * 0.26, word.thai, {
          fontFamily: FONT,
          fontSize: Math.max(10, Math.min(13, cardW * 0.11)),
          color: "#cbd5e1",
        })
        .setOrigin(0.5)
        .setDepth(1);

      const starText = this.add
        .text(x + cardW / 2 - 14, y - cardH / 2 + 13, isStarred(word.text) ? "★" : "☆", {
          fontFamily: FONT,
          fontSize: 20,
          color: "#ffd75e",
        })
        .setOrigin(0.5)
        .setDepth(2);
      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => {
        const starred = toggleStar(word.text);
        starText.setText(starred ? "★" : "☆");
      });
    });
    void this.emitted;
  }
}