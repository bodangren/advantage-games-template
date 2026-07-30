import Phaser from "phaser";
import { COLORS, UI } from "../core/Constants";
import type { StarredWord } from "../systems";
import { toggleStarredWord, loadStarredWords } from "../systems";
import type { CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit";

/** Full-screen overlay showing all starred/favorited words. */
export class StarredWordsView extends Phaser.Scene {
  private context!: CartridgeGameConfigContext;
  private starredWords!: readonly StarredWord[];
  private scrollY = 0;

  constructor() {
    super("StarredWordsView");
  }

  init(data?: { contestContext?: CartridgeGameConfigContext; starred?: readonly StarredWord[] }): void {
    this.context = data?.contestContext ?? ({} as CartridgeGameConfigContext);
    this.starredWords = data?.starred ?? [];
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // Backdrop
    const backdrop = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.8);
    backdrop.setInteractive();

    // Card
    const cardW = 400;
    const cardH = 500;
    const card = this.add.graphics();
    card.fillStyle(COLORS.BG_CARD, 0.95);
    card.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16);
    card.lineStyle(2, COLORS.STAR_ACTIVE, 0.3);
    card.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16);

    // Title
    this.add.text(cx, cy - cardH / 2 + 35, "\u2605 Starred Words", {
      fontSize: "24px",
      fontFamily: UI.FONT_TITLE,
      color: "#feca57",
      fontStyle: "bold",
    }).setOrigin(0.5);

    // Content area
    const contentY = cy - cardH / 2 + 70;
    const contentH = cardH - 120;

    if (this.starredWords.length === 0) {
      this.add.text(cx, contentY + contentH / 2, "No starred words yet.\nStar words during gameplay to save them here!", {
        fontSize: "14px",
        fontFamily: UI.FONT_BODY,
        color: COLORS.TEXT_SECONDARY,
        align: "center",
        lineSpacing: 6,
      }).setOrigin(0.5);
    } else {
      // Scrollable word list
      const mask = this.add.graphics();
      mask.fillStyle(0xffffff);
      mask.fillRect(cx - cardW / 2, contentY, cardW, contentH);
      mask.setVisible(false);

      const container = this.add.container(0, 0);
      container.setMask(mask.createGeometryMask());

      this.starredWords.forEach((entry, i) => {
        const y = contentY + 10 + i * 45;

        // Entry background
        const entryBg = this.add.graphics();
        entryBg.fillStyle(COLORS.BG_PANEL, 0.5);
        entryBg.fillRoundedRect(cx - 170, y, 340, 38, 8);
        container.add(entryBg);

        // Star button (to unstar)
        const starBtn = this.add.text(cx - 155, y + 9, "\u2605", {
          fontSize: "20px",
          color: "#feca57",
        });
        starBtn.setInteractive({ useHandCursor: true });
        starBtn.on("pointerdown", () => {
          toggleStarredWord(entry.word, entry.thai);
          this.starredWords = loadStarredWords();
          this.scene.restart({ contestContext: this.context, starred: this.starredWords });
        });
        container.add(starBtn);

        // Word
        const wordText = this.add.text(cx - 125, y + 5, entry.word.toUpperCase(), {
          fontSize: "16px",
          fontFamily: UI.FONT_LETTER,
          color: COLORS.TEXT_PRIMARY,
          fontStyle: "bold",
        });
        container.add(wordText);

        // Thai
        const thaiText = this.add.text(cx + 155, y + 10, entry.thai, {
          fontSize: "13px",
          fontFamily: UI.FONT_BODY,
          color: COLORS.TEXT_SECONDARY,
        });
        thaiText.setOrigin(1, 0);
        container.add(thaiText);
      });
    }

    // Close button
    const btnY = cy + cardH / 2 - 35;
    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLORS.GLOW_PURPLE, 0.2);
    btnBg.fillRoundedRect(cx - 60, btnY - 16, 120, 32, 8);
    btnBg.lineStyle(2, COLORS.GLOW_PURPLE, 0.5);
    btnBg.strokeRoundedRect(cx - 60, btnY - 16, 120, 32, 8);

    const btnText = this.add.text(cx, btnY, "Back", {
      fontSize: "16px",
      fontFamily: UI.FONT_BODY,
      color: COLORS.TEXT_PRIMARY,
    });
    btnText.setOrigin(0.5);

    const btnHit = this.add.rectangle(cx, btnY, 120, 32, 0xffffff, 0);
    btnHit.setInteractive({ useHandCursor: true });
    btnHit.on("pointerdown", () => {
      this.scene.resume("Title");
      this.scene.stop();
    });
  }
}
