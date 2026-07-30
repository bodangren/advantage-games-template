import Phaser from "phaser";
import { COLORS, STAR_RATING, UI } from "../core/Constants";
import { getStarRating, results, type AlchemyState } from "../systems";
import type { CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit";

/** Game over screen with star rating, final score, and word review. */
export class GameOver extends Phaser.Scene {
  private context!: CartridgeGameConfigContext;
  private state!: AlchemyState;

  constructor() {
    super("GameOver");
  }

  init(data?: { contestContext?: CartridgeGameConfigContext; state?: AlchemyState }): void {
    this.context = data?.contestContext ?? ({} as CartridgeGameConfigContext);
    this.state = data?.state ?? {
      batchIndex: 0,
      wordIndexInBatch: 0,
      letterIndex: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      score: 0,
      completedWords: [],
      phase: "gameover",
      currentBottles: [],
      currentWord: null,
      wordFailed: false,
      shuffledWordIndices: [0, 1, 2, 3, 4],
    };
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);

    const cx = this.scale.width / 2;
    const h = this.scale.height;
    const gameResults = results(this.state);
    const stars = getStarRating(gameResults.accuracy);

    // Call context.complete() to report results to host
    if (this.context && typeof this.context.complete === "function") {
      this.context.complete(gameResults);
    }

    // Title
    const titleText = stars >= 2 ? "Brewing Complete!" : "Keep Practicing!";
    this.add.text(cx, 30, titleText, {
      fontSize: "32px",
      fontFamily: UI.FONT_TITLE,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: "bold",
    }).setOrigin(0.5);

    // Stars
    this.displayStars(cx, 75, stars);

    // Score panel
    const panelY = 115;
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.BG_CARD, 0.8);
    panel.fillRoundedRect(cx - 140, panelY, 280, 60, 10);
    panel.lineStyle(2, COLORS.GLOW_PURPLE, 0.3);
    panel.strokeRoundedRect(cx - 140, panelY, 280, 60, 10);

    this.add.text(cx, panelY + 15, `Score: ${this.state.score}`, {
      fontSize: "20px",
      fontFamily: UI.FONT_BODY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(cx, panelY + 40, `Accuracy: ${Math.round(gameResults.accuracy * 100)}%`, {
      fontSize: "14px",
      fontFamily: UI.FONT_BODY,
      color: COLORS.TEXT_SECONDARY,
    }).setOrigin(0.5);

    // Word review list — with scrolling if needed
    const reviewStartY = 195;
    this.add.text(cx, reviewStartY, "Words Mastered", {
      fontSize: "16px",
      fontFamily: UI.FONT_BODY,
      color: COLORS.TEXT_SECONDARY,
    }).setOrigin(0.5);

    const listStartY = reviewStartY + 22;
    const btnReserveY = h - 65;
    const availableH = btnReserveY - listStartY - 10;
    const wordCount = this.state.completedWords.length;
    const spacing = Math.min(30, availableH / Math.max(wordCount, 1));

    this.state.completedWords.forEach((entry, i) => {
      const y = listStartY + i * spacing;
      if (y > btnReserveY - 10) return; // Skip if would overflow

      const statusIcon = entry.correct ? "\u2705" : "\u274C";
      this.add.text(cx - 130, y, statusIcon, { fontSize: "12px" });
      this.add.text(cx - 105, y, entry.word.toUpperCase(), {
        fontSize: "13px",
        fontFamily: UI.FONT_LETTER,
        color: COLORS.TEXT_PRIMARY,
        fontStyle: "bold",
      });
      this.add.text(cx + 130, y, entry.thai, {
        fontSize: "12px",
        fontFamily: UI.FONT_BODY,
        color: COLORS.TEXT_SECONDARY,
      }).setOrigin(1, 0);
    });

    // Play Again button
    this.createButton(cx, btnReserveY, "Brew Again", COLORS.GLOW_GREEN, () => {
      this.scene.start("Title", { contestContext: this.context });
    });
  }

  private displayStars(cx: number, y: number, count: 1 | 2 | 3): void {
    for (let i = 0; i < 3; i++) {
      const starX = cx + (i - 1) * 60;
      const filled = i < count;
      const star = this.add.text(starX, y, filled ? "\u2605" : "\u2606", {
        fontSize: "48px",
        fontFamily: UI.FONT_BODY,
        color: filled ? "#feca57" : "#555555",
      });
      star.setOrigin(0.5);

      if (filled) {
        this.tweens.add({
          targets: star,
          scale: { from: 0, to: 1 },
          duration: 400,
          delay: i * 200,
          ease: "Back.easeOut",
        });
      }
    }
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ): void {
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.2);
    bg.fillRoundedRect(x - 100, y - 20, 200, 40, 10);
    bg.lineStyle(2, color, 0.6);
    bg.strokeRoundedRect(x - 100, y - 20, 200, 40, 10);

    const text = this.add.text(x, y, label, {
      fontSize: "18px",
      fontFamily: UI.FONT_BODY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: "bold",
    });
    text.setOrigin(0.5);

    const hit = this.add.rectangle(x, y, 200, 40, 0xffffff, 0);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", onClick);
  }
}
