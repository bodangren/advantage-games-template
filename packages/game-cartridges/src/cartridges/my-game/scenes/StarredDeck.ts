import Phaser from "phaser";
import { getRuntime, toggleStar, isStarred } from "../systems/runtime";
import { FONT, EASY_LETTER_COLOR, HARD_LETTER_COLOR, MENU_BG } from "../data/visual";
import type { DeckWord } from "../data/words";

/** Review screen showing starred vocabulary cards for later revision. */
export class StarredDeck extends Phaser.Scene {
  constructor() {
    super("StarredDeck");
  }

  create(): void {
    const { pool, starred } = getRuntime();
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor(MENU_BG);

    this.add
      .text(cx, H * 0.08, "STARRED WORDS", {
        fontFamily: FONT,
        fontSize: Math.max(24, Math.min(38, W * 0.07)),
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const starredWords = pool.filter((w) => isStarred(w.text));

    if (starredWords.length === 0) {
      this.add
        .text(cx, H * 0.45, "No starred words yet.\nWin a game and tap the ★ on a word card.", {
          fontFamily: FONT,
          fontSize: Math.max(13, Math.min(18, W * 0.035)),
          color: "#cbd5e1",
          align: "center",
        })
        .setOrigin(0.5);
    } else {
      this.renderDeck(W, H, starredWords);
    }

    this.add
      .text(cx, H * 0.86, `Total saved: ${starred.length}`, {
        fontFamily: FONT,
        fontSize: 14,
        color: "#94a3b8",
      })
      .setOrigin(0.5);

    const bg = this.add.rectangle(cx, H * 0.93, Math.min(300, W * 0.8), 46, 0x666699, 0.9).setStrokeStyle(2, 0xffffff, 0.3);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => bg.setFillStyle(0x7a7aaa, 1));
    bg.on("pointerout", () => bg.setFillStyle(0x666699, 0.9));
    bg.on("pointerdown", () => this.scene.start("Title"));
    this.add.text(cx, H * 0.93, "BACK", { fontFamily: FONT, fontSize: 20, color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
  }

  private renderDeck(W: number, H: number, words: readonly DeckWord[]): void {
    const cols = W > 800 ? 4 : 2;
    const cardW = Math.min(170, (W - 40) / cols);
    const cardH = Math.min(80, (H * 0.6) / Math.max(1, Math.ceil(words.length / cols)));
    const startY = H * 0.18;

    words.forEach((word, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = W / 2 + (col - (cols - 1) / 2) * (cardW + 8);
      const y = startY + row * (cardH + 8);
      const color = word.difficulty === "hard" ? HARD_LETTER_COLOR : EASY_LETTER_COLOR;
      const bg = this.add.rectangle(x, y, cardW, cardH, 0xffffff, 0.08).setStrokeStyle(2, color, 0.9);
      this.add
        .text(x, y - cardH * 0.18, word.text, {
          fontFamily: FONT,
          fontSize: Math.max(15, Math.min(22, cardW * 0.17)),
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.add
        .text(x, y + cardH * 0.26, word.thai, {
          fontFamily: FONT,
          fontSize: Math.max(11, Math.min(14, cardW * 0.12)),
          color: "#cbd5e1",
        })
        .setOrigin(0.5);
      const starText = this.add
        .text(x + cardW / 2 - 14, y - cardH / 2 + 13, isStarred(word.text) ? "★" : "☆", {
          fontFamily: FONT,
          fontSize: 20,
          color: "#ffd75e",
        })
        .setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => {
        const starred = toggleStar(word.text);
        starText.setText(starred ? "★" : "☆");
        // Refresh the deck (may be empty after un-starring the last card).
        this.scene.restart();
      });
    });
  }
}