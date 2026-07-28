import Phaser from "phaser";
import type { CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit";
import {
  createGameState,
  processShot,
  advanceLevel,
  applyUpgrade,
  results,
  getBossLabels,
  BOSS_SCALES,
  SKIN_CHIBI,
  SKIN_RIVEN,
  type GameState,
  type SkinTheme,
  type UpgradeType,
} from "./systems";

const ASSET_BASE = "/assets/cartridges/my-game";
const TOTAL_BOSS_IMAGES = 10;
const TOTAL_GIGY_IMAGES = 6;
const BULLET_SPEED = 600;
const GIGY_BULLET_SPEED = 300;
const GIGY_SHOOT_INTERVAL = 3000;
const CHAIN_DELAY = 400;
const BASE_SHOOT_COOLDOWN = 300;
const FIRE_RATE_MULT = 0.65;

export function createGameScene(
  context: CartridgeGameConfigContext,
): typeof Phaser.Scene {
  return class GameScene extends Phaser.Scene {
    private gameState!: GameState;
    private skin!: SkinTheme;
    private selectedShip = 0;
    private gamePhase:
      | "preload"
      | "skin-select"
      | "ship-select"
      | "playing"
      | "chain"
      | "upgrade"
      | "game-over"
      | "win" = "preload";

    private stars: Phaser.GameObjects.Graphics[] = [];

    private playerShip!: Phaser.GameObjects.Image;
    private playerX = 0;
    private playerY = 0;
    private isDragging = false;
    private dragStartX = 0;
    private dragShipStartX = 0;
    private lastShotTime = 0;
    private autoShootTimer = 0;

    private bossImages: Phaser.GameObjects.Image[] = [];
    private bossLabels: Phaser.GameObjects.Text[] = [];
    private bossHPBars: Phaser.GameObjects.Graphics[] = [];

    private gigyImages: Phaser.GameObjects.Image[] = [];
    private gigyShootTimer = 0;

    private playerBullets!: Phaser.GameObjects.Group;
    private enemyBullets!: Phaser.GameObjects.Group;

    private translationBanner!: Phaser.GameObjects.Text;
    private shieldBar!: Phaser.GameObjects.Graphics;
    private shieldText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private scoreText!: Phaser.GameObjects.Text;

    private audioCtx: AudioContext | null = null;
    private isCompact = false;
    private redFlash!: Phaser.GameObjects.Rectangle;

    // In-canvas UI elements
    private uiContainer!: Phaser.GameObjects.Container;
    private settingsBtn!: Phaser.GameObjects.Container;
    private menuContainer!: Phaser.GameObjects.Container;
    private upgradeContainer!: Phaser.GameObjects.Container;

    constructor() {
      super("GameScene");
    }

    preload() {
      const w = this.scale.width;
      const h = this.scale.height;

      // Full-screen opaque black overlay
      const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 1).setDepth(99);

      const loadingText = this.add
        .text(w / 2, h / 2 - 30, "Loading...", {
          fontFamily: "Arial, sans-serif",
          fontSize: "24px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setDepth(100);

      const barBg = this.add.graphics().setDepth(100);
      barBg.fillStyle(0x333333, 1);
      barBg.fillRoundedRect(w / 2 - 150, h / 2, 300, 20, 10);

      const bar = this.add.graphics().setDepth(100);

      this.load.on("progress", (value: number) => {
        bar.clear();
        bar.fillStyle(0x00ffcc, 1);
        bar.fillRoundedRect(w / 2 - 148, h / 2 + 2, 296 * value, 16, 8);
      });

      const dismiss = () => {
        overlay.destroy();
        loadingText.destroy();
        barBg.destroy();
        bar.destroy();
      };

      this.load.on("complete", () => {
        this.time.delayedCall(2000, dismiss);
      });

      this.load.on("loaderror", () => {
        this.time.delayedCall(2000, dismiss);
      });

      this.load.image("player1", `${ASSET_BASE}/Player1.png`);
      this.load.image("player2", `${ASSET_BASE}/Player2.png`);
      for (let i = 1; i <= TOTAL_BOSS_IMAGES; i++) {
        this.load.image(`boss${i}`, `${ASSET_BASE}/Boss${i}.png`);
      }
      for (let i = 1; i <= TOTAL_GIGY_IMAGES; i++) {
        this.load.image(`gigy${i}`, `${ASSET_BASE}/Gigy${i}.png`);
      }
      this.load.image("bullet1", `${ASSET_BASE}/Bullet1.png`);
      this.load.image("bullet2", `${ASSET_BASE}/Bullet2.png`);
      this.load.image("laser1", `${ASSET_BASE}/Laser1.png`);
      this.load.image("laser2", `${ASSET_BASE}/Laser2.png`);
    }

    create() {
      const w = this.scale.width;
      const h = this.scale.height;
      this.isCompact = h > w;
      this.gameState = createGameState(context.input);
      this.skin =
        context.edition.id === "secondary-epic" ? SKIN_RIVEN : SKIN_CHIBI;
      this.cameras.main.setBackgroundColor(this.skin.background);
      this.createBackground(w, h);
      this.createGroups();
      this.createUI();
      this.createPlayer(w, h);
      this.createRedFlash(w, h);
      this.createInGameUI(w, h);
      this.setupInput();
      this.layout(w, h);
      this.scale.on("resize", (s: Phaser.Structs.Size) => {
        this.isCompact = s.height > s.width;
        this.layout(s.width, s.height);
        this.rebuildStars(s.width, s.height);
      });
      this.showShipSelectScreen();
      context.diagnostic({ code: "GAME_READY", message: "Star Speller 2D ready" });
    }

    // ─── BACKGROUND ──────────────────────────────────────────────

    private createBackground(w: number, h: number) {
      this.stars = [];
      const count = this.isCompact ? 200 : Math.floor((w * h) / 3000);
      for (let i = 0; i < count; i++) {
        const star = this.add.graphics();
        const sx = Phaser.Math.Between(0, w);
        const sy = Phaser.Math.Between(0, h);
        const size = Phaser.Math.Between(1, 3);
        const alpha = Phaser.Math.FloatBetween(0.3, 1.0);
        star.fillStyle(this.skin.starColor, alpha);
        star.fillCircle(sx, sy, size);
        star.setData("baseY", sy);
        this.stars.push(star);
      }
    }

    private rebuildStars(w: number, h: number) {
      for (const s of this.stars) s.destroy();
      this.stars = [];
      const count = this.isCompact ? 200 : Math.floor((w * h) / 3000);
      for (let i = 0; i < count; i++) {
        const star = this.add.graphics();
        const sx = Phaser.Math.Between(0, w);
        const sy = Phaser.Math.Between(0, h);
        const size = Phaser.Math.Between(1, 3);
        const alpha = Phaser.Math.FloatBetween(0.3, 1.0);
        star.fillStyle(this.skin.starColor, alpha);
        star.fillCircle(sx, sy, size);
        star.setData("baseY", sy);
        this.stars.push(star);
      }
    }

    private createGroups() {
      this.playerBullets = this.add.group();
      this.enemyBullets = this.add.group();
    }

    // ─── HUD ─────────────────────────────────────────────────────

    private createUI() {
      const ts: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: this.skin.bannerText,
        align: "center",
        wordWrap: { width: 700 },
      };
      this.translationBanner = this.add
        .text(0, 0, "", { ...ts, fontSize: this.isCompact ? "13px" : "18px", padding: { x: 16, y: 8 } })
        .setOrigin(0.5)
        .setDepth(10);
      this.levelText = this.add
        .text(0, 0, "", { ...ts, fontSize: "16px" })
        .setOrigin(0, 0.5)
        .setDepth(10);
      this.scoreText = this.add
        .text(0, 0, "", { ...ts, fontSize: "16px" })
        .setOrigin(1, 0.5)
        .setDepth(10);
      this.shieldBar = this.add.graphics().setDepth(10);
      this.shieldText = this.add
        .text(0, 0, "", { ...ts, fontSize: "14px" })
        .setOrigin(0.5)
        .setDepth(10);
    }

    private updateUI() {
      const w = this.scale.width;
      const gs = this.gameState;
      this.translationBanner.setText(
        gs.vocabulary[gs.currentLevel % gs.vocabulary.length]?.translation ?? "",
      );
      this.levelText.setText(
        this.gameState.levelType === "boss"
          ? `Level ${gs.currentLevel + 1}/10`
          : `Wave Clear!`
      );
      this.scoreText.setText(`Score: ${gs.score}`);
      const barW = 120;
      const barH = 10;
      const barX = w / 2 - barW / 2;
      const barY = 45;
      const ratio = gs.shieldHP / 100;
      this.shieldBar.clear();
      this.shieldBar.fillStyle(0x333333, 0.8);
      this.shieldBar.fillRoundedRect(barX, barY, barW, barH, 4);
      const color = ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000;
      this.shieldBar.fillStyle(color, 1);
      this.shieldBar.fillRoundedRect(barX, barY, barW * ratio, barH, 4);
      this.shieldBar.lineStyle(1, 0xffffff, 0.5);
      this.shieldBar.strokeRoundedRect(barX, barY, barW, barH, 4);
      this.shieldText.setText(`SHIELD ${gs.shieldHP}%`);
      this.shieldText.setPosition(w / 2, barY + barH + 12);
    }

    // ─── IN-GAME UI CONTAINERS ───────────────────────────────────

    private createInGameUI(w: number, _h: number) {
      this.menuContainer = this.add.container(0, 0).setDepth(30).setVisible(false);
      this.upgradeContainer = this.add.container(0, 0).setDepth(30).setVisible(false);

      this.settingsBtn = this.add.container(w - 40, 18).setDepth(12);
      const sBg = this.add.graphics();
      sBg.fillStyle(0x333333, 0.7);
      sBg.fillRoundedRect(-16, -12, 32, 24, 6);
      this.settingsBtn.add(sBg);
      const sTxt = this.add.text(0, 0, "⚙", {
        fontSize: "16px", color: "#ffffff",
      }).setOrigin(0.5);
      this.settingsBtn.add(sTxt);
      sBg.setInteractive(
        new Phaser.Geom.Rectangle(-16, -12, 32, 24),
        Phaser.Geom.Rectangle.Contains,
      );
      sBg.on("pointerdown", () => this.showSettings());
    }

    // ─── MENU SCREEN (in-canvas) ────────────────────────────────

    private showMenuScreen() {
      this.gamePhase = "skin-select";
      this.menuContainer.removeAll(true);
      const w = this.scale.width;
      const h = this.scale.height;

      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 0.85);
      bg.fillRect(-w / 2, -h / 2, w, h);
      this.menuContainer.add(bg);

      const title = this.add.text(0, -h * 0.3, "Select Theme", {
        fontFamily: "Arial, sans-serif", fontSize: "22px", color: "#ffffff",
      }).setOrigin(0.5);
      this.menuContainer.add(title);

      const btnW = this.isCompact ? 120 : 160;
      const btnH = this.isCompact ? 90 : 120;
      const gap = this.isCompact ? 140 : 220;

      const chibiBg = this.add.graphics();
      chibiBg.fillStyle(0x1a1a4e, 1);
      chibiBg.fillRoundedRect(-gap / 2 - btnW / 2, -h * 0.1, btnW, btnH, 12);
      chibiBg.lineStyle(2, 0xff69b4);
      chibiBg.strokeRoundedRect(-gap / 2 - btnW / 2, -h * 0.1, btnW, btnH, 12);
      chibiBg.setInteractive(
        new Phaser.Geom.Rectangle(-gap / 2 - btnW / 2, -h * 0.1, btnW, btnH),
        Phaser.Geom.Rectangle.Contains,
      );
      this.menuContainer.add(chibiBg);

      const chibiLabel = this.add.text(-gap / 2, -h * 0.1 + btnH / 2, "Pink\nChibi Core", {
        fontFamily: "Arial, sans-serif", fontSize: this.isCompact ? "14px" : "16px", color: "#ffffff",
        align: "center",
      }).setOrigin(0.5);
      this.menuContainer.add(chibiLabel);

      const rivenBg = this.add.graphics();
      rivenBg.fillStyle(0x2d0000, 1);
      rivenBg.fillRoundedRect(gap / 2 - btnW / 2, -h * 0.1, btnW, btnH, 12);
      rivenBg.lineStyle(2, 0xff6600);
      rivenBg.strokeRoundedRect(gap / 2 - btnW / 2, -h * 0.1, btnW, btnH, 12);
      rivenBg.setInteractive(
        new Phaser.Geom.Rectangle(gap / 2 - btnW / 2, -h * 0.1, btnW, btnH),
        Phaser.Geom.Rectangle.Contains,
      );
      this.menuContainer.add(rivenBg);

      const rivenLabel = this.add.text(gap / 2, -h * 0.1 + btnH / 2, "Fire\nRiven Deep", {
        fontFamily: "Arial, sans-serif", fontSize: this.isCompact ? "14px" : "16px", color: "#ffffff",
        align: "center",
      }).setOrigin(0.5);
      this.menuContainer.add(rivenLabel);

      chibiBg.on("pointerdown", () => {
        this.skin = SKIN_CHIBI;
        this.cameras.main.setBackgroundColor(this.skin.background);
        this.rebuildStars(w, h);
        this.showShipSelectScreen();
      });
      rivenBg.on("pointerdown", () => {
        this.skin = SKIN_RIVEN;
        this.cameras.main.setBackgroundColor(this.skin.background);
        this.rebuildStars(w, h);
        this.showShipSelectScreen();
      });

      this.menuContainer.setPosition(w / 2, h / 2);
      this.menuContainer.setVisible(true);
    }

    private menuBg!: Phaser.GameObjects.Rectangle;
    private upgradeBg: Phaser.GameObjects.Rectangle | null = null;

    private showShipSelectScreen() {
      this.menuContainer.removeAll(true);
      const w = this.scale.width;
      const h = this.scale.height;

      const title = this.add.text(0, -h * 0.3, "Select Edition", {
        fontFamily: "Arial, sans-serif", fontSize: "22px", color: "#ffffff",
      }).setOrigin(0.5);
      this.menuContainer.add(title);

      const gap = this.isCompact ? 140 : 200;
      const btnW = this.isCompact ? 110 : 140;
      const btnH = this.isCompact ? 90 : 110;

      // Chibi Quest button
      const chibiBg = this.add.graphics();
      chibiBg.fillStyle(0x1a1a4e, 1);
      chibiBg.fillRoundedRect(-gap / 2 - btnW / 2, -h * 0.1, btnW, btnH, 12);
      chibiBg.lineStyle(2, 0x00ccff);
      chibiBg.strokeRoundedRect(-gap / 2 - btnW / 2, -h * 0.1, btnW, btnH, 12);
      chibiBg.setInteractive(
        new Phaser.Geom.Rectangle(-gap / 2 - btnW / 2, -h * 0.1, btnW, btnH),
        Phaser.Geom.Rectangle.Contains,
      );
      this.menuContainer.add(chibiBg);

      const chibiImg = this.add.image(-gap / 2, -h * 0.1 + 20, "player1")
        .setScale(this.isCompact ? 0.08 : 0.12).setAngle(-90);
      this.menuContainer.add(chibiImg);
      const chibiLabel = this.add.text(-gap / 2, -h * 0.1 + btnH - 12, "Chibi Quest", {
        fontFamily: "Arial, sans-serif", fontSize: "14px", color: "#00ccff",
      }).setOrigin(0.5);
      this.menuContainer.add(chibiLabel);

      // Riven Lands button
      const rivenBg = this.add.graphics();
      rivenBg.fillStyle(0x2a0000, 1);
      rivenBg.fillRoundedRect(gap / 2 - btnW / 2, -h * 0.1, btnW, btnH, 12);
      rivenBg.lineStyle(2, 0xff4444);
      rivenBg.strokeRoundedRect(gap / 2 - btnW / 2, -h * 0.1, btnW, btnH, 12);
      rivenBg.setInteractive(
        new Phaser.Geom.Rectangle(gap / 2 - btnW / 2, -h * 0.1, btnW, btnH),
        Phaser.Geom.Rectangle.Contains,
      );
      this.menuContainer.add(rivenBg);

      const rivenImg = this.add.image(gap / 2, -h * 0.1 + 20, "player2")
        .setScale(this.isCompact ? 0.08 : 0.12).setAngle(-90);
      this.menuContainer.add(rivenImg);
      const rivenLabel = this.add.text(gap / 2, -h * 0.1 + btnH - 12, "Riven Lands", {
        fontFamily: "Arial, sans-serif", fontSize: "14px", color: "#ff4444",
      }).setOrigin(0.5);
      this.menuContainer.add(rivenLabel);

      chibiBg.on("pointerdown", () => {
        this.selectedShip = 0;
        this.skin = SKIN_CHIBI;
        this.cameras.main.setBackgroundColor(this.skin.background);
        this.rebuildStars(this.scale.width, this.scale.height);
        this.startGame();
      });
      rivenBg.on("pointerdown", () => {
        this.selectedShip = 1;
        this.skin = SKIN_RIVEN;
        this.cameras.main.setBackgroundColor(this.skin.background);
        this.rebuildStars(this.scale.width, this.scale.height);
        this.startGame();
      });

      this.menuContainer.setPosition(w / 2, h / 2);
      this.menuContainer.setVisible(true);
    }

    private startGame() {
      this.menuContainer.setVisible(false);
      this.playerShip.setTexture(this.selectedShip === 0 ? "player1" : "player2");
      this.startLevel();
    }

    private showSettings() {
      if (this.gamePhase !== "playing") return;
      this.menuContainer.removeAll(true);
      const w = this.scale.width;
      const h = this.scale.height;

      if (this.menuBg) this.menuBg.destroy();
      this.menuBg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.8).setDepth(50);

      const title = this.add.text(0, -60, "Settings", {
        fontFamily: "Arial, sans-serif", fontSize: "22px", color: "#ffffff",
      }).setOrigin(0.5);
      this.menuContainer.add(title);

      const resumeBg = this.add.graphics();
      resumeBg.fillStyle(0x333355, 1);
      resumeBg.fillRoundedRect(-80, -10, 160, 40, 8);
      resumeBg.setInteractive(
        new Phaser.Geom.Rectangle(-80, -10, 160, 40),
        Phaser.Geom.Rectangle.Contains,
      );
      this.menuContainer.add(resumeBg);
      const resumeTxt = this.add.text(0, 10, "Resume", {
        fontFamily: "Arial, sans-serif", fontSize: "16px", color: "#ffffff",
      }).setOrigin(0.5);
      this.menuContainer.add(resumeTxt);

      const restartBg = this.add.graphics();
      restartBg.fillStyle(0x553333, 1);
      restartBg.fillRoundedRect(-80, 50, 160, 40, 8);
      restartBg.setInteractive(
        new Phaser.Geom.Rectangle(-80, 50, 160, 40),
        Phaser.Geom.Rectangle.Contains,
      );
      this.menuContainer.add(restartBg);
      const restartTxt = this.add.text(0, 70, "Restart", {
        fontFamily: "Arial, sans-serif", fontSize: "16px", color: "#ffffff",
      }).setOrigin(0.5);
      this.menuContainer.add(restartTxt);

      this.menuContainer.setPosition(w / 2, h / 2);
      this.menuContainer.setVisible(true);

      resumeBg.on("pointerdown", () => {
        this.menuContainer.setVisible(false);
      });
      restartBg.on("pointerdown", () => {
        this.menuContainer.setVisible(false);
        this.gameState = createGameState(context.input);
      this.showShipSelectScreen();
      });
    }

    // ─── UPGRADE MENU (in-canvas) ───────────────────────────────

    private showUpgradeMenu() {
      this.gamePhase = "upgrade";
      this.upgradeContainer.removeAll(true);
      const w = this.scale.width;
      const h = this.scale.height;
      const gs = this.gameState;

      const title = this.add.text(0, -h * 0.3, "Choose Upgrade", {
        fontFamily: "Arial, sans-serif", fontSize: "20px", color: "#ffffff",
      }).setOrigin(0.5);
      this.upgradeContainer.add(title);

      const choices: { type: UpgradeType; label: string; desc: string }[] = [
        { type: "firerate", label: "Fire Rate Boost", desc: gs.fireRateStacks < 2 ? `${gs.fireRateStacks}/2 stacks` : "MAX" },
        { type: "doubleshot", label: "Double Shot", desc: gs.upgrade === "doubleshot" ? "ACTIVE" : "Two bullets" },
        { type: "laser", label: "Laser Beam", desc: gs.upgrade === "laser" ? "ACTIVE" : "High power" },
      ];

      const btnW = this.isCompact ? 110 : 180;
      const btnH = this.isCompact ? 60 : 70;
      const gap = btnW + 12;
      const totalW = choices.length * gap - 12;
      const startX = -totalW / 2;

      choices.forEach((c, i) => {
        const bx = startX + i * gap;
        const by = -btnH / 2;
        const isMax = c.type === "firerate" && gs.fireRateStacks >= 2;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(isMax ? 0x333333 : 0x111111, 1);
        btnBg.fillRoundedRect(bx, by, btnW, btnH, 10);
        btnBg.lineStyle(2, isMax ? 0x666666 : parseInt(this.skin.bannerText.replace("#", "0x")));
        btnBg.strokeRoundedRect(bx, by, btnW, btnH, 10);
        if (!isMax) {
          btnBg.setInteractive(
            new Phaser.Geom.Rectangle(bx, by, btnW, btnH),
            Phaser.Geom.Rectangle.Contains,
          );
        }
        this.upgradeContainer.add(btnBg);

        const lbl = this.add.text(bx + btnW / 2, by + 22, c.label, {
          fontFamily: "Arial, sans-serif", fontSize: "14px", color: "#ffffff",
        }).setOrigin(0.5);
        this.upgradeContainer.add(lbl);

        const dsc = this.add.text(bx + btnW / 2, by + 46, c.desc, {
          fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#aaaaaa",
        }).setOrigin(0.5);
        this.upgradeContainer.add(dsc);

        if (!isMax) {
          btnBg.on("pointerdown", () => {
            this.gameState = applyUpgrade(this.gameState, c.type);
            this.upgradeContainer.setVisible(false);
            this.startLevel();
          });
        }
      });

      this.upgradeContainer.setPosition(w / 2, h / 2);
      this.upgradeContainer.setVisible(true);
    }

    // ─── PLAYER ──────────────────────────────────────────────────

    private createPlayer(w: number, h: number) {
      const key = this.selectedShip === 0 ? "player1" : "player2";
      this.playerShip = this.add.image(w / 2, h * 0.85, key);
      this.playerShip.setScale(0.15);
      this.playerShip.setAngle(-90);
      this.playerShip.setDepth(5);
      this.playerX = w / 2;
      this.playerY = h * 0.85;
    }

    private createRedFlash(w: number, h: number) {
      this.redFlash = this.add
        .rectangle(w / 2, h / 2, w, h, 0xff0000, 0)
        .setDepth(20);
    }

    private flashRed() {
      this.redFlash.setAlpha(0.35);
      this.tweens.add({
        targets: this.redFlash,
        alpha: 0,
        duration: 300,
        ease: "Power2",
      });
    }

    // ─── INPUT ───────────────────────────────────────────────────

    private setupInput() {
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
        if (this.gamePhase !== "playing") return;
        this.isDragging = true;
        this.dragStartX = p.x;
        this.dragShipStartX = this.playerX;
      });
      this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
        if (!this.isDragging || this.gamePhase !== "playing") return;
        const dx = p.x - this.dragStartX;
        const w = this.scale.width;
        this.playerX = Phaser.Math.Clamp(this.dragShipStartX + dx, 40, w - 40);
        this.playerShip.setX(this.playerX);
      });
      this.input.on("pointerup", () => {
        this.isDragging = false;
      });
      this.input.keyboard?.on("keydown-LEFT", () => {
        if (this.gamePhase === "playing")
          this.playerX = Math.max(40, this.playerX - 30);
      });
      this.input.keyboard?.on("keydown-RIGHT", () => {
        if (this.gamePhase === "playing")
          this.playerX = Math.min(this.scale.width - 40, this.playerX + 30);
      });
      this.input.keyboard?.on("keydown-A", () => {
        if (this.gamePhase === "playing")
          this.playerX = Math.max(40, this.playerX - 30);
      });
      this.input.keyboard?.on("keydown-D", () => {
        if (this.gamePhase === "playing")
          this.playerX = Math.min(this.scale.width - 40, this.playerX + 30);
      });
      this.input.keyboard?.on("keydown-SPACE", () => {
        if (this.gamePhase === "playing") this.playerShoot();
      });
    }

    // ─── SHOOTING ────────────────────────────────────────────────

    private getShootCooldown(): number {
      return BASE_SHOOT_COOLDOWN * Math.pow(FIRE_RATE_MULT, this.gameState.fireRateStacks);
    }

    private playerShoot() {
      const now = this.time.now;
      const cd = this.getShootCooldown();
      if (now - this.lastShotTime < cd) return;
      this.lastShotTime = now;
      const isLaser = this.gameState.upgrade === "laser";
      const isDouble = this.gameState.upgrade === "doubleshot";
      const key = isLaser ? "laser1" : "bullet1";
      const sc = isLaser ? 0.12 : 0.15;
      const speed = isLaser ? BULLET_SPEED * 1.5 : BULLET_SPEED;
      const b = this.add
        .image(this.playerX, this.playerY - 20, key)
        .setScale(sc)
        .setAngle(-90)
        .setDepth(4);
      this.playerBullets.add(b);
      this.tweens.add({
        targets: b,
        y: -50,
        duration: (1000 * this.scale.height) / speed,
        ease: "Linear",
        onComplete: () => b.destroy(),
      });
      if (isDouble) {
        const b2 = this.add
          .image(this.playerX - 15, this.playerY - 20, key)
          .setScale(sc)
          .setAngle(-90)
          .setDepth(4);
        this.playerBullets.add(b2);
        this.tweens.add({
          targets: b2,
          y: -50,
          duration: (1000 * this.scale.height) / speed,
          ease: "Linear",
          onComplete: () => b2.destroy(),
        });
      }
      this.playBeep(880, 0.05, "sine", 0.15);
    }

    // ─── ENEMY SHOOTING ──────────────────────────────────────────

    private gigyShoot() {
      const now = this.time.now;
      if (now - this.gigyShootTimer < GIGY_SHOOT_INTERVAL) return;
      this.gigyShootTimer = now;
      for (const gigy of this.gigyImages) {
        if (!gigy.active) continue;
        const dx = this.playerX - gigy.x;
        const dy = this.playerY - gigy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) continue;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const b = this.add
          .image(gigy.x, gigy.y + 20, "laser1")
          .setScale(0.25)
          .setAngle(angle)
          .setDepth(3);
        this.enemyBullets.add(b);
        const duration = (dist / GIGY_BULLET_SPEED) * 1000;
        this.tweens.add({
          targets: b,
          x: gigy.x + (dx / dist) * dist,
          y: gigy.y + 20 + (dy / dist) * dist,
          duration,
          ease: "Linear",
          onComplete: () => b.destroy(),
        });
      }
    }

    private bossShoot() {
      for (const boss of this.bossImages) {
        if (!boss.active || !boss.visible) continue;
        if (Phaser.Math.Between(0, 1000) > 5) continue;
        const dx = this.playerX - boss.x;
        const dy = this.playerY - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) continue;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const b = this.add
          .image(boss.x, boss.y + 30, "laser1")
          .setScale(0.3)
          .setAngle(angle)
          .setDepth(3);
        this.enemyBullets.add(b);
        const duration = (dist / GIGY_BULLET_SPEED) * 1000;
        this.tweens.add({
          targets: b,
          x: boss.x + (dx / dist) * dist,
          y: boss.y + 30 + (dy / dist) * dist,
          duration,
          ease: "Linear",
          onComplete: () => b.destroy(),
        });
      }
    }

    // ─── UPDATE LOOP ─────────────────────────────────────────────

    update(_time: number, delta: number) {
      if (this.gamePhase === "playing") {
        this.playerShip.setX(this.playerX);
        this.autoShootTimer += delta;
        if (this.autoShootTimer >= this.getShootCooldown()) {
          this.autoShootTimer = 0;
          this.playerShoot();
        }
        this.checkCollisions();
        this.gigyShoot();
        this.bossShoot();
        this.moveGigys(delta);
      }
      this.updateStarScroll(delta);
    }

    private updateStarScroll(delta: number) {
      const h = this.scale.height;
      for (const star of this.stars) {
        const baseY = star.getData("baseY") as number;
        const newY = (baseY + delta * 0.03) % h;
        star.y = newY - baseY;
      }
    }

    private moveGigys(delta: number) {
      const speed = 0.05 * this.gameState.difficulty;
      for (const gigy of this.gigyImages) {
        if (!gigy.active) continue;
        gigy.y += speed * delta;
        if (gigy.y > this.scale.height + 50) {
          gigy.y = -50;
          gigy.x = Phaser.Math.Between(50, this.scale.width - 50);
        }
      }
    }

    // ─── COLLISIONS ──────────────────────────────────────────────

    private checkCollisions() {
      const bossBounds = this.bossImages.map((b) => {
        if (!b.active || !b.visible) return null;
        return new Phaser.Geom.Rectangle(
          b.x - b.displayWidth / 2,
          b.y - b.displayHeight / 2,
          b.displayWidth,
          b.displayHeight,
        );
      });
      const playerBounds = new Phaser.Geom.Rectangle(
        this.playerShip.x - this.playerShip.displayWidth / 2,
        this.playerShip.y - this.playerShip.displayHeight / 2,
        this.playerShip.displayWidth,
        this.playerShip.displayHeight,
      );

      this.playerBullets.getChildren().forEach((bullet) => {
        const b = bullet as Phaser.GameObjects.Image;
        if (!b.active) return;
        const bRect = new Phaser.Geom.Rectangle(
          b.x - b.displayWidth / 2,
          b.y - b.displayHeight / 2,
          b.displayWidth,
          b.displayHeight,
        );
        for (let i = 0; i < bossBounds.length; i++) {
          if (bossBounds[i] && Phaser.Geom.Intersects.RectangleToRectangle(bRect, bossBounds[i]!)) {
            b.destroy();
            this.onBossShot(i);
            return;
          }
        }
        for (const gigy of this.gigyImages) {
          if (!gigy.active) continue;
          const gRect = new Phaser.Geom.Rectangle(
            gigy.x - gigy.displayWidth / 2,
            gigy.y - gigy.displayHeight / 2,
            gigy.displayWidth,
            gigy.displayHeight,
          );
          if (Phaser.Geom.Intersects.RectangleToRectangle(bRect, gRect)) {
            b.destroy();
            this.onGigyDestroyed(gigy);
            return;
          }
        }
      });

      this.enemyBullets.getChildren().forEach((bullet) => {
        const b = bullet as Phaser.GameObjects.Image;
        if (!b.active) return;
        const bRect = new Phaser.Geom.Rectangle(
          b.x - b.displayWidth / 2,
          b.y - b.displayHeight / 2,
          b.displayWidth,
          b.displayHeight,
        );
        if (Phaser.Geom.Intersects.RectangleToRectangle(bRect, playerBounds)) {
          b.destroy();
          this.onPlayerHit();
        }
      });
    }

    // ─── BOSS SHOT HANDLER ──────────────────────────────────────

    private onBossShot(lane: number) {
      const { state: newState, correct } = processShot(this.gameState, lane);
      this.gameState = newState;
      this.updateUI();

      // Same hit sound for both correct and wrong
      this.playBeep(523.25, 0.15, "sine", 0.2);

      if (correct) {
        this.spawnExplosion(
          this.bossImages[lane]?.x ?? 0,
          this.bossImages[lane]?.y ?? 0,
          this.skin.explosionCorrect,
        );
        if (newState.chainTriggered) {
          this.startChainExplosion();
        } else {
          this.updateBossHPBars();
        }
      } else {
        const bossDefeated = newState.bossHP[lane] === newState.bossMaxHP;
        if (bossDefeated) {
          this.flashRed();
          this.cameras.main.shake(200, 0.005);
          this.spawnExplosion(
            this.bossImages[lane]?.x ?? 0,
            this.bossImages[lane]?.y ?? 0,
            this.skin.explosionCorrect,
          );
          const labels = getBossLabels(
            newState.vocabulary,
            newState.currentLevel,
          );
          this.bossLabels.forEach((label, i) => {
            if (label) label.setText(labels[i]!);
          });
          this.updateBossHPBars();
          if (newState.gameOver) {
            this.endGame(false);
          }
        } else {
          this.spawnExplosion(
            this.bossImages[lane]?.x ?? 0,
            this.bossImages[lane]?.y ?? 0,
            this.skin.explosionWrong,
          );
          this.updateBossHPBars();
        }
      }
    }

    private onGigyDestroyed(gigy: Phaser.GameObjects.Image) {
      this.spawnExplosion(gigy.x, gigy.y, this.skin.explosionCorrect);
      gigy.setActive(false).setVisible(false);
      this.gameState = {
        ...this.gameState,
        score: this.gameState.score + 10,
      };
      this.updateUI();

      // Gigy wave complete: all gigies destroyed → advance
      if (this.gameState.levelType === "gigy-wave") {
        const allDead = this.gigyImages.every((g) => !g.active);
        if (allDead) {
          this.gamePhase = "chain";
          this.time.delayedCall(500, () => {
            this.gameState = advanceLevel(this.gameState);
            if (this.gameState.completed) {
              this.endGame(true);
            } else {
              this.showTranslationPreview();
            }
          });
        }
      }
    }

    private onPlayerHit() {
      const damage = 3;
      const newShield = Math.max(0, this.gameState.shieldHP - damage);
      this.gameState = { ...this.gameState, shieldHP: newShield };
      this.flashRed();
      this.playBeep(120, 0.2, "square", 0.15);
      this.updateUI();
      if (newShield <= 0) {
        this.endGame(false);
      }
    }

    // ─── EXPLOSIONS / HP BARS ────────────────────────────────────

    private spawnExplosion(x: number, y: number, color: number) {
      for (let i = 0; i < 12; i++) {
        const particle = this.add.graphics();
        particle.fillStyle(color, 1);
        particle.fillCircle(0, 0, Phaser.Math.Between(2, 5));
        particle.setPosition(x, y);
        particle.setDepth(15);
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const dist = Phaser.Math.Between(30, 80);
        this.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist,
          alpha: 0,
          duration: Phaser.Math.Between(300, 600),
          ease: "Power2",
          onComplete: () => particle.destroy(),
        });
      }
    }

    private updateBossHPBars() {
      for (let i = 0; i < 3; i++) {
        const bar = this.bossHPBars[i];
        if (!bar) continue;
        bar.clear();
        const boss = this.bossImages[i];
        if (!boss || !boss.active) continue;
        const bw = 60;
        const bh = 6;
        const bx = boss.x - bw / 2;
        const by = boss.y - boss.displayHeight / 2 - 12;
        const hp = this.gameState.bossHP[i] ?? 0;
        const maxHP = this.gameState.bossMaxHP;
        const ratio = maxHP > 0 ? hp / maxHP : 0;
        bar.fillStyle(0x333333, 0.8);
        bar.fillRoundedRect(bx, by, bw, bh, 3);
        bar.fillStyle(ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffff00 : 0xff0000, 1);
        bar.fillRoundedRect(bx, by, bw * ratio, bh, 3);
      }
    }

    // ─── CHAIN EXPLOSION / LEVEL UP ──────────────────────────────

    private startChainExplosion() {
      this.gamePhase = "chain";
      const lanes = [0, 1, 2];
      lanes.forEach((lane, idx) => {
        this.time.delayedCall(idx * CHAIN_DELAY, () => {
          const boss = this.bossImages[lane];
          if (boss) {
            this.spawnExplosion(boss.x, boss.y, this.skin.explosionCorrect);
            boss.setActive(false).setVisible(false);
          }
          const label = this.bossLabels[lane];
          if (label) label.setVisible(false);
          const hpBar = this.bossHPBars[lane];
          if (hpBar) hpBar.setVisible(false);
        });
      });
      this.time.delayedCall(lanes.length * CHAIN_DELAY + 200, () => {
        this.gameState = advanceLevel(this.gameState);
        if (this.gameState.completed) {
          this.endGame(true);
        } else {
          this.showTranslationPreview();
        }
      });
    }

    private showTranslationPreview() {
      this.gamePhase = "chain";
      const w = this.scale.width;
      const h = this.scale.height;
      const gs = this.gameState;

      const isGigyWave = gs.levelType === "gigy-wave";
      const title = isGigyWave ? "Gigy Wave Incoming!" : `Level ${gs.currentLevel + 1}`;
      const vocab = gs.vocabulary[gs.currentLevel % gs.vocabulary.length];
      const subtitle = isGigyWave
        ? "Clear all enemies!"
        : (vocab?.translation ?? "");
      const hintText = isGigyWave
        ? ""
        : "Find the correct English word!";

      const overlay = this.add
        .rectangle(w / 2, h / 2, w, h, 0x000000, 0.75)
        .setDepth(25)
        .setInteractive();

      const levelLabel = this.add
        .text(w / 2, h * 0.35, title, {
          fontFamily: "Arial, sans-serif",
          fontSize: this.isCompact ? "24px" : "36px",
          color: this.skin.bannerText,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(26);

      const transText = this.add
        .text(w / 2, h * 0.5, subtitle, {
          fontFamily: "Arial, sans-serif",
          fontSize: this.isCompact ? "14px" : "20px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: w * 0.8 },
          lineSpacing: 6,
        })
        .setOrigin(0.5)
        .setDepth(26);

      const hint = this.add
        .text(w / 2, h * 0.62, hintText, {
          fontFamily: "Arial, sans-serif",
          fontSize: this.isCompact ? "12px" : "16px",
          color: "#aaaaaa",
          fontStyle: "italic",
        })
        .setOrigin(0.5)
        .setDepth(26);

      this.tweens.add({
        targets: [levelLabel, transText, hint],
        alpha: { from: 0, to: 1 },
        duration: 400,
      });

      this.time.delayedCall(2500, () => {
        this.tweens.add({
          targets: [overlay, levelLabel, transText, hint],
          alpha: 0,
          duration: 300,
          onComplete: () => {
            overlay.destroy();
            levelLabel.destroy();
            transText.destroy();
            hint.destroy();
            // Upgrade after every 2 boss levels: bossLv 1,3,5,7,9
            // After boss → gigy-wave → boss: currentLevel was incremented
            if (this.gameState.levelType === "boss" && this.gameState.currentLevel % 2 === 1) {
              this.showUpgradeMenu();
            } else {
              this.startLevel();
            }
          },
        });
      });
    }

    // ─── END GAME ────────────────────────────────────────────────

    private endGame(won: boolean) {
      this.gamePhase = won ? "win" : "game-over";
      const r = results(this.gameState);
      const msg = won
        ? `Victory! Score: ${r.score} | Accuracy: ${(r.accuracy * 100).toFixed(0)}%`
        : `Game Over! Score: ${r.score} | Accuracy: ${(r.accuracy * 100).toFixed(0)}%`;
      const w = this.scale.width;
      const h = this.scale.height;
      const overlay = this.add
        .rectangle(w / 2, h / 2, w, h, 0x000000, 0.7)
        .setDepth(25)
        .setInteractive();
      const text = this.add
        .text(w / 2, h / 2, msg, {
          fontFamily: "Arial, sans-serif",
          fontSize: "28px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: w * 0.8 },
        })
        .setOrigin(0.5)
        .setDepth(26);
      this.time.delayedCall(2000, () => {
        overlay.destroy();
        text.destroy();
        context.complete(r);
        this.game.destroy(true);
      });
    }

    // ─── SPAWN BOSSES / GIGYS ────────────────────────────────────

    private startLevel() {
      this.gamePhase = "playing";
      if (this.gameState.levelType === "boss") {
        this.spawnBosses();
        this.spawnGigys();
      } else {
        // Gigy wave: no bosses, many gigies
        for (const b of this.bossImages) b.setVisible(false);
        for (const l of this.bossLabels) l.setVisible(false);
        for (const h of this.bossHPBars) h.setVisible(false);
        this.spawnGigys();
      }
      this.updateUI();
    }

    private spawnBosses() {
      for (const b of this.bossImages) b.destroy();
      for (const l of this.bossLabels) l.destroy();
      for (const h of this.bossHPBars) h.destroy();
      this.bossImages = [];
      this.bossLabels = [];
      this.bossHPBars = [];

      const w = this.scale.width;
      const h = this.scale.height;
      const labels = getBossLabels(this.gameState.vocabulary, this.gameState.currentLevel);
      const bossIndices = this.gameState.bossIndices;

      let positions: number[];
      let yPositions: number[];
      if (this.isCompact) {
        // Mobile: 3 bosses in a horizontal row
        const spacing = w * 0.3;
        positions = [w / 2 - spacing, w / 2, w / 2 + spacing];
        yPositions = [h * 0.3, h * 0.3, h * 0.3];
      } else {
        positions = [w * 0.25, w * 0.5, w * 0.75];
        yPositions = [h * 0.35, h * 0.35, h * 0.35];
      }

      for (let i = 0; i < 3; i++) {
        const bossIdx = (bossIndices[i] ?? 0) + 1;
        const scale = (BOSS_SCALES[bossIndices[i] ?? 0] ?? 1) * (this.isCompact ? 0.12 : 0.18);
        const boss = this.add
          .image(positions[i]!, yPositions[i]!, `boss${bossIdx}`)
          .setScale(scale)
          .setAngle(90)
          .setDepth(4)
          .setInteractive();
        boss.on("pointerdown", () => {
          if (this.gamePhase === "playing") this.onBossShot(i);
        });
        this.bossImages.push(boss);

        const label = this.add
          .text(positions[i]!, (yPositions[i] ?? 0) + 50, labels[i]!, {
            fontFamily: "Arial, sans-serif",
            fontSize: this.isCompact ? "12px" : "16px",
            color: "#ffffff",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(6);
        this.bossLabels.push(label);

        const hpBar = this.add.graphics().setDepth(7);
        this.bossHPBars.push(hpBar);
      }
      this.updateBossHPBars();
    }

    private spawnGigys() {
      for (const g of this.gigyImages) g.destroy();
      this.gigyImages = [];
      const w = this.scale.width;
      const count = this.gameState.gigyCount;
      for (let i = 0; i < count; i++) {
        const gigyIdx = (i % TOTAL_GIGY_IMAGES) + 1;
        const x = w * (0.2 + (0.6 * i) / Math.max(count - 1, 1));
        const y = -30 - i * 25;
        const gigy = this.add
          .image(x, y, `gigy${gigyIdx}`)
          .setScale(0.15)
          .setAngle(90)
          .setDepth(3);
        this.gigyImages.push(gigy);
      }
      this.gigyShootTimer = 0;
    }

    // ─── LAYOUT ──────────────────────────────────────────────────

    private layout(w: number, h: number) {
      this.translationBanner?.setPosition(w / 2, 20);
      this.levelText?.setPosition(10, 20);
      this.scoreText?.setPosition(w - 10, 20);
      this.settingsBtn?.setPosition(w - 40, 18);
      if (this.playerShip) {
        this.playerY = this.isCompact ? h * 0.88 : h * 0.85;
        this.playerShip.setY(this.playerY);
      }
      this.redFlash?.setPosition(w / 2, h / 2);
      this.redFlash?.setSize(w, h);
      // Reposition menu on resize so it stays centered
      if (this.menuContainer.visible) {
        this.menuContainer.setPosition(w / 2, h / 2);
      }
    }

    // ─── MEMORY TEARDOWN ───────────────────────────────────────────

    shutdown() {
      this.scale.off("resize");
      this.time.removeAllEvents();
      for (const b of this.playerBullets.getChildren()) (b as Phaser.GameObjects.Image).destroy();
      for (const e of this.enemyBullets.getChildren()) (e as Phaser.GameObjects.Image).destroy();
      for (const s of this.stars) s.destroy();
      for (const b of this.bossImages) b.destroy();
      for (const l of this.bossLabels) l.destroy();
      for (const h of this.bossHPBars) h.destroy();
      for (const g of this.gigyImages) g.destroy();
      if (this.playerShip) this.playerShip.destroy();
      if (this.settingsBtn) this.settingsBtn.destroy();
      if (this.menuContainer) this.menuContainer.destroy();
      if (this.menuBg) this.menuBg.destroy();
      if (this.upgradeContainer) this.upgradeContainer.destroy();
      if (this.upgradeBg) this.upgradeBg.destroy();
      if (this.translationBanner) this.translationBanner.destroy();
      if (this.levelText) this.levelText.destroy();
      if (this.scoreText) this.scoreText.destroy();
      if (this.shieldBar) this.shieldBar.destroy();
      if (this.shieldText) this.shieldText.destroy();
      if (this.redFlash) this.redFlash.destroy();
      if (this.audioCtx && this.audioCtx.state !== "closed") {
        this.audioCtx.close().catch(() => {});
        this.audioCtx = null;
      }
      this.playerBullets.clear(true, true);
      this.enemyBullets.clear(true, true);
    }

    // ─── AUDIO ───────────────────────────────────────────────────

    private playBeep(
      freq: number,
      duration: number,
      type: OscillatorType = "sine",
      volume: number = 0.2,
    ) {
      try {
        if (!this.audioCtx) this.audioCtx = new AudioContext();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = type;
        gain.gain.value = volume;
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
      } catch {
        // AudioContext may not be available
      }
    }
  };
}
