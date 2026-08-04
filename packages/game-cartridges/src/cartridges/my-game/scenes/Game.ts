import Phaser from "phaser";
import { getRuntime, resetGame } from "../systems/runtime";
import { MineGrid, type LetterPlacement } from "../systems/MineGrid";
import { seededRng } from "../systems/LetterBag";
import { GameState, MAX_HEALTH, WIN_GOAL } from "../systems/GameState";
import {
  LaserScheduler,
  type LaserEvent,
  isVisible,
  sweepOffset,
  hitsPoint,
  isGuiding,
} from "../systems/LaserSystem";
import {
  CAVE_BG,
  DUG_LIGHT,
  EASY_LETTER_COLOR,
  FONT,
  HARD_LETTER_COLOR,
  LANTERN,
  LANTERN_GLOW,
  MINE_ROCK,
  WOOD,
  WOOD_DARK,
  letterVisual,
} from "../data/visual";
import type { DeckWord } from "../data/words";
import { ChibiSkeletonMiner, type Facing } from "../objects/ChibiSkeletonMiner";
import { Gem } from "../objects/Gem";
import { spawnDigParticles, spawnGemPop } from "../objects/DigParticles";

const COLS = 9;
const ROWS = 11;
const PLAYER_SPEED = 8.5; // cells per second
const BEAM_THICKNESS = 0.045; // normalized
const FIRST_LASER_AT = 1600; // ms before the first guide line appears

