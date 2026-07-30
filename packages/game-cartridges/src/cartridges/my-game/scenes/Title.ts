import Phaser from "phaser";
import { COLORS, UI } from "../core/Constants";
import { loadStarredWords, type StarredWord } from "../systems";
import type { CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit";

/** Title screen with Start Game and View Starred Words buttons. */
export class Title extends Phaser.Scene {
  private context!: CartridgeGameConfigContext;

  constructor() {
    super("Title");
  }

  init(data?: { contestContext?: CartridgeGameConfigContext }): void {
    this.context = data?.contestContext ?? ({} as CartridgeGameConfigContext);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_DARK);
    this.drawBackground();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const h = this.scale.height;

    // Title text
    const title = this.add.text(cx, cy - 140, "SpellLab\nPotion Master", {
      fontSize: "42px",
      fontFamily: UI.FONT_TITLE,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: "bold",
      align: "center",
      stroke: "#000000",
      strokeThickness: 6,
    });
    title.setOrigin(0.5);

    this.tweens.add({
      targets: title,
      y: title.y - 6,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Subtitle
    const subtitle = this.add.text(cx, cy - 70, "Brew words from enchanted bottles!", {
      fontSize: "15px",
      fontFamily: UI.FONT_BODY,
      color: COLORS.TEXT_SECONDARY,
    });
    subtitle.setOrigin(0.5);

    // Decorative cauldron silhouette
    this.drawCauldronSilhouette(cx, cy + 5);

    // Start Game button
    this.createButton(cx, cy + 80, "Start Brewing", COLORS.GLOW_GREEN, () => {
      const hasSeenHowToPlay = localStorage.getItem("spelllab-seen-howtoplay");
      if (!hasSeenHowToPlay) {
        this.scene.start("HowToPlay", { contestContext: this.context });
      } else {
        this.scene.start("Game", { contestContext: this.context });
      }
    });

    // Starred Words button
    this.createButton(cx, cy + 140, "\u2605 Starred Words", COLORS.STAR_ACTIVE, () => {
      this.showStarredWords();
    });

    // Footer
    this.add.text(cx, h - 25, "An alchemy vocabulary game", {
      fontSize: "11px",
      fontFamily: UI.FONT_BODY,
      color: "#555555",
    }).setOrigin(0.5);
  }

  private drawBackground(): void {
    const g = this.add.graphics();
    const w = this.scale.width;
    const h = this.scale.height;

    for (let i = 0; i < h; i += 2) {
      const t = i / h;
      const r = Math.floor(13 + t * 5);
      const gb = Math.floor(11 + t * 4);
      const b = Math.floor(26 + t * 10);
      g.fillStyle(Phaser.Display.Color.GetColor(r, gb, b), 1);
      g.fillRect(0, i, w, 2);
    }

    // Floating particles
    for (let i = 0; i < 20; i++) {
      const px = Phaser.Math.Between(0, w);
      const py = Phaser.Math.Between(0, h);
      const size = Phaser.Math.Between(1, 3);
      const particle = this.add.circle(px, py, size, COLORS.GLOW_PURPLE, 0.2);
      this.tweens.add({
        targets: particle,
        y: py - 100,
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
      });
    }
  }

  private drawCauldronSilhouette(cx: number, cy: number): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.CAULDRON_BODY, 0.3);
    g.beginPath();
    g.moveTo(cx - 60, cy - 30);
    g.lineTo(cx + 60, cy - 30);
    g.lineTo(cx + 45, cy + 20);
    g.lineTo(cx - 45, cy + 20);
    g.closePath();
    g.fillPath();

    g.fillStyle(COLORS.CAULDRON_LIQUID, 0.15);
    g.fillEllipse(cx, cy - 10, 80, 20);

    // Steam
    for (let i = 0; i < 3; i++) {
      const sx = cx + (i - 1) * 25;
      const steam = this.add.text(sx, cy - 40, "~", {
        fontSize: "20px",
        color: COLORS.TEXT_SECONDARY,
      });
      steam.setOrigin(0.5);
      steam.setAlpha(0.3);
      this.tweens.add({
        targets: steam,
        y: cy - 80,
        alpha: 0,
        duration: 2000,
        repeat: -1,
        delay: i * 500,
      });
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
    bg.fillStyle(color, 0.15);
    bg.fillRoundedRect(x - 140, y - 22, 280, 44, 12);
    bg.lineStyle(2, color, 0.5);
    bg.strokeRoundedRect(x - 140, y - 22, 280, 44, 12);

    const text = this.add.text(x, y, label, {
      fontSize: "20px",
      fontFamily: UI.FONT_BODY,
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      fontStyle: "bold",
    });
    text.setOrigin(0.5);

    const hitArea = this.add.rectangle(x, y, 280, 44, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true });

    hitArea.on("pointerover", () => {
      bg.clear();
      bg.fillStyle(color, 0.3);
      bg.fillRoundedRect(x - 140, y - 22, 280, 44, 12);
      bg.lineStyle(2, color, 0.8);
      bg.strokeRoundedRect(x - 140, y - 22, 280, 44, 12);
    });

    hitArea.on("pointerout", () => {
      bg.clear();
      bg.fillStyle(color, 0.15);
      bg.fillRoundedRect(x - 140, y - 22, 280, 44, 12);
      bg.lineStyle(2, color, 0.5);
      bg.strokeRoundedRect(x - 140, y - 22, 280, 44, 12);
    });

    hitArea.on("pointerdown", onClick);
  }

  private showStarredWords(): void {
    const starred = loadStarredWords();
    this.scene.launch("StarredWordsView", { starred, contestContext: this.context });
    this.scene.pause();
  }
}
