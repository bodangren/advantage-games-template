import Phaser from "phaser";
import { COLORS, UI } from "../core/Constants";
import type { CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit";

/** How to Play overlay — shown on first play or from help button. */
export class HowToPlay extends Phaser.Scene {
  private context!: CartridgeGameConfigContext;
  private fromGame = false;

  constructor() {
    super("HowToPlay");
  }

  init(data?: { contestContext?: CartridgeGameConfigContext; fromGame?: boolean }): void {
    this.context = data?.contestContext ?? ({} as CartridgeGameConfigContext);
    this.fromGame = data?.fromGame ?? false;
  }

  create(): void {
    // Mark as seen
    localStorage.setItem("spelllab-seen-howtoplay", "true");

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const h = this.scale.height;

    // Semi-transparent backdrop
    const backdrop = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.7);
    backdrop.setInteractive();

    // Card background — fit to screen height
    const cardW = 380;
    const cardH = Math.min(440, h - 60);
    const cardTop = cy - cardH / 2;

    const card = this.add.graphics();
    card.fillStyle(COLORS.BG_CARD, 0.95);
    card.fillRoundedRect(cx - cardW / 2, cardTop, cardW, cardH, 16);
    card.lineStyle(2, COLORS.GLOW_PURPLE, 0.4);
    card.strokeRoundedRect(cx - cardW / 2, cardTop, cardW, cardH, 16);

    // Title
    this.add.text(cx, cardTop + 30, "How to Play", {
      fontSize: "24px",
      fontFamily: UI.FONT_TITLE,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: "bold",
    }).setOrigin(0.5);

    // Instructions
    const instructions = [
      { icon: "\u{1F9EA}", text: "See the target word at the top" },
      { icon: "\u{1F4E6}", text: "Each bottle has letters on it" },
      { icon: "\u{1F4A8}", text: "Drag a bottle to the cauldron or tap to pour" },
      { icon: "\u2705", text: "Pour letters in the correct spelling order" },
      { icon: "\u{1F4A5}", text: "Wrong letter? Cauldron shakes! Word restarts." },
      { icon: "\u2B50", text: "Star words you want to remember" },
      { icon: "\u{1F3AF}", text: "Spell all 10 words to finish!" },
    ];

    const contentH = cardH - 100; // Space for title + button
    const spacing = Math.min(42, contentH / instructions.length);
    const startY = cardTop + 60;

    instructions.forEach((item, i) => {
      const y = startY + i * spacing;
      this.add.text(cx - cardW / 2 + 25, y, item.icon, {
        fontSize: "18px",
      });
      this.add.text(cx - cardW / 2 + 55, y + 1, item.text, {
        fontSize: "13px",
        fontFamily: UI.FONT_BODY,
        color: COLORS.TEXT_PRIMARY,
      });
    });

    // Close button
    const btnY = cardTop + cardH - 35;
    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLORS.GLOW_GREEN, 0.2);
    btnBg.fillRoundedRect(cx - 70, btnY - 16, 140, 32, 8);
    btnBg.lineStyle(2, COLORS.GLOW_GREEN, 0.6);
    btnBg.strokeRoundedRect(cx - 70, btnY - 16, 140, 32, 8);

    const btnText = this.add.text(cx, btnY, "Got it!", {
      fontSize: "16px",
      fontFamily: UI.FONT_BODY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: "bold",
    });
    btnText.setOrigin(0.5);

    const btnHit = this.add.rectangle(cx, btnY, 140, 32, 0xffffff, 0);
    btnHit.setInteractive({ useHandCursor: true });

    btnHit.on("pointerdown", () => {
      if (this.fromGame) {
        this.scene.resume("Game");
        this.scene.stop();
      } else {
        this.scene.start("Game", { contestContext: this.context });
      }
    });
  }
}
