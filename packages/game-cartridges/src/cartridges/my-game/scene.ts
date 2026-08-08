import Phaser from "phaser";
import type {
  CartridgeGameConfigContext,
  CompetitionAssetId,
} from "@reading-advantage/advantage-play-kit";
import {
  type CrystalMazeState,
  type Direction,
  createCrystalMazeState,
  initOrbsForWord,
  getCurrentSentence,
  getCurrentWord,
  getNextLetter,
  isOrbNext,
  isWordComplete,
  isHeroAtGate,
  advanceFromGate,
  startArranging,
  addLetterToArrangement,
  removeLastLetter,
  checkArrangement,
  arrangementCorrect,
  canMove,
  moveHero,
  getCollidingOrb,
  collectOrb,
  wrongOrbPenalty,
  getCollidingGoblin,
  defeatGoblin,
  tickStunTimer,
  tickInvincibleTimer,
  tickPowerUpTimer,
  updateGoblins,
  nextSentence,
  getGameResults,
  markWordComplete,
  isWordDone,
} from "./systems";

const STEP_MS = 33;
const GOBLIN_TICK_MS = 500;
const MAX_TILE = 52;
const MIN_TILE = 30;
const TOP_MARGIN = 120;

export function createCrystalMazeScene(
  context: CartridgeGameConfigContext,
): typeof Phaser.Scene {
  return class CrystalMazeScene extends Phaser.Scene {
    private state!: CrystalMazeState;
    private ts = 28;
    private ox = 0;
    private oy = 0;

    private wallSprites: Phaser.GameObjects.Image[] = [];
    private floorSprites: Phaser.GameObjects.Image[] = [];
    private gateSprite?: Phaser.GameObjects.Image;
    private hero?: Phaser.GameObjects.Sprite;
    private orbSprites: Map<number, Phaser.GameObjects.Sprite> = new Map();
    private orbTexts: Map<number, Phaser.GameObjects.Text> = new Map();
    private goblinSprites: Map<number, Phaser.GameObjects.Sprite> = new Map();
    private hitFx?: Phaser.GameObjects.Sprite;

    private thaiText?: Phaser.GameObjects.Text;
    private wordText?: Phaser.GameObjects.Text;
    private livesText?: Phaser.GameObjects.Text;
    private scoreText?: Phaser.GameObjects.Text;
    private pwText?: Phaser.GameObjects.Text;
    private gateText?: Phaser.GameObjects.Text;
    private debugText?: Phaser.GameObjects.Text;
    private creditsText?: Phaser.GameObjects.Text;

    private lvlBtns: Phaser.GameObjects.Text[] = [];

    private hx = 0;
    private hy = 0;
    private moving = false;
    private tx = 0;
    private ty = 0;
    private gobTick = 0;
    private fc = 0;
    private keys = new Set<string>();
    private loopId = 0 as unknown as ReturnType<typeof setInterval>;

    constructor() { super("CrystalMazeScene"); }

    // === Preload ===========================================================

    preload(): void {
      this.loadSprite("hero", "player.hero-1");
      this.loadSprite("goblin", "goblin.scout");
      this.loadSprite("orb", "orb.crystal-blue");
      this.loadSprite("hit", "feedback.hit");

      this.load.image("wall", context.assets.resolve("maze.wall-cavern").url);
      this.load.image("floor", context.assets.resolve("maze.floor-cavern").url);
      this.load.image("gate", context.assets.resolve("maze.gate").url);

      this.load.audio("sfx-pickup", context.assets.resolve("audio.orb-pickup").url);
      this.load.audio("sfx-wrong", context.assets.resolve("audio.wrong-orb").url);
      this.load.audio("sfx-pwup", context.assets.resolve("audio.power-up").url);
      this.load.audio("sfx-gdef", context.assets.resolve("audio.goblin-defeat").url);
      this.load.audio("sfx-comp", context.assets.resolve("audio.sentence-complete").url);
      this.load.audio("sfx-conf", context.assets.resolve("audio.ui-confirm").url);
    }

    // === Create ============================================================

    create(): void {
      this.cameras.main.setBackgroundColor(context.edition.colors.background);
      this.state = createCrystalMazeState(context.input, context.seed);
      this.state = initOrbsForWord(this.state, context.input, context.seed);

      this.calcLayout();
      this.setupAnims();
      this.buildMaze();
      this.buildOrbs();
      this.buildGobs();
      this.buildHero();
      this.buildHit();
      this.buildUI();
      this.buildLevelMenu();
      this.setupInput();

      this.scale.on("resize", this.resize.bind(this));
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        clearInterval(this.loopId);
      });

      this.loopId = setInterval(() => {
        try { this.tick(STEP_MS); } catch (e) {
          (window as unknown as Record<string, unknown>).__cmErr = String(e);
        }
      }, STEP_MS);

      context.diagnostic({
        code: "GAME_READY",
        message: `Maze ${this.state.cols}x${this.state.rows} t=${this.ts} walls=${this.wallSprites.length}`,
      });
    }

    // === Tick ==============================================================

    private tick(dms: number): void {
      (window as unknown as Record<string, unknown>).__cmTick = this.fc;
      this.fc += 1;
      if (this.state.completed) return;

      const dt = dms / 1000;

      if (this.state.arranging) return; // No game loop during arrangement

      if (this.state.stunned) {
        this.state = tickStunTimer(this.state, dt);
        this.state = tickInvincibleTimer(this.state, dt);
        return;
      }

      // Tick invincible timer (when not stunned)
      if (this.state.invincible) {
        this.state = tickInvincibleTimer(this.state, dt);
      }

      if (this.state.goblinHuntActive) {
        this.state = tickPowerUpTimer(this.state, dt);
        this.pwText?.setText(`Goblin Hunt! ${Math.ceil(this.state.goblinHuntTimer)}s`);
        if (!this.state.goblinHuntActive) {
          this.sound.play("sfx-conf", { volume: 0.3 });
          this.pwText?.setVisible(false);
          this.nextSen();
        }
      }

      // Keyboard
      if (!this.moving && !this.state.stunned) {
        if (this.keys.has("w") || this.keys.has("arrowup")) this.startMove("up");
        else if (this.keys.has("s") || this.keys.has("arrowdown")) this.startMove("down");
        else if (this.keys.has("a") || this.keys.has("arrowleft")) this.startMove("left");
        else if (this.keys.has("d") || this.keys.has("arrowright")) this.startMove("right");
      }

      // Lerp hero
      if (this.moving) {
        const spd = 220 * dt;
        const dx = this.tx - this.hx, dy = this.ty - this.hy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= spd) { this.hx = this.tx; this.hy = this.ty; this.moving = false; this.hero?.setPosition(this.hx, this.hy); this.colOrb(); this.checkGate(); }
        else { const r = spd / dist; this.hx += dx * r; this.hy += dy * r; this.hero?.setPosition(this.hx, this.hy); }
      }

      // Check gate even when not moving
      if (!this.moving && this.state.gateOpen) {
        this.checkGate();
      }

      // Goblins
      this.gobTick += dms;
      if (this.gobTick >= GOBLIN_TICK_MS) { this.gobTick = 0; this.state = updateGoblins(this.state); this.syncGobs(); this.colGob(); }

      // Update orb glow
      this.updateOrbs();

      // Debug text every 30 frames
      if (this.fc % 30 === 0) {
        const w = this.scale.width as number;
        this.livesText?.setText("❤".repeat(this.state.lives) + "🖤".repeat(this.state.maxLives - this.state.lives));
        this.scoreText?.setText(`Score: ${this.state.score}`);
        this.debugText?.setText(
          `F:${this.fc} hp:(${this.state.heroPos.col},${this.state.heroPos.row}) gob:${this.state.goblins.filter(g=>g.mode!=="defeated").length}`,
        );
        this.debugText?.setPosition(w / 2, (this.scale.height as number) - 18);
      }

      // Invincible blink
      if (this.state.invincible) {
        this.hero?.setAlpha(Math.sin(this.fc * 0.5) > 0 ? 1 : 0.3);
      } else {
        this.hero?.setAlpha(1);
      }

      if (this.state.completed && !this.state.sentenceComplete) this.endGame();
    }

    // === Movement ==========================================================

    private startMove(d: Direction): void {
      if (this.moving || this.state.completed || this.state.stunned) return;
      if (!canMove(this.state, d)) return;
      const prev = { ...this.state.heroPos };
      this.state = moveHero(this.state, d);
      if (this.state.heroPos.col === prev.col && this.state.heroPos.row === prev.row) return;
      this.tx = this.ox + this.state.heroPos.col * this.ts + this.ts / 2;
      this.ty = this.oy + this.state.heroPos.row * this.ts + this.ts / 2;
      this.moving = true;
    }

    // === Collisions ========================================================

    private colOrb(): void {
      const oi = getCollidingOrb(this.state);
      if (oi === -1) return;

      // Any orb can be collected — no order restriction
      this.state = collectOrb(this.state, oi);
      this.sound.play("sfx-pickup", { volume: 0.4 });
      this.orbSprites.get(oi)?.destroy();
      this.orbSprites.delete(oi);
      this.orbTexts.get(oi)?.destroy();
      this.orbTexts.delete(oi);
      this.updateWordUI();

      // Check if all orbs collected → open gate
      if (this.state.orbs.every((o) => o.collected) && !this.state.gateOpen) {
        this.state = { ...this.state, gateOpen: true, orbs: [] };
        this.gateText?.setText("GO TO THE GATE!").setVisible(true);
        this.syncGobs();
      }

      this.livesText?.setText("❤".repeat(this.state.lives) + "🖤".repeat(this.state.maxLives - this.state.lives));
    }

    private colGob(): void {
      const gi = getCollidingGoblin(this.state);
      if (gi === -1) return;
      if (this.state.goblinHuntActive) {
        this.state = defeatGoblin(this.state, gi);
        this.sound.play("sfx-gdef", { volume: 0.45 });
        this.showHit();
        this.goblinSprites.get(gi)?.destroy();
        this.goblinSprites.delete(gi);
      } else {
        this.state = wrongOrbPenalty(this.state);
        this.sound.play("sfx-wrong", { volume: 0.4 });
        this.showHit();
        this.livesText?.setText("❤".repeat(this.state.lives) + "🖤".repeat(this.state.maxLives - this.state.lives));
        if (this.state.completed) this.endGame();
      }
    }

    private checkGate(): void {
      if (!this.state.gateOpen) return;
      if (this.state.arranging) return;
      if (!isHeroAtGate(this.state)) return;

      // Start arrangement puzzle
      this.state = startArranging(this.state);
      this.gateText?.setVisible(false);
      this.showArrangementUI();
    }

    private nextSen(): void {
      this.state = nextSentence(this.state, context.input);
      if (this.state.completed) { this.endGame(); return; }
      this.state = initOrbsForWord(this.state, context.input);
      this.state = { ...this.state, collectedLetters: [] };

      // Regenerate maze for new sentence
      this.calcLayout();
      this.wallSprites.forEach((s) => s.destroy());
      this.floorSprites.forEach((s) => s.destroy());
      this.gateSprite?.destroy();
      this.wallSprites = [];
      this.floorSprites = [];
      this.clearOrbs();
      this.goblinSprites.forEach((s) => s.destroy());
      this.goblinSprites.clear();

      this.buildMaze();
      this.buildOrbs();
      this.buildGobs();
      this.buildLevelMenu();

      this.hx = this.ox + this.state.heroPos.col * this.ts + this.ts / 2;
      this.hy = this.oy + this.state.heroPos.row * this.ts + this.ts / 2;
      this.tx = this.hx; this.ty = this.hy;
      this.hero?.setPosition(this.hx, this.hy);
      this.moving = false;

      this.updateWordUI();
      this.scoreText?.setText(`Score: ${this.state.score}`);
      this.livesText?.setText("❤".repeat(this.state.lives) + "🖤".repeat(this.state.maxLives - this.state.lives));
    }

    private updateWordUI(): void {
      if (!this.wordText) return;
      const word = getCurrentWord(this.state, context.input);
      if (word.length === 0) { this.wordText.setText(""); return; }

      const collected = this.state.collectedLetters.length;
      const total = this.state.orbs.length + collected;
      this.wordText.setText(`${word}  (${collected}/${total} letters)`);
    }

    private endGame(): void {
      const r = getGameResults(this.state);
      context.complete(r);
      const bg = "#" + context.edition.colors.panel.toString(16).padStart(6, "0");
      const t = this.add.text(0, 0, this.state.won ? `Victory! ${r.score}` : `Defeat ${r.score}`, {
        fontFamily: "Arial", fontSize: "24px", color: context.edition.colors.text,
        backgroundColor: bg, padding: { x: 20, y: 14 },
      }).setOrigin(0.5).setDepth(100);
      t.setPosition(this.scale.width as number / 2, this.scale.height as number / 2);
    }

    // === Build =============================================================

    private calcLayout(): void {
      const w = this.scale.width as number, h = this.scale.height as number;
      const compact = h > w;
      const topM = compact ? TOP_MARGIN : 70;
      const maxTW = Math.floor(w / this.state.cols);
      const maxTH = Math.floor((h - topM) / this.state.rows);
      this.ts = Math.max(MIN_TILE, Math.min(MAX_TILE, maxTW, maxTH));
      const mw = this.state.cols * this.ts, mh = this.state.rows * this.ts;
      this.ox = Math.floor((w - mw) / 2);
      this.oy = Math.floor(topM + (h - topM - mh) / 2);
    }

    private buildMaze(): void {
      const ox = this.ox, oy = this.oy, ts = this.ts;
      const mxw = this.state.cols * ts, mxh = this.state.rows * ts;

      // Dark backdrop behind maze for contrast
      this.add.rectangle(ox + mxw / 2, oy + mxh / 2, mxw + 4, mxh + 4, 0x000000, 0.4).setDepth(-1);

      for (let r = 0; r < this.state.rows; r++) {
        for (let c = 0; c < this.state.cols; c++) {
          const cx = ox + c * ts + ts / 2, cy = oy + r * ts + ts / 2;
          const cell = this.state.maze[r]![c]!;
          if (cell === 1) {
            // Wall — place wall sprite on top of a dark floor base
            this.add.image(cx, cy, "floor").setDepth(0).setOrigin(0.5).setDisplaySize(ts, ts).setTint(0x444444);
            const w = this.add.image(cx, cy, "wall").setDepth(0).setOrigin(0.5).setDisplaySize(ts, ts);
            this.wallSprites.push(w);
          } else if (cell === 2) {
            // Gate
            this.add.image(cx, cy, "floor").setDepth(0).setOrigin(0.5).setDisplaySize(ts, ts);
            this.gateSprite = this.add.image(cx, cy, "gate").setDepth(2).setOrigin(0.5).setDisplaySize(ts * 0.8, ts * 1.2);
          } else {
            // Walkable floor
            const f = this.add.image(cx, cy, "floor").setDepth(0).setOrigin(0.5).setDisplaySize(ts, ts);
            this.floorSprites.push(f);
          }
        }
      }
    }

    private buildOrbs(): void {
      const word = getCurrentWord(this.state, context.input);
      for (let i = 0; i < this.state.orbs.length; i++) {
        const o = this.state.orbs[i]!;
        if (o.collected) continue;
        const px = this.ox + o.pos.col * this.ts + this.ts / 2;
        const py = this.oy + o.pos.row * this.ts + this.ts / 2;
        const sz = this.ts * 0.55;

        const s = this.add.sprite(px, py, "orb").setDepth(3).setOrigin(0.5).setDisplaySize(sz, sz);
        s.play("orb-spin");
        this.orbSprites.set(i, s);

        const t = this.add.text(px, py, o.letter, {
          fontFamily: "Arial", fontSize: "10px", color: "#ffffff",
          align: "center", stroke: "#000000", strokeThickness: 2,
        }).setOrigin(0.5).setDepth(4);
        this.orbTexts.set(i, t);
      }
    }

    private clearOrbs(): void {
      this.orbSprites.forEach((s) => s.destroy());
      this.orbSprites.clear();
      this.orbTexts.forEach((t) => t.destroy());
      this.orbTexts.clear();
    }

    private updateOrbs(): void {
      this.orbSprites.forEach((s, i) => {
        const o = this.state.orbs[i];
        if (!o || o.collected) { s.destroy(); this.orbSprites.delete(i); this.orbTexts.get(i)?.destroy(); this.orbTexts.delete(i); return; }
        const px = this.ox + o.pos.col * this.ts + this.ts / 2;
        const py = this.oy + o.pos.row * this.ts + this.ts / 2;
        s.setPosition(px, py);

        const t = this.orbTexts.get(i);
        if (t) t.setPosition(px, py);
      });
    }

    private buildGobs(): void {
      for (let i = 0; i < this.state.goblins.length; i++) {
        const g = this.state.goblins[i]!;
        if (g.mode === "defeated") continue;
        const px = this.ox + g.pos.col * this.ts + this.ts / 2;
        const py = this.oy + g.pos.row * this.ts + this.ts / 2;
        const s = this.add.sprite(px, py, "goblin").setDepth(4).setOrigin(0.5).setDisplaySize(this.ts * 0.75, this.ts * 0.75);
        s.play("goblin-walk");
        this.goblinSprites.set(i, s);
      }
    }

    private syncGobs(): void {
      this.goblinSprites.forEach((s, i) => {
        const g = this.state.goblins[i];
        if (!g || g.mode === "defeated") { s.destroy(); this.goblinSprites.delete(i); return; }
        s.setPosition(this.ox + g.pos.col * this.ts + this.ts / 2, this.oy + g.pos.row * this.ts + this.ts / 2);
        s.setDisplaySize(this.ts * 0.75, this.ts * 0.75);
        const anim = g.mode === "flee" ? "goblin-flee" : "goblin-walk";
        if (s.anims && s.anims.getName() !== anim) s.play(anim);
      });
    }

    private buildHero(): void {
      this.hx = this.ox + this.state.heroPos.col * this.ts + this.ts / 2;
      this.hy = this.oy + this.state.heroPos.row * this.ts + this.ts / 2;
      this.tx = this.hx; this.ty = this.hy;
      this.hero = this.add.sprite(this.hx, this.hy, "hero").setDepth(5).setOrigin(0.5).setDisplaySize(this.ts * 0.7, this.ts * 0.7);
      this.hero.play("hero-walk-down");
    }

    private buildHit(): void {
      this.hitFx = this.add.sprite(0, 0, "hit").setVisible(false).setDepth(10);
    }

    private showHit(): void {
      if (!this.hitFx) return;
      this.hitFx.setPosition(this.hx, this.hy).setVisible(true).setDisplaySize(this.ts, this.ts).play("hit-effect");
      setTimeout(() => this.hitFx?.setVisible(false), 400);
    }

    private refreshUI(): void {
      if (this.wordText) this.updateWordUI();
      this.updateLvlMenu();
    }

    private buildLevelMenu(): void {
      this.lvlBtns.forEach((b) => b.destroy());
      this.lvlBtns = [];

      const w = this.scale.width as number;
      // Build flat list of all words across all sentences
      const allWords: { text: string; si: number; wi: number }[] = [];
      for (let si = 0; si < context.input.length; si++) {
        const words = context.input[si]!.term.split(" ");
        for (let wi = 0; wi < words.length; wi++) {
          allWords.push({ text: words[wi]!, si, wi });
        }
      }

      const count = allWords.length;
      const btnW = Math.min(56, Math.floor((w - 16) / count));
      const startX = (w - count * (btnW + 4)) / 2;

      for (let i = 0; i < count; i++) {
        const wd = allWords[i]!;
        const x = startX + i * (btnW + 4) + btnW / 2;
        const done = isWordDone(this.state, wd.si, wd.wi);
        const current = wd.si === this.state.sentenceIndex && wd.wi === this.state.wordProgress;
        const txt = done ? `✓${wd.text.slice(0, 3)}` : (current ? `[${wd.text.slice(0, 3)}]` : wd.text.slice(0, 3));
        const color = done ? "#88ff88" : (current ? "#ffdd44" : "#666666");
        const bg = current ? "#333333" : "#111111";

        const btn = this.add.text(x, 72, txt, {
          fontFamily: "Arial", fontSize: "10px", color,
          backgroundColor: bg, padding: { x: 3, y: 1 },
        }).setOrigin(0.5, 0).setDepth(25);

        if (done && !current) {
          btn.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
            this.jumpToWord(wd.si, wd.wi);
          });
        }

        this.lvlBtns.push(btn);
      }
    }

    private updateLvlMenu(): void {
      this.lvlBtns.forEach((btn, i) => {
        const allWords = this.getAllWords();
        if (i >= allWords.length) return;
        const wd = allWords[i]!;
        const done = isWordDone(this.state, wd.si, wd.wi);
        const current = wd.si === this.state.sentenceIndex && wd.wi === this.state.wordProgress;
        const txt = done ? `✓${wd.text.slice(0, 3)}` : (current ? `[${wd.text.slice(0, 3)}]` : wd.text.slice(0, 3));
        const color = done ? "#88ff88" : (current ? "#ffdd44" : "#666666");
        btn.setText(txt);
        btn.setStyle({ color, fontSize: "10px", backgroundColor: current ? "#333333" : "#111111" } as Phaser.Types.GameObjects.Text.TextStyle);
        if (done && !current) {
          btn.removeAllListeners();
          btn.setInteractive({ useHandCursor: true }).on("pointerdown", () => { this.jumpToWord(wd.si, wd.wi); });
        }
      });
    }

    private getAllWords(): { text: string; si: number; wi: number }[] {
      const out: { text: string; si: number; wi: number }[] = [];
      for (let si = 0; si < context.input.length; si++) {
        const words = context.input[si]!.term.split(" ");
        for (let wi = 0; wi < words.length; wi++) {
          out.push({ text: words[wi]!, si, wi });
        }
      }
      return out;
    }

    private jumpToWord(si: number, wi: number): void {
      this.state = createCrystalMazeState(context.input, (context.seed ?? 0) + si * 101 + wi * 7);
      this.state = { ...this.state, sentenceIndex: si, wordProgress: wi, letterProgress: 0, collectedLetters: [] };
      this.state = initOrbsForWord(this.state, context.input);

      this.calcLayout();
      this.wallSprites.forEach((s) => s.destroy());
      this.floorSprites.forEach((s) => s.destroy());
      this.gateSprite?.destroy();
      this.wallSprites = [];
      this.floorSprites = [];
      this.clearOrbs();
      this.goblinSprites.forEach((s) => s.destroy());
      this.goblinSprites.clear();

      this.buildMaze();
      this.buildOrbs();
      this.buildGobs();
      this.buildLevelMenu();

      this.hx = this.ox + this.state.heroPos.col * this.ts + this.ts / 2;
      this.hy = this.oy + this.state.heroPos.row * this.ts + this.ts / 2;
      this.tx = this.hx; this.ty = this.hy;
      this.hero?.setPosition(this.hx, this.hy);
      this.moving = false;

      const st = getCurrentSentence(this.state, context.input);
      this.thaiText?.setText(st.translation);
      this.updateWordUI();
    }

    // === Arrangement UI ====================================================

    private arrBtns: Phaser.GameObjects.Text[] = [];
    private arrWordText?: Phaser.GameObjects.Text;
    private arrSubmitBtn?: Phaser.GameObjects.Text;
    private arrClearBtn?: Phaser.GameObjects.Text;
    private arrFeedback?: Phaser.GameObjects.Text;
    private arrOverlay?: Phaser.GameObjects.Rectangle;
    private arrTitle?: Phaser.GameObjects.Text;

    private showArrangementUI(): void {
      const w = this.scale.width as number;
      const h = this.scale.height as number;

      // Dark overlay
      this.arrOverlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setDepth(50);

      // Title
      const word = getCurrentWord(this.state, context.input);
      this.arrTitle = this.add.text(w / 2, h * 0.15, `Spell the word: ${"_ ".repeat(word.length)}`, {
        fontFamily: "Arial", fontSize: "20px", color: "#ffffff", align: "center",
      }).setOrigin(0.5).setDepth(51);

      // Current arrangement display
      this.arrWordText = this.add.text(w / 2, h * 0.30, "", {
        fontFamily: "Arial", fontSize: "28px", color: "#ffdd44", fontStyle: "bold", align: "center",
      }).setOrigin(0.5).setDepth(51);

      // Letter buttons
      this.arrBtns.forEach((b) => b.destroy());
      this.arrBtns = [];
      const letters = [...this.state.collectedLetters];
      const btnSize = 36;
      const totalW = letters.length * (btnSize + 8);
      const startX = (w - totalW) / 2;
      const midY = h * 0.45;

      for (let i = 0; i < letters.length; i++) {
        const bx = startX + i * (btnSize + 8) + btnSize / 2;
        const btn = this.add.text(bx, midY, letters[i]!, {
          fontFamily: "Arial", fontSize: "18px", color: "#ffffff",
          backgroundColor: "#2255aa", padding: { x: 8, y: 4 },
        }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true });

        btn.on("pointerdown", () => {
          this.state = addLetterToArrangement(this.state, letters[i]!);
          this.arrWordText?.setText(this.state.arrangedWord);
        });

        this.arrBtns.push(btn);
      }

      // Clear button
      this.arrClearBtn = this.add.text(w / 2 - 50, h * 0.58, "Clear", {
        fontFamily: "Arial", fontSize: "16px", color: "#ff8888",
        backgroundColor: "#661111", padding: { x: 12, y: 4 },
      }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true });

      this.arrClearBtn.on("pointerdown", () => {
        this.state = { ...this.state, arrangedWord: "" };
        this.arrWordText?.setText("");
      });

      // Submit button
      this.arrSubmitBtn = this.add.text(w / 2 + 50, h * 0.58, "Submit", {
        fontFamily: "Arial", fontSize: "16px", color: "#88ff88",
        backgroundColor: "#116611", padding: { x: 12, y: 4 },
      }).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true });

      this.arrSubmitBtn.on("pointerdown", () => {
        if (this.state.arrangedWord.length !== word.length) {
          this.showArrFeedback("Spell all letters!", "#ff8888");
          return;
        }
        if (checkArrangement(this.state, context.input)) {
          this.showArrFeedback("Correct!", "#88ff88");
          this.sound.play("sfx-conf", { volume: 0.4 });
          this.time.delayedCall(800, () => {
            this.advanceAfterArrangement();
          });
        } else {
          this.showArrFeedback("Wrong! Try again.", "#ff4444");
          this.sound.play("sfx-wrong", { volume: 0.4 });
          this.state = wrongOrbPenalty(this.state);
          this.livesText?.setText("❤".repeat(this.state.lives) + "🖤".repeat(this.state.maxLives - this.state.lives));
          if (this.state.completed) { this.endGame(); return; }
          this.state = { ...this.state, arrangedWord: "" };
          this.arrWordText?.setText("");
        }
      });

      // Feedback text
      this.arrFeedback = this.add.text(w / 2, h * 0.66, "", {
        fontFamily: "Arial", fontSize: "16px", color: "#ffffff", align: "center",
      }).setOrigin(0.5).setDepth(51);
    }

    private showArrFeedback(msg: string, color: string): void {
      if (this.arrFeedback) {
        this.arrFeedback.setText(msg).setColor(color);
        this.time.delayedCall(1500, () => this.arrFeedback?.setText(""));
      }
    }

    private advanceAfterArrangement(): void {
      // Cleanup ALL arrangement UI
      this.arrOverlay?.destroy();
      this.arrOverlay = undefined;
      this.arrTitle?.destroy();
      this.arrTitle = undefined;
      this.arrBtns.forEach((b) => b.destroy());
      this.arrBtns = [];
      this.arrWordText?.destroy();
      this.arrWordText = undefined;
      this.arrSubmitBtn?.destroy();
      this.arrSubmitBtn = undefined;
      this.arrClearBtn?.destroy();
      this.arrClearBtn = undefined;
      this.arrFeedback?.destroy();
      this.arrFeedback = undefined;

      this.state = arrangementCorrect(this.state, context.input);

      if (this.state.sentenceComplete) {
        this.sound.play("sfx-pwup", { volume: 0.5 });
        this.pwText?.setVisible(true);
        this.syncGobs();
        return;
      }

      // Rebuild for next word
      this.calcLayout();
      this.wallSprites.forEach((s) => s.destroy());
      this.floorSprites.forEach((s) => s.destroy());
      this.gateSprite?.destroy();
      this.wallSprites = [];
      this.floorSprites = [];
      this.clearOrbs();
      this.goblinSprites.forEach((s) => s.destroy());
      this.goblinSprites.clear();

      this.buildMaze();
      this.buildOrbs();
      this.buildGobs();
      this.buildLevelMenu();

      this.hx = this.ox + this.state.heroPos.col * this.ts + this.ts / 2;
      this.hy = this.oy + this.state.heroPos.row * this.ts + this.ts / 2;
      this.tx = this.hx; this.ty = this.hy;
      this.hero?.setPosition(this.hx, this.hy);
      this.moving = false;

      const st = getCurrentSentence(this.state, context.input);
      this.thaiText?.setText(st.translation);
      this.updateWordUI();
      this.scoreText?.setText(`Score: ${this.state.score}`);
      this.livesText?.setText("❤".repeat(this.state.lives) + "🖤".repeat(this.state.maxLives - this.state.lives));
    }

    private buildUI(): void {
      const s = (sz: string) => ({ fontFamily: "Arial", fontSize: sz, color: context.edition.colors.text, align: "center" }) as Phaser.Types.GameObjects.Text.TextStyle;
      const w = this.scale.width as number, h = this.scale.height as number;
      const st = getCurrentSentence(this.state, context.input);

      // Thai sentence — top center, large and readable
      this.thaiText = this.add.text(w / 2, 30, st.translation, {
        ...s("17px"), fontStyle: "bold", wordWrap: { width: w - 40 },
      }).setOrigin(0.5, 0).setDepth(20);

      // "Thai:" label
      this.add.text(w / 2, 6, "คำแปลภาษาไทย", { ...s("11px"), color: "#aaaaaa" }).setOrigin(0.5, 0).setDepth(20);

      // Target word — large, center, shows full word with collected letters dimmed
      this.wordText = this.add.text(w / 2, 48, "", {
        ...s("22px"), fontStyle: "bold", color: "#ffffff",
        stroke: "#000000", strokeThickness: 3,
      }).setOrigin(0.5, 0).setDepth(20);

      // Lives — top left
      this.livesText = this.add.text(10, 6, "❤❤❤", s("16px")).setOrigin(0, 0).setDepth(20);

      // Score — top right
      this.scoreText = this.add.text(w - 10, 6, "Score: 0", s("16px")).setOrigin(1, 0).setDepth(20);

      // Power-up banner
      this.pwText = this.add.text(w / 2, 90, "", { ...s("18px"), color: "#ffcc00", fontStyle: "bold" }).setOrigin(0.5, 0.5).setDepth(20).setVisible(false);

      // Gate message
      this.gateText = this.add.text(w / 2, 90, "", { ...s("18px"), color: "#88ff88", fontStyle: "bold" }).setOrigin(0.5, 0.5).setDepth(20).setVisible(false);

      // Credits — bottom
      this.creditsText = this.add.text(w / 2, h - 6, "Pixel art by ElvGames  |  Sound by Universal Sound Effects", s("9px")).setOrigin(0.5, 1).setDepth(20);

      // Debug text
      this.debugText = this.add.text(w / 2, h - 20, "", { ...s("9px"), color: "#0f0" }).setOrigin(0.5, 1).setDepth(99);

      this.updateWordUI();
    }

    // === Input =============================================================

    private setupInput(): void {
      const kd = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        this.keys.add(key);
        if ("wasdarrowuparrowdownarrowleftarrowright".includes(key)) e.preventDefault();
      };
      const ku = (e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); };
      document.addEventListener("keydown", kd);
      document.addEventListener("keyup", ku);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        document.removeEventListener("keydown", kd);
        document.removeEventListener("keyup", ku);
      });

      let sx = 0, sy = 0;
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => { sx = p.x; sy = p.y; });
      this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
        const dx = p.x - sx, dy = p.y - sy;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        const d: Direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
        if (!this.moving && canMove(this.state, d)) this.startMove(d);
      });
    }

    // === Resize ============================================================

    private resize(): void {
      this.calcLayout();
      this.wallSprites.forEach((s) => s.destroy());
      this.floorSprites.forEach((s) => s.destroy());
      this.gateSprite?.destroy();
      this.wallSprites = [];
      this.floorSprites = [];
      this.buildMaze();
      this.reposAll();
      const w = this.scale.width as number, h = this.scale.height as number;
      this.thaiText?.setPosition(w / 2, 30);
      this.livesText?.setPosition(10, 6);
      this.scoreText?.setPosition(w - 10, 6);
      this.creditsText?.setPosition(w / 2, h - 6);
      this.debugText?.setPosition(w / 2, h - 20);
      this.pwText?.setPosition(w / 2, 90);
      this.gateText?.setPosition(w / 2, 90);
    }

    private reposAll(): void {
      this.hx = this.ox + this.state.heroPos.col * this.ts + this.ts / 2;
      this.hy = this.oy + this.state.heroPos.row * this.ts + this.ts / 2;
      this.tx = this.hx; this.ty = this.hy;
      this.hero?.setPosition(this.hx, this.hy);
      this.orbSprites.forEach((s, i) => {
        const o = this.state.orbs[i];
        if (o) {
          const px = this.ox + o.pos.col * this.ts + this.ts / 2;
          const py = this.oy + o.pos.row * this.ts + this.ts / 2;
          s.setPosition(px, py).setDisplaySize(this.ts * 0.55, this.ts * 0.55);
        }
      });
      this.orbTexts.forEach((t, i) => {
        const o = this.state.orbs[i];
        if (o) {
          const px = this.ox + o.pos.col * this.ts + this.ts / 2;
          const py = this.oy + o.pos.row * this.ts + this.ts / 2;
          t.setPosition(px, py);
        }
      });
      this.goblinSprites.forEach((s, i) => {
        const g = this.state.goblins[i];
        if (g) s.setPosition(this.ox + g.pos.col * this.ts + this.ts / 2, this.oy + g.pos.row * this.ts + this.ts / 2);
      });
    }

    // === Animations ========================================================

    private setupAnims(): void {
      for (const d of ["down", "up", "left", "right"]) this.anim("hero-walk-" + d, "hero", "player.hero-1");
      this.anim("goblin-walk", "goblin", "goblin.scout");
      this.anim("goblin-flee", "goblin", "goblin.scout");
      this.anim("orb-spin", "orb", "orb.crystal-blue");
      this.anim("hit-effect", "hit", "feedback.hit", 0);
    }

    // === Helpers ===========================================================

    private loadSprite(key: string, id: CompetitionAssetId): void {
      const a = context.assets.resolve(id);
      if (a.kind !== "spritesheet" || !a.frame) throw new Error(`${id} not spritesheet`);
      this.load.spritesheet(key, a.url, { frameWidth: a.frame.width, frameHeight: a.frame.height });
    }

    private anim(key: string, tex: string, id: CompetitionAssetId, repeat = -1): void {
      if (this.anims.exists(key)) return;
      const a = context.assets.resolve(id);
      if (!a.frame) throw new Error(`${id} missing frames`);
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(tex, { start: 0, end: a.frame.count - 1 }), frameRate: a.frame.frameRate, repeat });
    }
  };
}
