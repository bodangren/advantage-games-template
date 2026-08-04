import Phaser from "phaser";
import { FONT, MENU_BG } from "../data/visual";

/** Instructions screen. */
export class HowToPlay extends Phaser.Scene {
  constructor() {
    super("HowToPlay");
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor(MENU_BG);

    const title = this.add
      .text(cx, H * 0.07, "HOW TO PLAY", {
        fontFamily: FONT,
        fontSize: Math.max(24, Math.min(38, W * 0.07)),
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const lines = [
      "MOVE  WASD / arrow keys  (or drag to steer)",
      "DIG  SPACE (or tap your own block) while standing on it",
      "Each block hides one letter inside a gem",
      "Dig 1: the stone crumbles - the gem pops out",
      "Dig 2: dig the gem - the hidden letter pops out",
      "10 GOALS shown at once - pick one (tap card or keys 1-0)",
      "Words are hidden - only the length (_ _ _ _) is shown",
      "A word counts as met only when you spell it fully",
      "Words you start keep coming back in later rounds",
      "No time limit - goals rotate when the mine runs dry",
      "Letters you dig stay saved for later rounds",
      "4-letter (easy) = lime green  •  5-letter (hard) = amber",
      "Each run deals a fresh mix of 10 words (5 easy + 5 hard)",
      "Spell 10 words (any mix) to win the mine!",
      "LASERS sweep every 2/3/4 s - watch the guide line",
      "Laser hit: -1 HP + brief invulnerability",
      "Word complete: 10 s of aura (lasers pass through)",
      "HP 15. Reach 0 and the game ends.",
    ];

    lines.forEach((line, i) => {
      this.add
        .text(cx, H * 0.11 + i * (H * 0.048), line, {
          fontFamily: FONT,
          fontSize: Math.max(11, Math.min(16, W * 0.026)),
          color: "#dbeafe",
          align: "center",
        })
        .setOrigin(0.5, 0.5);
    });

    const bg = this.add.rectangle(cx, H * 0.88, Math.min(320, W * 0.8), 50, 0x44aaff, 0.9).setStrokeStyle(2, 0xffffff, 0.3);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => bg.setFillStyle(0x66c2ff, 1));
    bg.on("pointerout", () => bg.setFillStyle(0x44aaff, 0.9));
    bg.on("pointerdown", () => this.scene.start("Title"));
    this.add
      .text(cx, H * 0.88, "BACK", { fontFamily: FONT, fontSize: 20, color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);
  }
}