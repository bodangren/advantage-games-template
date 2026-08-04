import Phaser from "phaser";
import { getRuntime, resetGame, toggleStar, isStarred } from "../systems/runtime";
import { FONT, MENU_BG, EASY_LETTER_COLOR, HARD_LETTER_COLOR } from "../data/visual";
import { WIN_GOAL } from "../systems/GameState";
import type { DeckWord } from "../data/words";

/** Loss screen: HP reached zero. Shows worked-on words to star, then reports results. */
export class GameOver extends Phaser.Scene {
  private emitted = false;

  constructor() {
    super("GameOver");
  }

  create(): void {
    const { context, state } = getRuntime();
    this.emitted = false;
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor(MENU_BG);

    this.add
      .text(cx, H * 0.09, "GAME OVER", {
        fontFamily: FONT,
        fontSize: Math.max(28, Math.min(50, W * 0.1)),
        color: "#ff7b7b",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, H * 0.16, "Words spelled: " + state.wordsCompleted + "/" + WIN_GOAL + "   •   Score: " + state.score + "   •   Accuracy: " + Math.round(state.accuracy() * 100) + "%", {
        fontFamily: FONT,
        fontSize: Math.max(12, Math.min(17, W * 0.032)),
        color: "#e2e8f0",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, H * 0.22, "Tap a card to star it and review it anytime in STARRED WORDS", {
        fontFamily: FONT,
        fontSize: Math.max(11, Math.min(14, W * 0.028)),
        color: "#93c5fd",
      })
      .setOrigin(0.5);

    const worked = state.clearedWords();
    if (worked.length === 0) {
      this.add
        .text(cx, H * 0.4, "No words collected this run.\nMine a few letters next time!", {
          fontFamily: FONT,
          fontSize: Math.max(13, Math.min(17, W * 0.035)),
          color: "#cbd5e1",
          align: "center",
        })
        .setOrigin(0.5);
    } else {
      this.renderCards(W, H, worked);
    }

    this.createButton(cx, H * 0.87, "TRY AGAIN", 0x44aaff, () => {
      resetGame();
      this.scene.start("Game");
    });
    this.createButton(cx, H * 0.95, "MAIN MENU", 0x666699, () => {
      resetGame();
      this.scene.start("Title");
    });

    this.emitted = true;
    context.complete(state.results());
  }

  private createButton(x: number, y: number, label: string, color: number, callback: () => void): void {
    const W = this.scale.width;
    const bg = this.add.rectangle(x, y, Math.min(300, W * 0.8), 44, color, 0.9).setStrokeStyle(2, 0xffffff, 0.3);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => bg.setFillStyle(color, 1));
    bg.on("pointerout", () => bg.setFillStyle(color, 0.9));
    bg.on("pointerdown", callback);
    this.add.text(x, y, label, { fontFamily: FONT, fontSize: 18, color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
  }

  private renderCards(W: number, H: number, words: readonly DeckWord[]): void {
    const cardsPerRow = W > 800 ? 5 : 3;
    const cardW = Math.min(180, (W - 24) / cardsPerRow);
    const cardH = Math.max(38, Math.min(56, H * 0.055));
    const startY = H * 0.29;

    words.forEach((word, i) => {
      const row = Math.floor(i / cardsPerRow);
      const col = i % cardsPerRow;
      const x = W / 2 + (col - (cardsPerRow - 1) / 2) * (cardW + 6);
      const y = startY + row * (cardH + 6);
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
        .text(x, y + cardH * 0.3, word.thai, {
          fontFamily: FONT,
          fontSize: Math.max(10, Math.min(13, cardW * 0.11)),
          color: "#cbd5e1",
        })
        .setOrigin(0.5)
        .setDepth(1);

      const starText = this.add
        .text(x + cardW / 2 - 12, y - cardH / 2 + 12, isStarred(word.text) ? "★" : "☆", {
          fontFamily: FONT,
          fontSize: 18,
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
  }
}