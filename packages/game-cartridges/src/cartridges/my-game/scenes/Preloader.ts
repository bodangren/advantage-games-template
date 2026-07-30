import Phaser from "phaser";
import { COLORS } from "../core/Constants";

/** Preloader scene — generates procedural textures needed by the game. */
export class Preloader extends Phaser.Scene {
  constructor() {
    super("Preloader");
  }

  preload(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 30, "Brewing...", {
      fontSize: "20px",
      fontFamily: "Georgia, serif",
      color: COLORS.TEXT_PRIMARY,
    }).setOrigin(0.5);

    const barBg = this.add.rectangle(cx, cy + 20, 200, 8, 0x333333);
    const bar = this.add.rectangle(cx - 100, cy + 20, 0, 8, COLORS.GLOW_GREEN);
    bar.setOrigin(0, 0.5);

    this.load.on("progress", (p: number) => {
      bar.width = 200 * p;
    });
  }

  create(): void {
    this.scene.start("Title");
  }
}
