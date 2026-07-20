import Phaser from "phaser";
import type { CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit";
import {
  createGameState, gridLayout, results, shoot, shootObstacle, tick, targetTranslation,
  comboScore, comboTier, wordResults, TIMER_SECONDS, TIME_BONUS_PER_HIT, BOMB_TIME_PENALTY,
  type GameState, type MonsterData, type MonsterType, type ObstacleData,
} from "./systems";

const ZOMBIE_SKINS: Record<MonsterType, number> = {
  normal: 0x5a7a5a,
  shy: 0x4a6a6a,
  fast: 0x7a5a5a,
  shield: 0x6a6a5a,
};

function hex(n: number): string { return `#${n.toString(16).padStart(6, "0")}`; }

function drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, pts: number, outer: number, inner: number) {
  const step = Math.PI / pts;
  g.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = i * step - Math.PI / 2;
    if (i === 0) g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.closePath();
  g.fillPath();
}

function drawZombieBody(g: Phaser.GameObjects.Graphics, bw: number, bh: number, skin: number) {
  g.fillStyle(0x3a3a3a, 1);
  g.beginPath();
  g.moveTo(-bw * 0.3, -bh * 0.1);
  g.lineTo(-bw * 0.35, bh * 0.1);
  g.lineTo(-bw * 0.25, bh * 0.35);
  g.lineTo(bw * 0.25, bh * 0.37);
  g.lineTo(bw * 0.35, bh * 0.12);
  g.lineTo(bw * 0.3, -bh * 0.1);
  g.closePath();
  g.fillPath();

  g.fillStyle(skin, 1);
  g.fillEllipse(0, 0, bw * 0.7, bh * 0.6);

  g.fillStyle(skin, 1);
  g.fillCircle(0, -bh * 0.35, bw * 0.22);

  g.fillStyle(0x2a2a2a, 0.7);
  g.fillCircle(-bw * 0.08, -bh * 0.37, bw * 0.06);
  g.fillCircle(bw * 0.08, -bh * 0.37, bw * 0.06);

  g.fillStyle(0xccccaa, 1);
  g.fillCircle(-bw * 0.08, -bh * 0.37, bw * 0.025);
  g.fillCircle(bw * 0.08, -bh * 0.37, bw * 0.025);

  g.fillStyle(skin, 1);
  g.fillRect(-bw * 0.5, -bh * 0.1, bw * 0.2, bh * 0.06);
  g.fillRect(bw * 0.3, -bh * 0.1, bw * 0.2, bh * 0.06);

  g.fillStyle(skin, 1);
  g.fillRoundedRect(-bw * 0.2, bh * 0.25, bw * 0.15, bh * 0.1, 3);
  g.fillRoundedRect(bw * 0.05, bh * 0.25, bw * 0.15, bh * 0.1, 3);
}

function drawBat(g: Phaser.GameObjects.Graphics) {
  g.fillStyle(0x333355, 1);
  g.fillEllipse(0, 0, 12, 8);
  g.beginPath(); g.moveTo(-6, 0); g.lineTo(-25, -15); g.lineTo(-20, 5); g.closePath(); g.fillPath();
  g.beginPath(); g.moveTo(6, 0); g.lineTo(25, -15); g.lineTo(20, 5); g.closePath(); g.fillPath();
  g.fillStyle(0xff4444, 1);
  g.fillCircle(-3, -2, 2);
  g.fillCircle(3, -2, 2);
}

function drawBomb(g: Phaser.GameObjects.Graphics) {
  g.fillStyle(0x222222, 1);
  g.fillCircle(0, 0, 18);
  g.fillStyle(0x444444, 0.5);
  g.fillCircle(-5, -5, 6);
  g.fillStyle(0x8B7355, 1);
  g.fillRect(-2, -22, 4, 8);
  g.fillStyle(0xFFAA00, 1);
  g.fillTriangle(-4, -24, 4, -24, 0, -32);
}

interface MV {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Graphics;
  leftEW: Phaser.GameObjects.Graphics;
  rightEW: Phaser.GameObjects.Graphics;
  leftP: Phaser.GameObjects.Graphics;
  rightP: Phaser.GameObjects.Graphics;
  mouth: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  baseX: number;
  baseY: number;
  floatTween?: Phaser.Tweens.Tween;
  shieldGfx?: Phaser.GameObjects.Graphics;
  shyTimer?: Phaser.Time.TimerEvent;
}

