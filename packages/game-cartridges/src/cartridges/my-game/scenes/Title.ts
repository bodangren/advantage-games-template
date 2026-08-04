import Phaser from "phaser";
import { EASY_LETTER_COLOR, FONT, HARD_LETTER_COLOR, MENU_BG, MINE_ROCK } from "../data/visual";

/** Main menu: Play, Starred cards review, and How to play. */
export class Title extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor(MENU_BG);

    // Decorative stone band at the bottom (mine-shaft theme, code-generated art).
    const g = this.add.graphics();
    g.fillStyle(MINE_ROCK[0].rock, 1);
    g.fillRect(0, H * 0.66, W, H * 0.34);
    g.fillStyle(MINE_ROCK[1].rock, 1);
    g.fillRect(0, H * 0.78, W, H * 0.22);
    g.fillStyle(MINE_ROCK[2].rock, 1);
    g.fillRect(0, H * 0.9, W, H * 0.1);

    const title = this.add
      .text(cx, H * 0.16, "GEM MINER\nWORD SPELL", {
        fontFamily: FONT,
        fontSize: Math.max(28, Math.min(52, W * 0.09)),
        color: "#ffffff",
        align: "center",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(cx, H * 0.28, "Mine letters, spell words, dodge lasers!", {
        fontFamily: FONT,
        fontSize: Math.max(12, Math.min(18, W * 0.03)),
        color: "#c7d2fe",
        align: "center",
      })
      .setOrigin(0.5);

    // Legend showing easy vs hard letter appearance.
    const legendY = H * 0.36;
    this.add
      .text(cx - 60, legendY, "easy (4)", { fontFamily: FONT, fontSize: 14, color: "#a5f3fc" })
      .setOrigin(1, 0.5);
    this.add
      .text(cx + 30, legendY, "A", { fontFamily: FONT, fontSize: 18, color: "#a3ff4d", fontStyle: "bold" })
      .setOrigin(0.5);
    this.add
      .text(cx + 60, legendY, "hard (5)", { fontFamily: FONT, fontSize: 14, color: "#fde68a" })
      .setOrigin(0, 0.5);
    this.add
      .text(cx + 135, legendY, "A", { fontFamily: FONT, fontSize: 26, color: "#ffbf00", fontStyle: "bold" })
      .setOrigin(0.5);

    this.createButton(cx, H * 0.5, "PLAY", 0x44aaff, () => this.scene.start("Game"));
    this.createButton(cx, H * 0.62, "STARRED WORDS", 0x9b7cff, () => this.scene.start("StarredDeck"));
    this.createButton(cx, H * 0.74, "HOW TO PLAY", 0x666699, () => this.scene.start("HowToPlay"));

    this.add
      .text(cx, H * 0.9, "Win: spell 10 words  •  Pick a goal (tap / 1-0)  •  HP 15  •  SPACE to dig", {
        fontFamily: FONT,
        fontSize: Math.max(11, Math.min(14, W * 0.03)),
        color: "#cbd5e1",
      })
      .setOrigin(0.5);

    void title;
    void EASY_LETTER_COLOR;
    void HARD_LETTER_COLOR;
  }

  private createButton(x: number, y: number, label: string, color: number, callback: () => void): void {
    const W = this.scale.width;
    const bg = this.add.rectangle(x, y, Math.min(320, W * 0.8), 52, color, 0.9).setStrokeStyle(2, 0xffffff, 0.3);
    const text = this.add
      .text(x, y, label, { fontFamily: FONT, fontSize: 20, color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => bg.setFillStyle(color, 1));
    bg.on("pointerout", () => bg.setFillStyle(color, 0.9));
    bg.on("pointerdown", callback);
    void text;
  }
}