/** Main gameplay scene: mine letters, spell words, dodge sweeping lasers. */
export class Game extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  private state!: GameState;
  private grid!: MineGrid;
  private t = 0;
  private lasers!: LaserScheduler;
  private playerX = 2;
  private playerY = 5;
  private facing: Facing = "right";

  // Rendering
  private tileGraphics!: Phaser.GameObjects.Graphics;
  private caveGraphics!: Phaser.GameObjects.Graphics;
  private propsGraphics!: Phaser.GameObjects.Graphics;
  private gemTexts: Phaser.GameObjects.Container[] = [];
  private player!: ChibiSkeletonMiner;
  private playerGlow!: Phaser.GameObjects.Arc;
  private targetMarker!: Phaser.GameObjects.Rectangle;
  private laserGraphics!: Phaser.GameObjects.Graphics;
  private boardX = 0;
  private boardY = 0;
  private cell = 1;
  private boardW = 0;
  private boardH = 0;
  private panelW = 0;
  private goalsH = 0;

  // HUD
  private hpText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private goalCards: Phaser.GameObjects.Container[] = [];
  private boardRotated = false;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private goalKeys: Phaser.Input.Keyboard.Key[] = [];
  private dragStart: { x: number; y: number } | null = null;
  private dragVector = { x: 0, y: 0 };

  create(): void {
    const runtime = getRuntime();
    this.state = resetGame();
    this.input.removeAllListeners();
    this.cameras.main.setBackgroundColor(CAVE_BG);

    // Build grid and scatter every target letter across the floor.
    this.grid = new MineGrid(COLS, ROWS);
    const rng = seededRng(`${runtime.context.seed ?? 42}:${Date.now()}`);
    const placements: LetterPlacement[] = [];
    for (const w of runtime.deck) {
      for (const letter of w.letters) placements.push({ letter, difficulty: w.difficulty });
    }
    this.grid.scatter(placements, rng);

    this.lasers = new LaserScheduler(rng, FIRST_LASER_AT);

    this.state.startFirstRound();

    this.layout();
    this.buildBoard();
    this.buildHUD();
    this.rebuildGoalsPanel();
    this.setupInput();

    this.events.on("shutdown", this.cleanup, this);
    this.events.on("destroy", this.cleanup, this);
  }

  private layout(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const hudH = Math.max(60, H * 0.12);
    const wide = W > 800;
    this.panelW = wide ? Phaser.Math.Clamp(Math.round(W * 0.24), 300, 440) : 0;
    this.goalsH = wide ? 0 : Math.round(H * 0.13);
    const left = 8;
    const top = hudH + (wide ? 0 : this.goalsH) + 8;
    const right = W - (wide ? this.panelW + 8 : 8);
    const bottom = H - 8;
    const availW = right - left;
    const availH = bottom - top;
    this.cell = Math.max(16, Math.min(availW / COLS, availH / ROWS));
    this.boardW = this.cell * COLS;
    this.boardH = this.cell * ROWS;
    this.boardX = left + (availW - this.boardW) / 2;
    this.boardY = top + (availH - this.boardH) / 2;
  }

  private buildBoard(): void {
    // Dark rocky cave backdrop sits behind everything.
    this.caveGraphics = this.add.graphics();
    this.caveGraphics.setDepth(-1);
    this.caveGraphics.setScrollFactor(0);
    this.drawCave();

    this.tileGraphics = this.add.graphics();
    this.tileGraphics.setDepth(0);
    this.tileGraphics.setScrollFactor(0);

    this.redrawBoard();

    // Wood beams + lanterns above tiles but below gems.
    this.propsGraphics = this.add.graphics();
    this.propsGraphics.setDepth(1);
    this.propsGraphics.setScrollFactor(0);
    this.drawMineProps();

    this.laserGraphics = this.add.graphics();
    this.laserGraphics.setDepth(3);
    this.laserGraphics.setScrollFactor(0);

    // Terraria dig-outline: a soft radial glow behind the miner.
    this.playerGlow = this.add.circle(0, 0, this.cell * 0.7, 0xffffff, 0.12).setScrollFactor(0).setDepth(1);

    // Chibi Skeleton Miner
    const px = this.boardX + (this.playerX + 0.5) * this.cell;
    const py = this.boardY + (this.playerY + 0.5) * this.cell;
    this.player = new ChibiSkeletonMiner(this, px, py - this.cell * 0.15, this.cell * 0.8);
    this.player.setDepth(4);
    this.playerGlow.setPosition(px, py);

    // Highlight the block the miner stands on (that is the block Space digs).
    this.targetMarker = this.add
      .rectangle(0, 0, this.cell, this.cell, 0xffffff, 0.14)
      .setStrokeStyle(Math.max(2, this.cell * 0.08), 0xffffff, 0.85)
      .setDepth(1)
      .setScrollFactor(0);
  }

  /** Draws the near-black cave backdrop with stalactite hints along the top. */
  private drawCave(): void {
    const g = this.caveGraphics;
    const W = this.scale.width;
    const H = this.scale.height;
    g.fillStyle(0x0a0c12, 1);
    g.fillRect(0, 0, W, H);
    // Faint rock texture speckles.
    g.fillStyle(0xffffff, 0.02);
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137) % W;
      const sy = ((i * 61) % H) + (this.boardY > 0 ? this.boardY * 0.5 : 0);
      g.fillCircle(sx, sy, (i % 3) + 1);
    }
    // Stalactites hanging from the top edge.
    g.fillStyle(0x0d0f16, 1);
    for (let sx = -20; sx < W + 20; sx += (W / 8) + 30) {
      const w = Math.max(16, W * 0.06);
      const h = Math.max(18, H * 0.03) + ((sx * 7) % 18);
      g.fillTriangle(sx, -5, sx + w, -5, sx + w / 2, h);
    }
  }

  /** Draws wooden support beams and hanging lanterns around the mine floor. */
  private drawMineProps(): void {
    const g = this.propsGraphics;
    g.clear();
    const bx = this.boardX;
    const by = this.boardY;
    const bw = this.boardW;
    const bh = this.boardH;
    const beam = Math.max(8, this.cell * 0.42);
    // Top beam spanning the mine entrance.
    g.fillStyle(WOOD, 1);
    g.fillRect(bx - this.cell * 0.3, by - beam, bw + this.cell * 0.6, beam);
    g.fillStyle(WOOD_DARK, 1);
    g.fillRect(bx - this.cell * 0.3, by - beam, bw + this.cell * 0.6, beam * 0.22);
    // Vertical support pillars along the sides.
    for (const side of [-1, 1]) {
      const colX = side === -1 ? bx - beam * 0.6 : bx + bw - beam * 0.4;
      g.fillStyle(WOOD, 1);
      g.fillRect(colX, by - beam, beam, bh + beam);
      g.fillStyle(WOOD_DARK, 1);
      g.fillRect(colX + beam * (side === -1 ? 0.75 : 0), by - beam, beam * 0.25, bh + beam);
    }
    // Lanterns hanging from the top beam at a couple of points.
    for (const fx of [0.3, 0.7]) {
      const lx = bx + bw * fx;
      const ly = by + this.cell * 0.35;
      // Warm glow halo.
      g.fillStyle(LANTERN_GLOW, 0.22);
      g.fillCircle(lx + this.cell * 0.5, ly + this.cell * 0.5, this.cell * 0.9);
      // Lantern body.
      g.lineStyle(beam * 0.12, WOOD_DARK, 1);
      g.lineBetween(lx + this.cell * 0.5, by - beam, lx + this.cell * 0.5, ly + this.cell * 0.1);
      g.fillStyle(LANTERN, 1);
      g.fillRoundedRect(lx + this.cell * 0.2, ly + this.cell * 0.2, this.cell * 0.6, this.cell * 0.55, 3);
      g.fillStyle(LANTERN_GLOW, 1);
      g.fillRect(lx + this.cell * 0.28, ly + this.cell * 0.3, this.cell * 0.44, this.cell * 0.32);
    }
  }

  private makeGem(cell: (typeof this.grid.cells)[number], reveal: boolean): void {
    const vis = letterVisual(cell.difficulty ?? "easy");
    const gem = new Gem(
      this,
      this.boardX + cell.x * this.cell + this.cell / 2,
      this.boardY + cell.y * this.cell + this.cell / 2,
      cell.letter ?? "",
      cell.difficulty ?? "easy",
      this.cell * vis.pct * 0.9
    );
    gem.setDepth(2);
    gem.setScrollFactor(0);
    if (reveal) gem.revealLetter(this.cell * 0.35);
    this.gemTexts.push(gem.container);
  }

  private redrawBoard(): void {
    const g = this.tileGraphics;
    if (!g) return;
    g.clear();
    const gap = Math.max(1, this.cell * 0.04);
    const size = this.cell - gap;
    for (const cell of this.grid.cells) {
      const x = this.boardX + cell.x * this.cell + gap / 2;
      const y = this.boardY + cell.y * this.cell + gap / 2;
      const palette = MINE_ROCK[cell.soil];
      const broken = cell.state !== "stone";
      // Base block: solid stone, or broken rock once dug.
      g.fillStyle(broken ? palette.dug : palette.rock, 1);
      g.fillRect(x, y, size, size);
      // Top highlight for a chunky Terraria block feel
      g.fillStyle(palette.speck, broken ? 0.15 : 0.35);
      g.fillRect(x, y, size, size * 0.12);
      // Left/right shading
      g.fillStyle(palette.border, 0.5);
      g.fillRect(x, y + size * 0.1, size * 0.1, size * 0.9);
      g.fillRect(x + size * 0.9, y + size * 0.1, size * 0.1, size * 0.9);
      // Ore vein flecks only remain in intact stone.
      if (cell.state === "stone") {
        const oreCount = cell.soil === 2 ? 3 : cell.soil === 1 ? 2 : 1;
        for (let s = 0; s < oreCount; s++) {
          const sx = x + ((cell.x * 31 + cell.y * 17 + s * 47) % Math.max(1, Math.floor(size * 0.7)));
          const sy = y + size * 0.35 + s * size * 0.28;
          g.fillStyle(palette.ore, 0.9);
          g.fillRect(sx, sy, size * 0.09, size * 0.09);
        }
      }
      // Lantern-lit glow inside exposed/dug cells.
      if (cell.state !== "stone") {
        g.fillStyle(DUG_LIGHT, 0.18);
        g.fillCircle(x + size / 2, y + size / 2, size * 0.3);
      }
    }
    // Rebuild gems: an embedded gem (letter still hidden) shows only for cells
    // whose stone has been broken but whose gem has not yet been dug.
    for (const c of this.gemTexts) c.destroy();
    this.gemTexts = [];
    for (const cell of this.grid.cells) {
      if (cell.state !== "gem") continue;
      this.makeGem(cell, false);
    }
  }

  private placePlayer(): void {
    const px = this.boardX + (this.playerX + 0.5) * this.cell;
    const py = this.boardY + (this.playerY + 0.5) * this.cell;
    this.player.setPosition(px, py - this.cell * 0.15);
    this.playerGlow.setPosition(px, py);
    const standing = this.standingCell();
    this.targetMarker.setPosition(
      this.boardX + (standing.x + 0.5) * this.cell,
      this.boardY + (standing.y + 0.5) * this.cell
    );
  }

  private buildHUD(): void {
    const W = this.scale.width;
    const pad = 10;
    this.hpText = this.add.text(pad, pad, "", { fontFamily: FONT, fontSize: 16, color: "#ffffff" }).setDepth(10).setScrollFactor(0);
    this.scoreText = this.add.text(pad, pad + 22, "", { fontFamily: FONT, fontSize: 13, color: "#fde68a" }).setDepth(10).setScrollFactor(0);
    this.roundText = this.add
      .text(W / 2, pad, "", { fontFamily: FONT, fontSize: 15, color: "#93c5fd", align: "center" })
      .setOrigin(0.5, 0)
      .setDepth(10)
      .setScrollFactor(0);
    this.updateHUD();
  }

  private updateHUD(): void {
    this.hpText.setText(`HP ${this.state.health}/${MAX_HEALTH}`);
    this.scoreText.setText(`Score ${this.state.score}`);
    this.roundText.setText(`ROUND ${this.state.round + 1}  •  WORDS ${this.state.wordsCompleted}/${WIN_GOAL}`);
  }

  private goalColor(word: DeckWord): number {
    return word.difficulty === "hard" ? HARD_LETTER_COLOR : EASY_LETTER_COLOR;
  }

  /** Selects goal `index`; instantly completes it if its letters are already collected. */
  private selectGoal(index: number): void {
    const goals = this.state.goals();
    const goal = goals[index];
    if (!goal) return;
    this.state.selectWord(goal.text);
    const done = this.state.completeSelected(this.t);
    if (done) this.onWordComplete(done);
    else this.rebuildGoalsPanel();
  }

  private rebuildGoalsPanel(): void {
    for (const c of this.goalCards) c.destroy();
    this.goalCards = [];
    const goals = this.state.goals();
    if (this.scale.width > 800) this.buildGoalsColumn(goals);
    else this.buildGoalsStrip(goals);
  }

  private buildGoalsColumn(goals: readonly DeckWord[]): void {
    const W = this.scale.width;
    const cx = W - this.panelW / 2;
    const topY = 58;
    const cardW = this.panelW - 24;
    const cardH = 50;
    const gap = 7;
    const startY = topY;
    goals.forEach((g, i) => {
      this.makeGoalCard(cx, startY + i * (cardH + gap), cardW, cardH, i, g);
    });
  }

  private buildGoalsStrip(goals: readonly DeckWord[]): void {
    const W = this.scale.width;
    const pad = 6;
    const cols = 5;
    const cardW = (W - pad * 2) / cols;
    const cardH = Math.max(34, Math.min(46, this.goalsH * 0.34));
    const topY = 50;
    goals.forEach((g, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = pad + cardW / 2 + col * cardW;
      const y = topY + row * (cardH + 4);
      this.makeGoalCard(x, y, cardW - 4, cardH, i, g);
    });
  }

  private makeGoalCard(x: number, y: number, w: number, h: number, index: number, goal: DeckWord): void {
    const compact = this.scale.width <= 800;
    const isSelected = this.state.selectedWord() === goal;
    const cardColor = this.goalColor(goal);
    const bg = this.add.rectangle(x, y, w, h, isSelected ? 0x2f6bff : 0xffffff, isSelected ? 0.4 : 0.08);
    bg.setStrokeStyle(2, isSelected ? 0xffffff : cardColor, isSelected ? 0.95 : 0.55);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => this.selectGoal(index));
    const left = x - w / 2 + (compact ? 6 : 12);
    const wordY = y - (compact ? 7 : 9);
    const idxText = this.add
      .text(left, wordY, `${index + 1}`, { fontFamily: FONT, fontSize: compact ? 10 : 13, color: "#94a3b8" })
      .setOrigin(0, 0.5);
    // The English word stays hidden until fully spelled: show a length hint.
    const blanks = goal.letters.map(() => "_").join(" ");
    const wordText = this.add
      .text(left + (compact ? 15 : 28), wordY, blanks, {
        fontFamily: FONT,
        fontSize: compact ? 12 : 16,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    const thaiText = this.add
      .text(left, y + (compact ? 9 : 11), goal.thai, {
        fontFamily: FONT,
        fontSize: compact ? 10 : 12,
        color: "#cbd5e1",
      })
      .setOrigin(0, 0.5);
    const progText = this.add
      .text(x + w / 2 - (compact ? 6 : 12), y, `${this.state.collectedFor(goal)}/${goal.letters.length}`, {
        fontFamily: FONT,
        fontSize: compact ? 11 : 13,
        color: `#${cardColor.toString(16)}`,
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5);
    const c = this.add.container(0, 0, [bg, idxText, wordText, thaiText, progText]);
    c.setDepth(9).setScrollFactor(0);
    this.goalCards.push(c);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on("down", () => this.digStanding(), this);

    const goalKeyCodes = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN,
      Phaser.Input.Keyboard.KeyCodes.EIGHT,
      Phaser.Input.Keyboard.KeyCodes.NINE,
      Phaser.Input.Keyboard.KeyCodes.ZERO,
    ];
    goalKeyCodes.forEach((code, i) => {
      const key = this.input.keyboard!.addKey(code);
      key.on("down", () => this.selectGoal(i), this);
      this.goalKeys.push(key);
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.downElement !== this.game.canvas) return;
      // Pointer only steers; a tap later digs if it is the miner's own block.
      this.dragStart = { x: pointer.x, y: pointer.y };
      this.dragVector.x = 0;
      this.dragVector.y = 0;
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragStart) return;
      const r = Math.max(30, this.cell * 2.5);
      let dx = pointer.x - this.dragStart.x;
      let dy = pointer.y - this.dragStart.y;
      const len = Math.hypot(dx, dy);
      if (len > r) {
        dx = (dx / len) * r;
        dy = (dy / len) * r;
      }
      this.dragVector.x = dx / r;
      this.dragVector.y = dy / r;
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.dragStart) {
        const dx = pointer.x - this.dragStart.x;
        const dy = pointer.y - this.dragStart.y;
        const tapThreshold = Math.max(10, this.cell * 0.35);
        if (Math.hypot(dx, dy) <= tapThreshold) {
          this.tryDigAtPointer(pointer);
        }
      }
      this.dragStart = null;
      this.dragVector.x = 0;
      this.dragVector.y = 0;
    });
    this.input.on("pointercancel", () => {
      this.dragStart = null;
      this.dragVector.x = 0;
      this.dragVector.y = 0;
    });
  }

  /** The grid cell the miner currently stands on. */
  private standingCell(): { x: number; y: number } {
    return {
      x: Phaser.Math.Clamp(Math.floor(this.playerX), 0, COLS - 1),
      y: Phaser.Math.Clamp(Math.floor(this.playerY), 0, ROWS - 1),
    };
  }

  /** Digs the block the miner is standing on (Spacebar). */
  private digStanding(): void {
    const c = this.standingCell();
    this.digAt(c.x, c.y);
  }

  /** A tap digs only the block the miner is standing on; elsewhere it does nothing. */
  private tryDigAtPointer(pointer: Phaser.Input.Pointer): void {
    const cx = Math.floor((pointer.x - this.boardX) / this.cell);
    const cy = Math.floor((pointer.y - this.boardY) / this.cell);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
    const standing = this.standingCell();
    if (cx === standing.x && cy === standing.y) this.digAt(cx, cy);
  }

  private nudgeFacing(cx: number): void {
    if (cx >= this.playerX) this.facing = "right";
    else this.facing = "left";
    this.player.setFacing(this.facing);
  }

  private digAt(x: number, y: number): void {
    const result = this.grid.dig(x, y);
    if (!result) return;
    // Swing the pickaxe and show Terraria-style debris.
    const cellCenterX = this.boardX + x * this.cell + this.cell / 2;
    const cellCenterY = this.boardY + y * this.cell + this.cell / 2;
    this.nudgeFacing(x);
    this.player.swing();
    spawnDigParticles(this, cellCenterX, cellCenterY, this.cell, result.cell.soil);
    if (result.type === "letter") {
      // Second dig: the hidden letter pops out of the gem clearly.
      const done = this.state.collectLetter(result.letter, this.t);
      const vis = letterVisual(result.cell.difficulty ?? "easy");
      const gem = new Gem(this, cellCenterX, cellCenterY, result.letter, result.cell.difficulty ?? "easy", this.cell * vis.pct * 0.9);
      gem.setScrollFactor(0);
      spawnGemPop(this, gem);
      gem.revealLetter(140);
      this.tweens.add({
        targets: gem.container,
        y: cellCenterY - this.cell * 0.7,
        alpha: 0,
        duration: 650,
        ease: "Quad.easeOut",
        delay: 650,
        onComplete: () => gem.destroy(),
      });
      this.redrawBoard();
      if (done) {
        this.onWordComplete(done);
      }
    } else {
      // First dig (or an empty cell): stone crumbles, revealing a gem or a hole.
      this.redrawBoard();
    }
    this.updateHUD();
  }

  private onWordComplete(word: DeckWord): void {
    this.rebuildGoalsPanel();
    this.spawnAuraToast(word);
    const line = this.add
      .text(this.player.container.x, this.player.container.y - this.cell, `✓ ${word.text}`, {
        fontFamily: FONT,
        fontSize: `${Math.round(this.cell * 0.5)}px`,
        color: "#a3ff4d",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(8)
      .setScrollFactor(0);
    this.tweens.add({ targets: line, y: line.y - this.cell, alpha: 0, duration: 900, onComplete: () => line.destroy() });
    this.checkEnd();
  }

  private spawnAuraToast(word: DeckWord): void {
    const W = this.scale.width;
    const txt = this.add
      .text(W / 2, this.boardY - 8, `${word.text}  AURA 10s!`, {
        fontFamily: FONT,
        fontSize: `${Math.max(14, this.cell * 0.4)}px`,
        color: "#fff3a8",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(12)
      .setScrollFactor(0);
    this.tweens.add({ targets: txt, alpha: 0, y: txt.y - 24, duration: 1200, delay: 800, onComplete: () => txt.destroy() });
    this.cameras.main.flash(160, 255, 250, 220);
    void word;
  }

  update(time: number, delta: number): void {
    if (!this.state) return;
    this.t += delta;
    this.checkBoardExhausted();
    const moving = this.handleMovement(delta);
    this.player.update(time, moving);
    this.player.tickSwing();
    this.refreshPlayerVisual(delta);
    this.renderLasers(delta);
    this.updateHUD();
  }

  /**
   * Rotates the goal words once the mine floor runs out of letters. There is no
   * time limit; a round simply ends when every letter has been dug. Unfinished
   * words still return as goals, and collected letters stay in the bag.
   */
  private checkBoardExhausted(): void {
    if (this.boardRotated) return;
    if (this.grid.remainingLetters !== 0) return;
    if (this.state.hasWon() || this.state.isOver()) return;
    this.boardRotated = true;
    this.state.rotateGoals();
    this.spawnRoundToast();
    this.rebuildGoalsPanel();
  }

  private spawnRoundToast(): void {
    const W = this.scale.width;
    const txt = this.add
      .text(W / 2, this.boardY - 8, "NEW GOALS — PICK A WORD!", {
        fontFamily: FONT,
        fontSize: Math.max(14, this.cell * 0.4),
        color: "#fff3a8",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(12)
      .setScrollFactor(0);
    this.tweens.add({ targets: txt, alpha: 0, y: txt.y - 24, duration: 1200, delay: 900, onComplete: () => txt.destroy() });
    this.cameras.main.flash(140, 147, 197, 255);
  }

  private handleMovement(delta: number): boolean {
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;
    if ((this.dragVector.x !== 0 || this.dragVector.y !== 0) && !this.state.isOver()) {
      vx = this.dragVector.x;
      vy = this.dragVector.y;
    }
    if (vx !== 0 && vy !== 0) {
      const inv = 1 / Math.hypot(vx, vy);
      vx *= inv;
      vy *= inv;
    }
    if (vx > 0.01) this.facing = "right";
    else if (vx < -0.01) this.facing = "left";
    this.player.setFacing(this.facing);
    const step = PLAYER_SPEED * (delta / 1000) * this.cell;
    this.playerX = Phaser.Math.Clamp(this.playerX + (vx * step) / this.cell, 0, COLS - 1);
    this.playerY = Phaser.Math.Clamp(this.playerY + (vy * step) / this.cell, 0, ROWS - 1);
    this.placePlayer();
    return vx !== 0 || vy !== 0;
  }

  private refreshPlayerVisual(delta: number): void {
    const aura = this.state.isWordAuraActive(this.t);
    this.playerGlow.setVisible(aura);
    if (aura) {
      this.playerGlow.setFillStyle(0xffffff, 0.18 + 0.1 * Math.sin(this.t / 120));
    }
    const invuln = this.state.isInvulnerable(this.t);
    if (invuln && !aura) {
      this.player.setAlpha(0.45 + 0.3 * Math.sin(this.t / 60));
    } else {
      this.player.setAlpha(1);
    }
  }

  private renderLasers(_delta: number): void {
    const g = this.laserGraphics;
    g.clear();
    this.lasers.ensureUpTo(this.t);
    const px = (this.playerX + 0.5) / COLS;
    const py = (this.playerY + 0.5) / ROWS;
    for (const ev of this.lasers.activeAt(this.t)) {
      if (!isVisible(ev, this.t)) continue;
      const offset = sweepOffset(ev, this.t);
      if (isGuiding(ev, this.t)) {
        this.drawBeam(g, ev.direction, offset ?? ev.sweepFrom, 0x60c8ff, 0.3, 0.02);
      } else if (offset !== null) {
        this.drawBeam(g, ev.direction, offset, 0xff3d6e, 0.9, BEAM_THICKNESS);
        if (hitsPoint(ev, this.t, px, py, BEAM_THICKNESS)) {
          if (this.state.takeHit(this.t)) {
            this.onLaserHit();
          }
        }
      }
    }
  }

  private onLaserHit(): void {
    this.cameras.main.shake(120, 0.01);
    this.player.swing();
    this.updateHUD();
    this.checkEnd();
  }

  private drawBeam(g: Phaser.GameObjects.Graphics, dir: LaserEvent["direction"], offset: number, color: number, alpha: number, width: number): void {
    g.lineStyle(Math.max(2, this.boardW * width), color, alpha);
    const bx = this.boardX;
    const by = this.boardY;
    const bw = this.boardW;
    const bh = this.boardH;
    if (dir === "vertical") {
      const x = bx + offset * bw;
      g.lineBetween(x, by, x, by + bh);
    } else if (dir === "horizontal") {
      const y = by + offset * bh;
      g.lineBetween(bx, y, bx + bw, y);
    } else if (dir === "diag-left") {
      const c = (offset * Math.sqrt(bw * bw + bh * bh)) / 2;
      const pts = this.clipLine([bx, by + bh], [bx + bw, by], bx, by, bw, bh, c, dir);
      g.lineBetween(pts.x1, pts.y1, pts.x2, pts.y2);
    } else {
      const c = (offset * Math.sqrt(bw * bw + bh * bh)) / 2;
      const pts = this.clipLine([bx, by], [bx + bw, by + bh], bx, by, bw, bh, c, dir);
      g.lineBetween(pts.x1, pts.y1, pts.x2, pts.y2);
    }
  }

  private clipLine(a: number[], b: number[], bx: number, by: number, bw: number, bh: number, c0: number, dir: string): { x1: number; y1: number; x2: number; y2: number } {
    const sign = dir === "diag-left" ? -1 : 1;
    const dxb = b[0] - a[0];
    const dyb = b[1] - a[1];
    const len = Math.hypot(dxb, dyb) || 1;
    const ux = dxb / len;
    const uy = dyb / len;
    const nx = -uy;
    const ny = ux;
    const px0 = a[0] + nx * c0 * sign;
    const py0 = a[1] + ny * c0 * sign;
    return this.extendLine(px0, py0, ux, uy, bx, by, bw, bh);
  }

  private extendLine(x0: number, y0: number, ux: number, uy: number, bx: number, by: number, bw: number, bh: number): { x1: number; y1: number; x2: number; y2: number } {
    const half = bw + bh;
    const candidates: { x: number; y: number }[] = [];
    for (const t of [-half, half]) {
      candidates.push({ x: x0 + ux * t, y: y0 + uy * t });
    }
    const clipped = candidates.filter((p) => p.x >= bx - 1 && p.x <= bx + bw + 1 && p.y >= by - 1 && p.y <= by + bh + 1);
    if (clipped.length >= 2) return { x1: clipped[0].x, y1: clipped[0].y, x2: clipped[1].x, y2: clipped[1].y };
    const p1 = this.clampToRect(x0 + ux * -half, y0 + uy * -half, bx, by, bw, bh);
    const p2 = this.clampToRect(x0 + ux * half, y0 + uy * half, bx, by, bw, bh);
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  }

  private clampToRect(x: number, y: number, bx: number, by: number, bw: number, bh: number): { x: number; y: number } {
    return { x: Phaser.Math.Clamp(x, bx, bx + bw), y: Phaser.Math.Clamp(y, by, by + bh) };
  }

  private checkEnd(): void {
    if (this.state.hasWon()) {
      this.scene.start("Win");
    } else if (this.state.isOver()) {
      this.scene.start("GameOver");
    }
  }

  private cleanup(): void {
    this.input.removeAllListeners();
    this.time.removeAllEvents();
  }
}