export function createMonsterScene(context: CartridgeGameConfigContext): typeof Phaser.Scene {
  return class MonsterScene extends Phaser.Scene {
    private state: GameState = createGameState(context.input, context.seed);
    private vis = new Map<number, MV>();
    private obstacleVis = new Map<number, Phaser.GameObjects.Container>();
    private cannon?: { container: Phaser.GameObjects.Container };
    private starEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
    private coinEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
    private hud?: {
      target: Phaser.GameObjects.Text;
      score: Phaser.GameObjects.Text;
      hint: Phaser.GameObjects.Text;
      progress: Phaser.GameObjects.Text;
      timerBar: Phaser.GameObjects.Graphics;
      timerText: Phaser.GameObjects.Text;
      comboText: Phaser.GameObjects.Text;
    };
    private locked = false;
    private timerEvent?: Phaser.Time.TimerEvent;
    private doorContainer?: Phaser.GameObjects.Container;
    private doorGlow?: Phaser.GameObjects.Graphics;
    private streakFlame?: Phaser.GameObjects.Graphics;

    create() {
      this.cameras.main.setBackgroundColor(0x0a0a1a);
      this.genTextures();
      this.drawDarkForest();
      this.buildCannon();
      this.buildMonsters();
      this.buildObstacles();
      this.buildParticles();
      this.buildHUD();
      this.bindInput();
      this.scale.on("resize", () => this.layout());
      this.layout();
      this.syncHUD();
      this.startIdle();
      this.startTimer();
      context.diagnostic({ code: "GAME_READY", message: "Zombie apocalypse ready" });
    }

    private genTextures() {
      const sg = this.add.graphics();
      sg.fillStyle(0xffd700, 1);
      drawStar(sg, 12, 12, 5, 10, 5);
      sg.generateTexture("star_p", 24, 24);
      sg.destroy();

      const cg = this.add.graphics();
      cg.fillStyle(0xffdd44, 1);
      cg.fillCircle(8, 8, 8);
      cg.fillStyle(0xffee88, 1);
      cg.fillCircle(7, 7, 4);
      cg.generateTexture("coin_p", 16, 16);
      cg.destroy();
    }

    private drawDarkForest() {
      const w = this.scale.width;
      const h = this.scale.height;
      const bg = this.add.graphics().setDepth(0);

      bg.fillStyle(0x0a0a1a, 1);
      bg.fillRect(0, 0, w, h);

      bg.fillStyle(0x1a0a2a, 1);
      bg.fillRect(0, 0, w, h * 0.4);

      bg.fillStyle(0xeeeedd, 0.9);
      bg.fillCircle(w * 0.85, h * 0.1, 40);
      bg.fillStyle(0x0a0a1a, 0.9);
      bg.fillCircle(w * 0.85 + 12, h * 0.1 - 6, 35);

      bg.fillStyle(0x1a1a2e, 1);
      this.drawTree(bg, w * 0.08, h * 0.5);
      this.drawTree(bg, w * 0.92, h * 0.45);
      this.drawTree(bg, w * 0.3, h * 0.55);
      this.drawTree(bg, w * 0.75, h * 0.52);

      bg.fillStyle(0x2a3a2a, 1);
      bg.fillRect(0, h * 0.82, w, h * 0.18);
      bg.fillStyle(0x1a2a1a, 1);
      bg.fillRect(0, h * 0.82, w, 4);

      for (let i = 0; i < 4; i++) {
        const fog = this.add.graphics().setDepth(0);
        fog.fillStyle(0x888899, 0.06);
        fog.fillRect(0, h * (0.25 + i * 0.18), w, 30);
        this.tweens.add({
          targets: fog, x: { from: -40, to: 40 },
          duration: 6000 + i * 2000, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
        });
      }

      this.drawTombstone(w * 0.15, h * 0.78);
      this.drawTombstone(w * 0.55, h * 0.8);
      this.drawTombstone(w * 0.8, h * 0.77);

      this.drawDoor(w * 0.12, h * 0.55, w * 0.14, h * 0.27);
    }

    private drawTree(g: Phaser.GameObjects.Graphics, x: number, y: number) {
      g.fillRect(x - 5, y, 10, 120);
      g.lineStyle(3, 0x1a1a2e, 1);
      g.lineBetween(x, y + 20, x - 35, y - 15);
      g.lineBetween(x, y + 35, x + 30, y + 5);
      g.lineBetween(x, y + 50, x - 20, y + 25);
      g.lineBetween(x, y + 60, x + 25, y + 40);
    }

    private drawTombstone(x: number, y: number) {
      const t = this.add.graphics().setDepth(0);
      t.fillStyle(0x555566, 1);
      t.fillRoundedRect(x - 15, y - 25, 30, 35, { tl: 10, tr: 10, bl: 0, br: 0 });
      t.lineStyle(1, 0x444455, 0.8);
      t.strokeRoundedRect(x - 15, y - 25, 30, 35, { tl: 10, tr: 10, bl: 0, br: 0 });
      t.fillStyle(0x444455, 1);
      t.fillRect(x - 3, y - 15, 6, 1);
      t.fillRect(x - 1, y - 12, 2, 8);
    }

    private drawDoor(x: number, y: number, dw: number, dh: number) {
      this.doorGlow = this.add.graphics().setDepth(4).setAlpha(0);
      this.doorGlow.fillStyle(context.edition.colors.accent, 0.4);
      this.doorGlow.fillRoundedRect(x - 8, y - dh * 0.15, dw + 16, dh + 12, 18);

      const door = this.add.graphics().setDepth(5);
      door.fillStyle(0x6b3a1f, 1); door.fillEllipse(x + dw / 2, y, dw + 8, dh * 0.2);
      door.fillStyle(0x5c3317, 1); door.fillRoundedRect(x - 4, y - 2, dw + 8, dh + 4, { tl: 12, tr: 12, bl: 0, br: 0 });
      door.fillStyle(0x8b5e3c, 1); door.fillRoundedRect(x, y + 4, dw, dh - 4, { tl: 10, tr: 10, bl: 0, br: 0 });
      door.lineStyle(1, 0x7a4f2e, 0.4);
      door.lineBetween(x + dw * 0.3, y + 10, x + dw * 0.3, y + dh - 5);
      door.lineBetween(x + dw * 0.7, y + 10, x + dw * 0.7, y + dh - 5);
      door.fillStyle(0x7a4f2e, 1); door.fillRoundedRect(x + 8, y + 14, dw - 16, dh * 0.28, 4);
      door.fillRoundedRect(x + 8, y + dh * 0.42, dw - 16, dh * 0.42, 4);
      door.fillStyle(0x9b6b45, 1); door.fillRoundedRect(x + 12, y + 18, dw - 24, dh * 0.22, 3);
      door.fillRoundedRect(x + 12, y + dh * 0.46, dw - 24, dh * 0.34, 3);
      door.fillStyle(0xffd700, 1); door.fillCircle(x + dw - 16, y + dh * 0.52, 7);
      door.fillStyle(0xffee88, 1); door.fillCircle(x + dw - 17, y + dh * 0.51, 3);
      door.fillStyle(0x333333, 1); door.fillCircle(x + dw - 16, y + dh * 0.62, 3);
      door.fillRect(x + dw - 17.5, y + dh * 0.62, 3, 6);
      door.fillStyle(0x6b3a1f, 1); door.fillRect(x - 6, y + dh, dw + 12, 6);
      door.fillStyle(0x5c3317, 1); door.fillRect(x - 3, y + dh + 6, dw + 6, 4);

      this.doorContainer = this.add.container(x + dw / 2, y + dh / 2).setDepth(5);
      this.doorContainer.add([this.doorGlow, door]);
    }

    private buildCannon() {
      const c = this.add.container(0, 0).setDepth(10);
      const base = this.add.graphics();
      base.fillStyle(0x555555, 1); base.fillCircle(0, 0, 22);
      base.fillStyle(0x666666, 1); base.fillCircle(0, -2, 16);
      const barrel = this.add.graphics();
      barrel.fillStyle(0x777777, 1); barrel.fillRoundedRect(-7, -48, 14, 46, 4);
      barrel.fillStyle(context.edition.colors.accent, 1); barrel.fillCircle(0, -48, 6);
      c.add([base, barrel]);
      this.streakFlame = this.add.graphics().setDepth(9).setAlpha(0);
      this.cannon = { container: c };
    }

    private buildMonsters() {
      const tc = "#ffffff";
      this.state.monsters.forEach((m, i) => {
        const skin = ZOMBIE_SKINS[m.type] ?? ZOMBIE_SKINS.normal;
        const ctr = this.add.container(0, 0).setDepth(10);
        const bw = 100, bh = 90;

        const body = this.add.graphics();
        drawZombieBody(body, bw, bh, skin);

        if (m.type === "fast") {
          body.lineStyle(2, 0xffffff, 0.3);
          body.lineBetween(-bw * 0.7, -bh * 0.1, -bw * 0.9, -bh * 0.1);
          body.lineBetween(-bw * 0.65, bh * 0.05, -bw * 0.85, bh * 0.05);
          body.lineBetween(-bw * 0.7, bh * 0.2, -bw * 0.9, bh * 0.2);
        }

        const es = bw * 0.2, ey = -bh * 0.12, er = bw * 0.11;
        const lew = this.add.graphics(); lew.fillStyle(0xffffff, 1); lew.fillCircle(0, 0, er); lew.setPosition(-es, ey);
        const rew = this.add.graphics(); rew.fillStyle(0xffffff, 1); rew.fillCircle(0, 0, er); rew.setPosition(es, ey);
        const lp = this.add.graphics(); lp.fillStyle(0x222222, 1); lp.fillCircle(0, 0, er * 0.5); lp.setPosition(-es + 2, ey + 2);
        const rp = this.add.graphics(); rp.fillStyle(0x222222, 1); rp.fillCircle(0, 0, er * 0.5); rp.setPosition(es + 2, ey + 2);

        const mouth = this.add.graphics();
        mouth.lineStyle(2, 0x222222, 1); mouth.beginPath();
        mouth.arc(0, bh * 0.08, bw * 0.15, 0.2, Math.PI - 0.2, false); mouth.strokePath();

        const label = this.add.text(0, bh * 0.55, m.term, {
          fontFamily: "Arial, sans-serif", fontSize: "16px", fontStyle: "bold", color: tc, align: "center", wordWrap: { width: 120 },
        }).setOrigin(0.5);

        let shieldGfx: Phaser.GameObjects.Graphics | undefined;
        if (m.type === "shield" && m.shieldHp > 1) {
          shieldGfx = this.add.graphics();
          shieldGfx.lineStyle(3, 0x8a8a6a, 0.7);
          shieldGfx.strokeCircle(0, 0, bw * 0.58);
          ctr.add(shieldGfx);
        }

        ctr.add([body, lew, rew, lp, rp, mouth, label]);
        ctr.setSize(bw * 1.2, bh * 1.4);
        ctr.setInteractive({ useHandCursor: true });
        ctr.on("pointerdown", () => this.fire(m.id));

        let shyTimer: Phaser.Time.TimerEvent | undefined;
        if (m.type === "shy") {
          ctr.setAlpha(0.85);
          shyTimer = this.time.addEvent({
            delay: 2500, loop: true,
            callback: () => {
              if (!ctr.visible || !m.alive) return;
              this.tweens.add({ targets: ctr, alpha: 0.12, duration: 400, yoyo: true, hold: 900, ease: "Sine.easeInOut" });
            },
          });
        }

        this.vis.set(m.id, { container: ctr, body, leftEW: lew, rightEW: rew, leftP: lp, rightP: rp, mouth, label, baseX: 0, baseY: 0, shieldGfx, shyTimer });
      });
    }

    private buildObstacles() {
      this.state.obstacles.forEach((o) => {
        if (o.type === "bomb") this.buildBombObstacle(o);
        if (o.type === "bat") this.buildBatObstacle(o);
      });
    }

    private buildBombObstacle(o: ObstacleData) {
      const ctr = this.add.container(0, 0).setDepth(12);
      const gfx = this.add.graphics();
      drawBomb(gfx);
      ctr.add(gfx);
      ctr.setSize(40, 40);
      ctr.setInteractive({ useHandCursor: true });
      ctr.on("pointerdown", () => this.onBombClick(o.id));
      this.tweens.add({
        targets: ctr, scaleX: { from: 1, to: 1.12 }, scaleY: { from: 1, to: 1.12 },
        duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
      this.obstacleVis.set(o.id, ctr);
    }

    private buildBatObstacle(o: ObstacleData) {
      const w = this.scale.width;
      const h = this.scale.height;
      const ctr = this.add.container(-40, Phaser.Math.Between(h * 0.15, h * 0.55)).setDepth(15);
      const gfx = this.add.graphics();
      drawBat(gfx);
      ctr.add(gfx);

      this.tweens.add({
        targets: ctr, x: w + 40,
        duration: Phaser.Math.Between(3000, 5000),
        ease: "Sine.easeInOut", yoyo: true, repeat: -1,
      });
      this.tweens.add({
        targets: ctr, y: ctr.y + 30,
        duration: Phaser.Math.Between(600, 1000),
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
      this.tweens.add({
        targets: gfx, scaleY: { from: 1, to: 0.6 },
        duration: 150, yoyo: true, repeat: -1,
      });
      this.obstacleVis.set(o.id, ctr);
    }

    private buildParticles() {
      this.starEmitter = this.add.particles(0, 0, "star_p", {
        speed: { min: 80, max: 280 }, angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0 },
        lifespan: { min: 400, max: 700 }, gravityY: 120, emitting: false, maxParticles: 40,
      }).setDepth(20);
      this.coinEmitter = this.add.particles(0, 0, "coin_p", {
        speed: { min: 40, max: 120 }, angle: { min: 220, max: 320 },
        scale: { start: 1, end: 0.3 }, alpha: { start: 1, end: 0 },
        lifespan: { min: 500, max: 900 }, gravityY: 200, emitting: false, maxParticles: 15,
      }).setDepth(20);
    }

    private buildHUD() {
      const tc = "#ffffff";
      const target = this.add.text(0, 0, "", { fontFamily: "Arial, sans-serif", fontSize: "24px", fontStyle: "bold", color: tc, align: "center", wordWrap: { width: 700 }, padding: { x: 10, y: 6 } }).setOrigin(0.5).setDepth(50);
      const score = this.add.text(0, 0, "", { fontFamily: "Arial, sans-serif", fontSize: "18px", fontStyle: "bold", color: tc, align: "right" }).setOrigin(1, 0).setDepth(50);
      const progress = this.add.text(0, 0, "", { fontFamily: "Arial, sans-serif", fontSize: "16px", color: tc, align: "left" }).setOrigin(0, 0).setDepth(50);
      const hint = this.add.text(0, 0, "", { fontFamily: "Arial, sans-serif", fontSize: "14px", color: tc, align: "center" }).setOrigin(0.5).setDepth(50);
      const timerBar = this.add.graphics().setDepth(50);
      const timerText = this.add.text(0, 0, `${TIMER_SECONDS}`, { fontFamily: "Arial, sans-serif", fontSize: "20px", fontStyle: "bold", color: "#ffffff", align: "center", stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5).setDepth(50);
      const comboText = this.add.text(0, 0, "", { fontFamily: "Arial, sans-serif", fontSize: "48px", fontStyle: "bold", color: "#ffdd00", align: "center", stroke: "#000000", strokeThickness: 5 }).setOrigin(0.5).setDepth(60).setAlpha(0);
      this.hud = { target, score, hint, progress, timerBar, timerText, comboText };
    }

    private bindInput() {
      const keys = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];
      keys.forEach((k, i) => {
        this.input.keyboard?.on(`keydown-${k}`, () => {
          if (this.locked || this.state.gameOver) return;
          const alive = this.state.monsters.filter((m) => m.alive);
          if (i < alive.length) this.fire(alive[i]!.id);
        });
      });
    }

    private startTimer() {
      this.timerEvent?.remove();
      this.timerEvent = this.time.addEvent({
        delay: 1000, loop: true,
        callback: () => {
          if (this.state.completed || this.state.gameOver) { this.timerEvent?.remove(); return; }
          this.state = tick(this.state);
          this.drawTimerBar();
          if (this.hud) this.hud.timerText.setText(`${Math.max(0, this.state.timeLeft)}`);
          if (this.state.gameOver) this.showTimeUp();
        },
      });
    }

    private drawTimerBar() {
      if (!this.hud) return;
      const g = this.hud.timerBar;
      const w = this.scale.width;
      const barW = Math.min(300, w * 0.4);
      const barH = 18;
      const barX = (w - barW) / 2;
      const barY = 8;
      const progress = Math.max(0, this.state.timeLeft / TIMER_SECONDS);
      g.clear();
      g.fillStyle(0x333333, 0.7); g.fillRoundedRect(barX, barY, barW, barH, 9);
      const fillW = barW * progress;
      if (fillW > 0) {
        g.fillStyle(progress > 0.5 ? 0x00ff88 : progress > 0.25 ? 0xffcc00 : 0xff4444, 1);
        g.fillRoundedRect(barX, barY, fillW, barH, 9);
      }
      g.lineStyle(2, 0xffffff, 0.4); g.strokeRoundedRect(barX, barY, barW, barH, 9);
      if (this.hud.timerText) this.hud.timerText.setPosition(w / 2, barY + barH / 2);
    }

    private startIdle() {
      this.state.monsters.forEach((m) => {
        const v = this.vis.get(m.id);
        if (!v) return;
        const range = m.type === "fast" ? 50 : 20;
        const dur = m.type === "fast" ? 800 : 3000;
        v.floatTween = this.tweens.add({
          targets: v.container,
          x: v.baseX + Phaser.Math.Between(-range, range),
          y: v.baseY + Phaser.Math.Between(-range * 0.7, range * 0.7),
          duration: Phaser.Math.Between(dur, dur + 1500),
          ease: "Sine.easeInOut", yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1000),
        });
        this.tweens.add({ targets: v.body, angle: { from: -3, to: 3 }, duration: 800 + Math.random() * 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        if (m.type !== "shy") {
          this.time.addEvent({
            delay: 2000 + Math.random() * 2000, loop: true,
            callback: () => { if (v.container.visible) this.tweens.add({ targets: [v.leftEW, v.rightEW], scaleY: 0.1, duration: 60, yoyo: true, ease: "Sine.easeInOut" }); },
          });
        }
      });
    }

    private fire(id: number) {
      if (this.locked || this.state.completed || this.state.gameOver) return;
      const m = this.state.monsters.find((x) => x.id === id);
      if (!m || !m.alive) return;
      const v = this.vis.get(id);
      if (!v || !this.cannon) return;

      this.locked = true;
      const correct = m.isTarget;
      const cx = this.cannon.container.x, cy = this.cannon.container.y;
      const tx = v.container.x, ty = v.container.y;
      this.cannon.container.setRotation(Phaser.Math.Angle.Between(cx, cy, tx, ty) + Math.PI / 2);

      this.fireProjectile(cx, cy - 40, tx, ty, () => {
        const wasShield = m.type === "shield" && m.shieldHp > 1;
        this.state = shoot(this.state, id);
        if (correct) {
          if (wasShield) this.onShieldHit(v);
          else this.onHit(v);
        } else {
          this.onMiss(v);
        }
        this.syncHUD();
        this.updateStreakFlame();
        if (this.state.completed) this.time.delayedCall(700, () => this.showWin());
      });
    }

    private onBombClick(id: number) {
      if (this.locked || this.state.completed || this.state.gameOver) return;
      this.locked = true;
      const bombCtr = this.obstacleVis.get(id);
      if (!bombCtr) { this.locked = false; return; }

      this.state = shootObstacle(this.state, id);
      this.cameras.main.shake(300, 0.02);
      this.cameras.main.flash(200, 255, 100, 0);

      const penalty = this.add.text(bombCtr.x, bombCtr.y - 30, `-${BOMB_TIME_PENALTY}s`, {
        fontFamily: "Arial, sans-serif", fontSize: "28px", fontStyle: "bold", color: "#ff4444",
        stroke: "#000000", strokeThickness: 3,
      }).setOrigin(0.5).setDepth(50);
      this.tweens.add({ targets: penalty, y: bombCtr.y - 80, alpha: 0, duration: 800, onComplete: () => penalty.destroy() });

      this.tweens.add({
        targets: bombCtr, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 300,
        onComplete: () => { bombCtr.destroy(); this.obstacleVis.delete(id); },
      });

      this.updateStreakFlame();
      this.syncHUD();
      this.time.delayedCall(300, () => { this.locked = false; });
    }

    private fireProjectile(fx: number, fy: number, tx: number, ty: number, cb: () => void) {
      const star = this.add.graphics().setDepth(15);
      star.fillStyle(context.edition.colors.accent, 1);
      drawStar(star, 0, 0, 5, 10, 5);
      star.setPosition(fx, fy);
      this.tweens.add({ targets: star, x: tx, y: ty, duration: 250, ease: "Power2", onComplete: () => { star.destroy(); cb(); } });
    }

    private onShieldHit(v: MV) {
      if (v.shieldGfx) {
        v.shieldGfx.clear();
        v.shieldGfx.lineStyle(2, 0x8a8a6a, 0.5);
        v.shieldGfx.lineBetween(-20, -20, 20, 20);
        v.shieldGfx.lineBetween(-20, 20, 20, -20);
        this.time.delayedCall(400, () => { v.shieldGfx?.destroy(); });
      }
      this.cameras.main.flash(150, 150, 150, 100);
      this.cameras.main.shake(100, 0.008);
      this.time.delayedCall(200, () => { this.locked = false; });
    }

    private onHit(v: MV) {
      const cx = v.container.x, cy = v.container.y;
      const tier = comboTier(this.state.combo);
      const pts = comboScore(this.state.combo);

      v.floatTween?.stop();
      const starCount = tier === "incredible" ? 25 : tier === "great" ? 20 : tier === "good" ? 15 : 10;
      this.starEmitter?.explode(starCount, cx, cy);
      this.coinEmitter?.explode(tier === "normal" ? 4 : 8, cx, cy);

      if (tier === "incredible") { this.cameras.main.flash(300, 100, 255, 100); this.cameras.main.shake(200, 0.012); }
      else if (tier === "great") this.cameras.main.flash(200, 200, 255, 50);
      else if (tier === "good") this.cameras.main.flash(150, 50, 255, 100);
      else this.cameras.main.flash(100, 200, 255, 200);

      const plus = this.add.text(cx, cy - 50, `+${pts}`, {
        fontFamily: "Arial, sans-serif", fontSize: tier === "incredible" ? "32px" : "26px", fontStyle: "bold",
        color: tier === "incredible" ? "#44ff44" : tier === "great" ? "#88ff88" : tier === "good" ? "#aaffaa" : "#ccffcc",
        stroke: "#000000", strokeThickness: 3,
      }).setOrigin(0.5).setDepth(50);
      this.tweens.add({ targets: plus, y: cy - 110, alpha: 0, duration: 900, ease: "Power1", onComplete: () => plus.destroy() });

      if (this.state.combo >= 3) this.showCombo(this.state.combo);

      this.tweens.add({
        targets: v.container, angle: 360, scaleX: 0, scaleY: 0, alpha: 0, duration: 500, ease: "Back.easeIn",
        onComplete: () => { v.container.setVisible(false); this.locked = false; },
      });
    }

    private showCombo(count: number) {
      if (!this.hud) return;
      const tier = comboTier(count);
      const color = tier === "incredible" ? "#44ff44" : tier === "great" ? "#88ff88" : "#aaffaa";
      const size = tier === "incredible" ? "64px" : tier === "great" ? "56px" : "48px";
      const label = tier === "incredible" ? "INCREDIBLE!" : tier === "great" ? "GREAT!" : "GOOD!";
      this.hud.comboText.setText(`${count}x ${label}`);
      this.hud.comboText.setColor(color);
      this.hud.comboText.setFontSize(size);
      this.hud.comboText.setScale(0.3);
      this.hud.comboText.setAlpha(1);
      this.tweens.add({
        targets: this.hud.comboText, scale: { from: 0.3, to: 1.4 }, duration: 200, ease: "Back.easeOut",
        onComplete: () => { if (this.hud) this.tweens.add({ targets: this.hud.comboText, scale: 1.0, alpha: 0, duration: 600, ease: "Sine.easeIn", delay: 300 }); },
      });
    }

    private onMiss(v: MV) {
      const ox = v.container.x;
      this.tweens.add({ targets: v.container, x: ox + 18, duration: 50, yoyo: true, repeat: 3, ease: "Sine.easeInOut", onComplete: () => { v.container.x = ox; } });
      const cross = this.add.text(v.container.x, v.container.y, "✗", { fontFamily: "Arial, sans-serif", fontSize: "34px", fontStyle: "bold", color: "#ff4444", stroke: "#000000", strokeThickness: 2 }).setOrigin(0.5).setDepth(50);
      this.tweens.add({ targets: cross, alpha: 0, y: cross.y - 35, duration: 600, onComplete: () => cross.destroy() });
      this.cameras.main.shake(200, 0.015);
      const fo = this.add.graphics().setDepth(11);
      fo.fillStyle(0xff4444, 0.5); fo.fillEllipse(0, 0, 100, 90);
      fo.setPosition(v.container.x, v.container.y); fo.setScale(v.container.scaleX);
      this.time.delayedCall(200, () => { fo.destroy(); this.locked = false; });
    }

    private updateStreakFlame() {
      if (!this.streakFlame || !this.cannon) return;
      const combo = this.state.combo;
      if (combo >= 3) {
        const tier = comboTier(combo);
        const color = tier === "incredible" ? 0x44ff44 : tier === "great" ? 0x88ff88 : 0xaaffaa;
        this.streakFlame.clear();
        this.streakFlame.fillStyle(color, 0.4);
        this.streakFlame.fillCircle(0, 5, 30);
        this.streakFlame.fillStyle(color, 0.2);
        this.streakFlame.fillCircle(0, 10, 20);
        this.streakFlame.setPosition(this.cannon.container.x, this.cannon.container.y);
        this.streakFlame.setAlpha(0.8);
        if (!this.streakFlame.getData("tweening")) {
          this.streakFlame.setData("tweening", true);
          this.tweens.add({ targets: this.streakFlame, scaleX: { from: 1, to: 1.2 }, scaleY: { from: 1, to: 1.15 }, alpha: { from: 0.8, to: 0.5 }, duration: 300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
      } else {
        this.streakFlame.setAlpha(0);
        this.tweens.killTweensOf(this.streakFlame);
        this.streakFlame.setData("tweening", false);
      }
    }

    private showTimeUp() {
      this.locked = true;
      const w = this.scale.width, h = this.scale.height;
      const banner = this.add.text(w / 2, h * 0.3, "TIME'S UP!", {
        fontFamily: "Arial, sans-serif", fontSize: "52px", fontStyle: "bold", color: "#ff4444",
        align: "center", stroke: "#000000", strokeThickness: 5,
      }).setOrigin(0.5).setScale(0).setDepth(100);
      this.tweens.add({
        targets: banner, scaleX: 1, scaleY: 1, duration: 500, ease: "Back.easeOut",
        onComplete: () => this.time.delayedCall(800, () => this.showResultsPanel(w, h)),
      });
    }

    private showWin() {
      const w = this.scale.width, h = this.scale.height;
      this.state.monsters.forEach((m) => {
        const v = this.vis.get(m.id);
        if (!v) return;
        v.container.setVisible(true).setAlpha(0.3).setScale(0.6);
        this.tweens.add({ targets: v.container, y: v.container.y - 200, alpha: 0, duration: 1500, ease: "Power1" });
      });
      const banner = this.add.text(w / 2, h * 0.3, "ESCAPED!", {
        fontFamily: "Arial, sans-serif", fontSize: "52px", fontStyle: "bold", color: "#44ff44",
        align: "center", stroke: "#000000", strokeThickness: 5,
      }).setOrigin(0.5).setScale(0).setDepth(100);
      this.tweens.add({
        targets: banner, scaleX: 1, scaleY: 1, duration: 500, ease: "Back.easeOut",
        onComplete: () => {
          this.starEmitter?.explode(25, w / 2, h * 0.3);
          this.time.delayedCall(800, () => {
            this.tweens.add({ targets: banner, alpha: 0, duration: 300 });
            this.zoomToDoor(() => this.showResultsPanel(w, h));
          });
        },
      });
    }

    private zoomToDoor(onComplete: () => void) {
      if (!this.doorContainer) { onComplete(); return; }
      const cam = this.cameras.main;
      const doorX = this.doorContainer.x, doorY = this.doorContainer.y;
      const startZoom = cam.zoom, targetZoom = 3.0;
      const startScrollX = cam.scrollX, startScrollY = cam.scrollY;
      const targetScrollX = doorX - cam.width / (2 * targetZoom);
      const targetScrollY = doorY - cam.height / (2 * targetZoom);
      if (this.doorGlow) this.tweens.add({ targets: this.doorGlow, alpha: { from: 0, to: 0.6 }, duration: 400, yoyo: true, repeat: 2, ease: "Sine.easeInOut" });
      this.tweens.addCounter({
        from: 0, to: 1, duration: 1200, ease: "Sine.easeInOut",
        onUpdate: (_, value) => {
          cam.setZoom(startZoom + (targetZoom - startZoom) * value);
          cam.setScroll(startScrollX + (targetScrollX - startScrollX) * value, startScrollY + (targetScrollY - startScrollY) * value);
        },
        onComplete: () => {
          cam.fade(500, 0, 0, 0);
          cam.once("camerafadeoutcomplete", () => {
            cam.setZoom(1); cam.setScroll(0, 0);
            cam.fadeIn(300, 0, 0, 0);
            cam.once("camerafadeincomplete", () => onComplete());
          });
        },
      });
    }

    private showResultsPanel(w: number, h: number) {
      const r = results(this.state);
      const acc = Math.round(r.accuracy * 100);
      const wr = wordResults(this.state);
      const cx = w / 2, cy = h * 0.4;

      const correctWords = wr.filter((x) => x.correct);
      const missedWords = wr.filter((x) => !x.correct);
      const hasWords = correctWords.length > 0 || missedWords.length > 0;

      const panelW = Math.min(320, w * 0.8);
      const panelH = hasWords ? 240 : 160;
      const panel = this.add.graphics().setDepth(100);
      panel.fillStyle(0x000000, 0.85);
      panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 16);
      panel.lineStyle(2, context.edition.colors.accent, 0.8);
      panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 16);
      panel.setScale(0);

      let yy = cy - panelH / 2 + 20;
      const scoreText = this.add.text(cx, yy, `Score: ${r.score}`, {
        fontFamily: "Arial, sans-serif", fontSize: "24px", fontStyle: "bold", color: "#ffffff", align: "center",
      }).setOrigin(0.5).setDepth(101).setScale(0);
      yy += 30;

      const accText = this.add.text(cx, yy, `Accuracy: ${acc}%`, {
        fontFamily: "Arial, sans-serif", fontSize: "18px", color: "#cccccc", align: "center",
      }).setOrigin(0.5).setDepth(101).setScale(0);
      yy += 25;

      const xpText = this.add.text(cx, yy, `★ XP: ${r.xp}`, {
        fontFamily: "Arial, sans-serif", fontSize: "26px", fontStyle: "bold", color: "#ffd700",
        align: "center", stroke: "#000000", strokeThickness: 3,
      }).setOrigin(0.5).setDepth(101).setScale(0);
      yy += 35;

      if (hasWords) {
        if (correctWords.length > 0) {
          this.add.text(cx, yy, `✓ ${correctWords.map((x) => x.term).join("  ")}`, {
            fontFamily: "Arial, sans-serif", fontSize: "13px", color: "#44ff44", align: "center", wordWrap: { width: panelW - 30 },
          }).setOrigin(0.5, 0).setDepth(101);
          yy += 25;
        }
        if (missedWords.length > 0) {
          this.add.text(cx, yy, `✗ ${missedWords.map((x) => x.term).join("  ")}`, {
            fontFamily: "Arial, sans-serif", fontSize: "13px", color: "#ff4444", align: "center", wordWrap: { width: panelW - 30 },
          }).setOrigin(0.5, 0).setDepth(101);
        }
      }

      this.tweens.add({ targets: panel, scaleX: 1, scaleY: 1, duration: 300, ease: "Back.easeOut" });
      this.tweens.add({ targets: scoreText, scaleX: 1, scaleY: 1, duration: 300, ease: "Back.easeOut", delay: 100 });
      this.tweens.add({ targets: accText, scaleX: 1, scaleY: 1, duration: 300, ease: "Back.easeOut", delay: 200 });
      this.tweens.add({
        targets: xpText, scaleX: 1, scaleY: 1, duration: 400, ease: "Back.easeOut", delay: 300,
        onComplete: () => this.time.delayedCall(2000, () => context.complete(r)),
      });
    }

    private syncHUD() {
      if (!this.hud) return;
      const t = targetTranslation(this.state);
      this.hud.target.setText(t ? `Find: ${t}` : "");
      this.hud.score.setText(`Score: ${this.state.score}`);
      const done = this.state.monsters.filter((m) => !m.alive).length;
      this.hud.progress.setText(`${done}/${this.state.monsters.length}`);
      this.drawTimerBar();
    }

    private layout() {
      const w = this.scale.width, h = this.scale.height;
      const compact = h > w;
      const { cols, rows } = gridLayout(this.state.monsters.length, compact);

      if (this.hud) {
        this.hud.target.setPosition(w / 2, compact ? h * 0.08 : h * 0.1);
        this.hud.score.setPosition(w - 12, compact ? h * 0.06 : h * 0.08);
        this.hud.progress.setPosition(12, compact ? h * 0.06 : h * 0.08);
        this.hud.hint.setPosition(w / 2, h * 0.97);
        this.hud.hint.setText("Tap or click a zombie");
        this.hud.comboText.setPosition(w / 2, h * 0.45);
      }
      if (this.cannon) this.cannon.container.setPosition(w / 2, h * 0.9);

      const areaTop = compact ? h * 0.15 : h * 0.2;
      const areaH = h * 0.62;
      const padX = compact ? w * 0.05 : w * 0.04;
      const padY = areaH * 0.05;
      const cellW = (w - padX * 2) / cols;
      const cellH = (areaH - padY * 2) / rows;

      this.state.monsters.forEach((m) => {
        const v = this.vis.get(m.id);
        if (!v || !m.alive) return;
        const col = m.gridIndex % cols;
        const row = Math.floor(m.gridIndex / cols);
        const cx = padX + cellW * (col + 0.5);
        const cy = areaTop + padY + cellH * (row + 0.5);
        v.baseX = cx; v.baseY = cy;
        v.container.setPosition(cx, cy);
        v.container.setScale(Math.min(1, cellW / 130, cellH / 130));
        v.container.setVisible(true);
      });

      this.state.obstacles.forEach((o) => {
        if (!o.alive) return;
        const ctr = this.obstacleVis.get(o.id);
        if (!ctr) return;
        if (o.type === "bomb" && o.gridIndex >= 0) {
          const m = this.state.monsters[o.gridIndex];
          if (m) {
            const v = this.vis.get(m.id);
            if (v) ctr.setPosition(v.baseX + 35, v.baseY - 30);
          }
        }
      });

      this.drawTimerBar();
    }
  };
}
