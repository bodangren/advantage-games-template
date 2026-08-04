import Phaser from "phaser";
import type {
  CartridgeGameConfigContext,
  CompetitionAssetId,
} from "@reading-advantage/advantage-play-kit";
import {
  GOBLIN_SPAWNS,
  HERO_SPAWN,
  POWER_UP_MS,
  STUN_MS,
  buildRounds,
  canEnter,
  chooseGoblinDirection,
  collectCoin,
  collectOrb,
  createGameState,
  createRandom,
  defeatGoblin,
  flipCell,
  loseLife,
  orientCell,
  orientMaze,
  parseMaze,
  placeOrbs,
  results,
  sentenceProgress,
  stepMover,
  type Direction,
  type GameState,
  type MazeCell,
  type MazeGrid,
  type MoverState,
  type SentenceRound,
} from "./systems";

/** Font stack that renders both Thai and English prompts legibly. */
const UI_FONT = '"Noto Sans Thai", "Sarabun", "Leelawadee UI", Tahoma, sans-serif';

/** Organizer-required visible credit line. */
const CREDIT_LINE =
  "Pixel art assets by ElvGames  •  Sound effects by Universal Sound Effects";

/** Orb textures cycled for visual variety, never to mark the next word. */
const ORB_TEXTURES = ["cm-orb-later", "cm-orb-final", "cm-orb-next"] as const;

/** Hero travel speed in maze cells per second. */
const HERO_SPEED = 5.4;

/** One goblin, its palette role, and its patrol behaviour. */
interface GoblinPlan {
  /** Texture key used by the scene. */
  readonly key: string;
  /** Stable palette role backing the texture. */
  readonly role: CompetitionAssetId;
  /** Travel speed in maze cells per second. */
  readonly speed: number;
  /** Behaviour used while the hero is unprotected. */
  readonly mode: "chase" | "patrol";
}

/** Goblin roster in the order they join the maze as sentences get longer. */
const GOBLIN_PLANS: readonly GoblinPlan[] = [
  { key: "cm-goblin-scout", role: "goblin.scout", speed: 4.6, mode: "patrol" },
  { key: "cm-goblin-stalker", role: "goblin.stalker", speed: 4.1, mode: "chase" },
  { key: "cm-goblin-brute", role: "goblin.brute", speed: 3.2, mode: "chase" },
  { key: "cm-goblin-warden", role: "goblin.warden", speed: 3.7, mode: "patrol" },
];

/** A live goblin in the maze. */
interface Goblin {
  /** Static plan describing speed and behaviour. */
  readonly plan: GoblinPlan;
  /** Sprite rendered for this goblin. */
  readonly sprite: Phaser.GameObjects.Sprite;
  /** Home cell used for spawning and respawning. */
  home: MazeCell;
  /** Continuous maze position and heading. */
  mover: MoverState;
  /** Heading chosen at the last cell the goblin entered. */
  want: Direction;
  /** Key of the last cell a decision was made in. */
  lastCell: string;
  /** Scene time at which a defeated goblin returns, or zero when active. */
  respawnAt: number;
}

/** A word orb waiting to be collected. */
interface WordOrb {
  /** Sentence position this orb represents. */
  readonly wordIndex: number;
  /** Sprite rendered for this orb. */
  readonly sprite: Phaser.GameObjects.Sprite;
  /** Word label shown above the orb. */
  readonly label: Phaser.GameObjects.Text;
  /** Current maze cell. */
  cell: MazeCell;
  /** False once the learner has collected it. */
  active: boolean;
  /** False while the hero still stands on an orb it just got wrong. */
  armed: boolean;
}

/** A bonus coin waiting to be collected. */
interface BonusCoin {
  /** Sprite rendered for this coin. */
  readonly sprite: Phaser.GameObjects.Sprite;
  /** Current maze cell. */
  cell: MazeCell;
  /** False once the learner has collected it. */
  active: boolean;
}

/**
 * Creates the Crystal Maze scene: a Pac-Man-style sentence maze where the Thai
 * prompt is displayed and the English words must be collected in order.
 * @param context Host-supplied lifecycle, input, palette, and completion services.
 * @returns A Phaser scene class bound to this cartridge context.
 */
export function createCrystalMazeScene(
  context: CartridgeGameConfigContext,
): typeof Phaser.Scene {
  return class CrystalMazeScene extends Phaser.Scene {
    private readonly rounds: readonly SentenceRound[] = buildRounds(context.input);
    private readonly seed = context.seed ?? 20260804;
    private state: GameState = createGameState();
    private finished = false;

    private grid: MazeGrid = parseMaze();
    private wide = false;
    private tile = 24;
    private originX = 0;
    private originY = 0;

    private hero!: Phaser.GameObjects.Sprite;
    private heroMover: MoverState = {
      col: HERO_SPAWN.col,
      row: HERO_SPAWN.row,
      dirCol: 0,
      dirRow: 0,
    };
    private want: Direction = { dirCol: 0, dirRow: 0 };
    private heroSpawn: MazeCell = HERO_SPAWN;

    private goblins: Goblin[] = [];
    private orbs: WordOrb[] = [];
    private coins: BonusCoin[] = [];

    private mazeLayer!: Phaser.GameObjects.Container;
    private chest!: Phaser.GameObjects.Image;
    private gate!: Phaser.GameObjects.Image;
    private hitEffect!: Phaser.GameObjects.Sprite;

    private panel!: Phaser.GameObjects.Rectangle;
    private promptText!: Phaser.GameObjects.Text;
    private progressText!: Phaser.GameObjects.Text;
    private statusText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;
    private bannerBox!: Phaser.GameObjects.Rectangle;
    private bannerText!: Phaser.GameObjects.Text;
    private creditText!: Phaser.GameObjects.Text;

    private powerUpUntil = 0;
    private stunUntil = 0;
    private invulnerableUntil = 0;
    private paused = false;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private keys?: Record<string, Phaser.Input.Keyboard.Key>;
    private pointerHeld = false;
    private random: () => number = createRandom(this.seed);

    preload(): void {
      this.loadSheet("cm-hero", "player.hero-3");
      for (const plan of GOBLIN_PLANS) this.loadSheet(plan.key, plan.role);
      this.loadSheet("cm-orb-next", "orb.crystal-yellow");
      this.loadSheet("cm-orb-later", "orb.crystal-blue");
      this.loadSheet("cm-orb-final", "orb.crystal-green");
      this.loadSheet("cm-coin", "bonus.coin");
      this.loadSheet("cm-torch", "maze.torch");
      this.loadSheet("cm-hit", "feedback.hit");
      this.load.image("cm-wall", context.assets.resolve("maze.wall-cavern").url);
      this.load.image("cm-floor", context.assets.resolve("maze.floor-cavern").url);
      this.load.image("cm-gate", context.assets.resolve("maze.gate").url);
      this.load.image("cm-chest", context.assets.resolve("bonus.chest").url);
      this.load.audio("cm-pickup", context.assets.resolve("audio.orb-pickup").url);
      this.load.audio("cm-wrong", context.assets.resolve("audio.wrong-orb").url);
      this.load.audio("cm-power", context.assets.resolve("audio.power-up").url);
      this.load.audio("cm-defeat", context.assets.resolve("audio.goblin-defeat").url);
      this.load.audio(
        "cm-sentence",
        context.assets.resolve("audio.sentence-complete").url,
      );
      this.load.audio("cm-confirm", context.assets.resolve("audio.ui-confirm").url);
    }

    create(): void {
      this.cameras.main.setBackgroundColor(context.edition.colors.background);
      this.wide = this.scale.width >= this.scale.height;
      this.grid = orientMaze(parseMaze(), this.wide);
      this.heroSpawn = orientCell(HERO_SPAWN, this.wide);

      this.animateFrom("cm-hero-run", "cm-hero", "player.hero-3");
      for (const plan of GOBLIN_PLANS) {
        this.animateFrom(`${plan.key}-move`, plan.key, plan.role);
      }
      this.animateFrom("cm-orb-next-spin", "cm-orb-next", "orb.crystal-yellow");
      this.animateFrom("cm-orb-later-spin", "cm-orb-later", "orb.crystal-blue");
      this.animateFrom("cm-orb-final-spin", "cm-orb-final", "orb.crystal-green");
      this.animateFrom("cm-coin-spin", "cm-coin", "bonus.coin");
      this.animateFrom("cm-torch-burn", "cm-torch", "maze.torch");
      this.animateFrom("cm-hit-burst", "cm-hit", "feedback.hit", 0);

      this.mazeLayer = this.add.container(0, 0);
      this.gate = this.add.image(0, 0, "cm-gate").setDepth(2);
      this.chest = this.add.image(0, 0, "cm-chest").setDepth(9).setVisible(false);
      this.hitEffect = this.add.sprite(0, 0, "cm-hit").setDepth(9).setVisible(false);

      this.hero = this.add.sprite(0, 0, "cm-hero").setDepth(6);
      this.hero.play("cm-hero-run");

      this.createHud();
      this.createGoblins();
      this.bindInput();

      this.scale.on("resize", this.handleResize, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.release, this);
      // Hosts may animate the surrounding frame, so poll the parent element and
      // adopt its size instead of assuming the boot-time viewport is final.
      this.time.addEvent({
        delay: 250,
        loop: true,
        callback: this.syncToParent,
        callbackScope: this,
      });

      if (this.rounds.length === 0) {
        this.finish("No sentences supplied", "lost");
        return;
      }

      this.startRound(true);
      this.layout();
      context.diagnostic({
        code: "GAME_READY",
        message: `Crystal Maze ready with ${this.rounds.length} sentence rounds`,
      });
    }

    update(time: number, delta: number): void {
      if (this.finished || this.paused) return;
      const step = Math.min(delta, 48) / 1000;
      const hunting = time < this.powerUpUntil;

      this.readKeyboard();
      if (time >= this.stunUntil) {
        this.heroMover = stepMover(this.grid, this.heroMover, this.want, HERO_SPEED * step);
        if (this.heroMover.dirCol !== 0) this.hero.setFlipX(this.heroMover.dirCol < 0);
      }
      this.hero.setAlpha(time < this.stunUntil ? 0.45 : 1);
      this.place(this.hero, this.heroMover.col, this.heroMover.row);

      this.updateGoblins(time, step, hunting);
      this.checkOrbs(time);
      this.checkCoins();
      this.checkGoblinContact(time, hunting);
      this.updateOrbs();
      this.renderStatus(time, hunting);
    }

    /** Loads one selected-union spritesheet using descriptor-owned frame metadata. */
    private loadSheet(key: string, role: CompetitionAssetId): void {
      const asset = context.assets.resolve(role);
      if (asset.kind !== "spritesheet" || !asset.frame) {
        throw new Error(`${role} is not a selected-union spritesheet`);
      }
      this.load.spritesheet(key, asset.url, {
        frameWidth: asset.frame.width,
        frameHeight: asset.frame.height,
      });
    }

    /** Registers an animation using the organizer's frame count and frame rate. */
    private animateFrom(
      key: string,
      texture: string,
      role: CompetitionAssetId,
      repeat = -1,
    ): void {
      if (this.anims.exists(key)) return;
      const asset = context.assets.resolve(role);
      if (!asset.frame) throw new Error(`${role} is missing frame metadata`);
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(texture, {
          start: 0,
          end: asset.frame.count - 1,
        }),
        frameRate: asset.frame.frameRate,
        repeat,
      });
    }

    /** Builds the prompt panel, progress line, status line, and credits. */
    private createHud(): void {
      this.panel = this.add
        .rectangle(0, 0, 10, 10, context.edition.colors.panel, 0.94)
        .setOrigin(0)
        .setDepth(20);
      this.promptText = this.add
        .text(0, 0, "", {
          fontFamily: UI_FONT,
          fontSize: "26px",
          color: context.edition.colors.text,
          align: "left",
          wordWrap: { width: 320 },
        })
        .setDepth(21);
      this.progressText = this.add
        .text(0, 0, "", {
          fontFamily: UI_FONT,
          fontSize: "20px",
          color: context.edition.colors.text,
          align: "left",
          wordWrap: { width: 320 },
        })
        .setDepth(21);
      this.statusText = this.add
        .text(0, 0, "", {
          fontFamily: UI_FONT,
          fontSize: "18px",
          color: context.edition.colors.text,
          align: "left",
        })
        .setDepth(21);
      this.hintText = this.add
        .text(0, 0, "Collect the words in sentence order • hold WASD / arrows / drag", {
          fontFamily: UI_FONT,
          fontSize: "15px",
          color: context.edition.colors.text,
          align: "left",
          wordWrap: { width: 320 },
        })
        .setAlpha(0.75)
        .setDepth(21);
      this.creditText = this.add
        .text(0, 0, CREDIT_LINE, {
          fontFamily: UI_FONT,
          fontSize: "13px",
          color: context.edition.colors.text,
          align: "center",
          wordWrap: { width: 340 },
        })
        .setAlpha(0.68)
        .setDepth(21);
      this.bannerBox = this.add
        .rectangle(0, 0, 10, 10, context.edition.colors.panel, 0.96)
        .setDepth(30)
        .setVisible(false);
      this.bannerText = this.add
        .text(0, 0, "", {
          fontFamily: UI_FONT,
          fontSize: "26px",
          color: context.edition.colors.text,
          align: "center",
          wordWrap: { width: 320 },
        })
        .setOrigin(0.5)
        .setDepth(31)
        .setVisible(false);
    }

    /** Creates every goblin sprite once; rounds decide how many are active. */
    private createGoblins(): void {
      this.goblins = GOBLIN_PLANS.map((plan, index) => {
        const home = orientCell(GOBLIN_SPAWNS[index]!, this.wide);
        const sprite = this.add.sprite(0, 0, plan.key).setDepth(5);
        sprite.play(`${plan.key}-move`);
        return {
          plan,
          sprite,
          home,
          mover: { col: home.col, row: home.row, dirCol: 0, dirRow: 0 },
          want: { dirCol: 0, dirRow: 0 },
          lastCell: "",
          respawnAt: 0,
        };
      });
    }

    /** Registers keyboard and pointer steering for both viewport profiles. */
    private bindInput(): void {
      this.cursors = this.input.keyboard?.createCursorKeys();
      this.keys = this.input.keyboard?.addKeys("W,A,S,D") as
        | Record<string, Phaser.Input.Keyboard.Key>
        | undefined;
      this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointer, this);
      this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
      this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    }

    /** Starts a pointer steer and remembers the drag is active. */
    private handlePointer(pointer: Phaser.Input.Pointer): void {
      this.pointerHeld = true;
      this.steerToward(pointer.x, pointer.y);
    }

    /** Continues steering while the learner drags on the canvas. */
    private handlePointerMove(pointer: Phaser.Input.Pointer): void {
      if (this.pointerHeld) this.steerToward(pointer.x, pointer.y);
    }

    /** Ends the pointer steer and halts the hero unless a key is still held. */
    private handlePointerUp(): void {
      this.pointerHeld = false;
      this.want = { dirCol: 0, dirRow: 0 };
    }

    /** Converts a pointer position into the dominant maze heading. */
    private steerToward(x: number, y: number): void {
      const heroX = this.originX + (this.heroMover.col + 0.5) * this.tile;
      const heroY = this.originY + (this.heroMover.row + 0.5) * this.tile;
      const deltaX = x - heroX;
      const deltaY = y - heroY;
      if (Math.abs(deltaX) < this.tile * 0.3 && Math.abs(deltaY) < this.tile * 0.3) {
        this.want = { dirCol: 0, dirRow: 0 };
        return;
      }
      this.want =
        Math.abs(deltaX) > Math.abs(deltaY)
          ? { dirCol: Math.sign(deltaX), dirRow: 0 }
          : { dirCol: 0, dirRow: Math.sign(deltaY) };
    }

    /**
     * Reads WASD and arrow keys into the requested heading. The hero moves only
     * while a direction is held, so releasing every key halts it in place.
     */
    private readKeyboard(): void {
      const left = this.cursors?.left.isDown || this.keys?.A?.isDown;
      const right = this.cursors?.right.isDown || this.keys?.D?.isDown;
      const up = this.cursors?.up.isDown || this.keys?.W?.isDown;
      const down = this.cursors?.down.isDown || this.keys?.S?.isDown;
      if (left) this.want = { dirCol: -1, dirRow: 0 };
      else if (right) this.want = { dirCol: 1, dirRow: 0 };
      else if (up) this.want = { dirCol: 0, dirRow: -1 };
      else if (down) this.want = { dirCol: 0, dirRow: 1 };
      else if (!this.pointerHeld) this.want = { dirCol: 0, dirRow: 0 };
    }

    /** Spawns the orbs, coins, and goblins for the active sentence. */
    private startRound(first: boolean): void {
      const round = this.rounds[this.state.roundIndex];
      if (!round) return;

      this.orbs.forEach((orb) => {
        orb.sprite.destroy();
        orb.label.destroy();
      });
      this.orbs = [];
      this.coins.forEach((coin) => coin.sprite.destroy());
      this.coins = [];

      this.random = createRandom(this.seed + this.state.roundIndex * 977 + 13);
      // Keep orbs off the hero spawn and every goblin home so no word starts
      // the round sitting underneath a goblin.
      const reserved = [this.heroSpawn, ...this.goblins.map((goblin) => goblin.home)];
      const orbCells = placeOrbs(
        this.grid,
        round.words.length,
        this.seed + this.state.roundIndex * 97 + 5,
        reserved,
      );
      round.words.forEach((word, index) => {
        const cell = orbCells[index] ?? this.heroSpawn;
        // Colour cycles for visual variety only; it never signals which word is next.
        const texture = ORB_TEXTURES[index % ORB_TEXTURES.length]!;
        const sprite = this.add.sprite(0, 0, texture).setDepth(4);
        sprite.play(`${texture}-spin`);
        const label = this.add
          .text(0, 0, word, {
            fontFamily: UI_FONT,
            fontSize: "14px",
            color: "#f8fafc",
            backgroundColor: "#0b1220e6",
            stroke: "#0b1220",
            strokeThickness: 2,
            padding: { x: 5, y: 2 },
          })
          .setOrigin(0.5, 1)
          .setDepth(8);
        this.orbs.push({ wordIndex: index, sprite, label, cell, active: true, armed: true });
      });

      const coinCells = placeOrbs(
        this.grid,
        4,
        this.seed + this.state.roundIndex * 31 + 401,
        [...reserved, ...orbCells],
      );
      for (const cell of coinCells) {
        const sprite = this.add.sprite(0, 0, "cm-coin").setDepth(4).setAlpha(0.9);
        sprite.play("cm-coin-spin");
        this.coins.push({ sprite, cell, active: true });
      }

      this.heroMover = {
        col: this.heroSpawn.col,
        row: this.heroSpawn.row,
        dirCol: 0,
        dirRow: 0,
      };
      this.want = { dirCol: 0, dirRow: 0 };
      const active = this.activeGoblinCount();
      this.goblins.forEach((goblin, index) => {
        goblin.respawnAt = 0;
        goblin.lastCell = "";
        goblin.mover = {
          col: goblin.home.col,
          row: goblin.home.row,
          dirCol: 0,
          dirRow: 0,
        };
        goblin.sprite.setVisible(index < active).clearTint().setAlpha(1);
      });

      this.renderPrompt();
      this.layoutEntities();
      if (!first) this.sound.play("cm-confirm", { volume: 0.3 });
    }

    /** Number of goblins hunting the learner during the active sentence. */
    private activeGoblinCount(): number {
      return Math.min(GOBLIN_PLANS.length, 1 + this.state.roundIndex);
    }

    /** Moves every active goblin and returns defeated goblins to their home. */
    private updateGoblins(time: number, step: number, hunting: boolean): void {
      const target: MazeCell = {
        col: Math.round(this.heroMover.col),
        row: Math.round(this.heroMover.row),
      };
      const active = this.activeGoblinCount();

      this.goblins.forEach((goblin, index) => {
        if (index >= active) return;
        if (goblin.respawnAt > 0) {
          if (time < goblin.respawnAt) return;
          goblin.respawnAt = 0;
          goblin.mover = {
            col: goblin.home.col,
            row: goblin.home.row,
            dirCol: 0,
            dirRow: 0,
          };
          goblin.sprite.setVisible(true).setAlpha(1);
        }

        const mode = hunting ? "flee" : goblin.plan.mode;
        const speed = goblin.plan.speed * (hunting ? 0.6 : 1);
        const cellKey = `${Math.round(goblin.mover.col)}:${Math.round(goblin.mover.row)}`;
        if (cellKey !== goblin.lastCell) {
          goblin.lastCell = cellKey;
          goblin.want = chooseGoblinDirection(
            this.grid,
            goblin.mover,
            target,
            this.random,
            mode,
          );
        }
        goblin.mover = stepMover(this.grid, goblin.mover, goblin.want, speed * step);
        goblin.sprite.setTint(hunting ? 0x7dd3fc : 0xffffff);
        if (goblin.mover.dirCol !== 0) {
          goblin.sprite.setFlipX(goblin.mover.dirCol < 0);
        }
        this.place(goblin.sprite, goblin.mover.col, goblin.mover.row);
      });
    }

    /** Applies the sentence-order rule when the hero touches a word orb. */
    private checkOrbs(time: number): void {
      if (time < this.stunUntil) return;
      for (const orb of this.orbs) {
        if (!orb.active) continue;
        if (!this.touching(orb.cell)) {
          // Re-arm only once the hero has driven clear, so resting on a wrong
          // orb cannot repeatedly charge the learner for the same mistake.
          orb.armed = true;
          continue;
        }
        if (!orb.armed) continue;
        const applied = collectOrb(this.state, this.rounds, orb.wordIndex);
        this.state = applied.state;

        if (applied.outcome === "wrong") {
          orb.armed = false;
          this.stunUntil = time + STUN_MS;
          this.cameras.main.shake(180, 0.006);
          this.hero.setTint(0xf87171);
          this.time.delayedCall(STUN_MS, () => this.hero.clearTint());
          this.sound.play("cm-wrong", { volume: 0.4 });
          this.renderPrompt();
          return;
        }

        orb.active = false;
        orb.sprite.setVisible(false);
        orb.label.setVisible(false);
        this.sound.play("cm-pickup", { volume: 0.4 });

        if (applied.outcome === "correct") {
          this.renderPrompt();
          return;
        }

        this.celebrateSentence();
        if (applied.outcome === "won") {
          this.finish("Maze cleared! ทำได้ดีมาก", "won");
          return;
        }
        this.powerUpUntil = time + POWER_UP_MS;
        this.sound.play("cm-power", { volume: 0.4 });
        this.time.delayedCall(650, () => {
          if (!this.finished) this.startRound(false);
        });
        return;
      }
    }

    /** Awards bonus coins the hero drives over. */
    private checkCoins(): void {
      for (const coin of this.coins) {
        if (!coin.active || !this.touching(coin.cell)) continue;
        coin.active = false;
        coin.sprite.setVisible(false);
        this.state = collectCoin(this.state);
      }
    }

    /** Resolves goblin contact as a defeat during Goblin Hunt or a lost life. */
    private checkGoblinContact(time: number, hunting: boolean): void {
      const active = this.activeGoblinCount();
      for (let index = 0; index < active; index += 1) {
        const goblin = this.goblins[index]!;
        if (goblin.respawnAt > 0) continue;
        const distance =
          Math.abs(goblin.mover.col - this.heroMover.col) +
          Math.abs(goblin.mover.row - this.heroMover.row);
        if (distance > 0.75) continue;

        if (hunting) {
          this.state = defeatGoblin(this.state);
          goblin.respawnAt = time + 2600;
          goblin.sprite.setVisible(false);
          this.hitEffect
            .setPosition(goblin.sprite.x, goblin.sprite.y)
            .setDisplaySize(this.tile * 1.6, this.tile * 1.6)
            .setVisible(true)
            .play("cm-hit-burst");
          this.sound.play("cm-defeat", { volume: 0.45 });
          continue;
        }

        if (time < this.invulnerableUntil) continue;
        this.state = loseLife(this.state);
        this.invulnerableUntil = time + 1600;
        this.stunUntil = time + 500;
        this.cameras.main.shake(240, 0.01);
        this.sound.play("cm-wrong", { volume: 0.45 });
        this.heroMover = {
          col: this.heroSpawn.col,
          row: this.heroSpawn.row,
          dirCol: 0,
          dirRow: 0,
        };
        this.want = { dirCol: 0, dirRow: 0 };
        if (this.state.status === "lost") {
          this.finish("Out of lives — the goblins keep the crystals", "lost");
        }
        return;
      }
    }

    /** Shows the chest reward and plays the sentence-complete cue. */
    private celebrateSentence(): void {
      this.chest
        .setPosition(this.hero.x, this.hero.y - this.tile * 0.6)
        .setDisplaySize(this.tile * 1.3, this.tile * 1.3)
        .setAlpha(1)
        .setVisible(true);
      this.tweens.add({
        targets: this.chest,
        y: this.chest.y - this.tile,
        alpha: 0,
        duration: 900,
        onComplete: () => this.chest.setVisible(false),
      });
      this.sound.play("cm-sentence", { volume: 0.45 });
      this.flashBanner("Sentence complete — Goblin Hunt!");
    }

    /**
     * Keeps every remaining orb reading identically. The next correct word is
     * deliberately not marked: the learner decides the order from the Thai
     * prompt and the English progress line, not from the orb art.
     */
    private updateOrbs(): void {
      for (const orb of this.orbs) {
        if (!orb.active) continue;
        orb.sprite.setDisplaySize(this.tile * 0.72, this.tile * 0.72).setAlpha(1);
        orb.label.setAlpha(1).setScale(1);
      }
    }

    /** Renders the Thai prompt and the English sentence-progress line. */
    private renderPrompt(): void {
      const round = this.rounds[this.state.roundIndex];
      if (!round) return;
      this.promptText.setText(round.prompt);
      this.progressText.setText(sentenceProgress(round, this.state.wordIndex));
    }

    /** Refreshes lives, score, round, and the Goblin Hunt timer. */
    private renderStatus(time: number, hunting: boolean): void {
      const remaining = hunting
        ? ` • Goblin Hunt ${Math.ceil((this.powerUpUntil - time) / 1000)}s`
        : "";
      this.statusText.setText(
        `${"♥".repeat(Math.max(0, this.state.lives))}   Score ${this.state.score}   Sentence ${Math.min(this.state.roundIndex + 1, this.rounds.length)}/${this.rounds.length}${remaining}`,
      );
    }

    /** Shows a short centred message without blocking play. */
    private flashBanner(message: string): void {
      this.bannerText.setText(message).setVisible(true);
      this.bannerBox
        .setVisible(true)
        .setSize(this.bannerText.width + 40, this.bannerText.height + 26);
      this.layoutBanner();
      this.time.delayedCall(1200, () => {
        if (this.finished) return;
        this.bannerText.setVisible(false);
        this.bannerBox.setVisible(false);
      });
    }

    /** Ends the run and emits the host result contract exactly once. */
    private finish(message: string, status: "won" | "lost"): void {
      if (this.finished) return;
      this.finished = true;
      this.paused = true;
      const summary = results(this.state);
      this.bannerText
        .setText(
          `${message}\n\nScore ${summary.score}  •  ${summary.correctAnswers}/${summary.totalAttempts} orbs in order`,
        )
        .setVisible(true);
      this.bannerBox
        .setVisible(true)
        .setSize(this.bannerText.width + 48, this.bannerText.height + 32);
      this.layoutBanner();
      this.sound.play(status === "won" ? "cm-sentence" : "cm-wrong", {
        volume: 0.5,
      });
      context.complete(summary);
      context.diagnostic({
        code: status === "won" ? "GAME_WON" : "GAME_OVER",
        message,
      });
    }

    /** True when the hero overlaps a maze cell closely enough to collect it. */
    private touching(cell: MazeCell): boolean {
      return (
        Math.abs(this.heroMover.col - cell.col) +
          Math.abs(this.heroMover.row - cell.row) <
        0.7
      );
    }

    /** Positions a display object from continuous maze coordinates. */
    private place(
      target: Phaser.GameObjects.Components.Transform,
      col: number,
      row: number,
    ): void {
      target.setPosition(
        this.originX + (col + 0.5) * this.tile,
        this.originY + (row + 0.5) * this.tile,
      );
    }

    /** Adopts the host container's current size so late layout changes are honoured. */
    private syncToParent(): void {
      const parent = this.scale.parent as HTMLElement | null;
      if (!parent) return;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      if (width < 1 || height < 1) return;
      if (
        Math.abs(width - this.scale.width) > 1 ||
        Math.abs(height - this.scale.height) > 1
      ) {
        this.scale.resize(width, height);
      }
    }

    /** Rebuilds the maze and layout when the host viewport changes. */
    private handleResize(): void {
      const wide = this.scale.width >= this.scale.height;
      if (wide !== this.wide) {
        this.wide = wide;
        this.grid = orientMaze(parseMaze(), wide);
        this.heroSpawn = flipCell(this.heroSpawn);
        this.heroMover = {
          col: this.heroMover.row,
          row: this.heroMover.col,
          dirCol: this.heroMover.dirRow,
          dirRow: this.heroMover.dirCol,
        };
        this.want = { dirCol: this.want.dirRow, dirRow: this.want.dirCol };
        for (const goblin of this.goblins) {
          goblin.home = flipCell(goblin.home);
          goblin.mover = {
            col: goblin.mover.row,
            row: goblin.mover.col,
            dirCol: goblin.mover.dirRow,
            dirRow: goblin.mover.dirCol,
          };
        }
        for (const orb of this.orbs) orb.cell = flipCell(orb.cell);
        for (const coin of this.coins) coin.cell = flipCell(coin.cell);
      }
      this.layout();
    }

    /** Composes the prompt panel and maze for the compact or wide profile. */
    private layout(): void {
      const { width, height } = this.scale;
      const compact = !this.wide;
      const panelWidth = compact ? width : Math.min(400, Math.max(300, width * 0.28));
      const panelHeight = compact ? Math.max(190, height * 0.26) : height;
      const wrap = panelWidth - 40;

      this.panel.setPosition(0, 0).setSize(panelWidth, panelHeight);
      this.promptText
        .setPosition(20, 18)
        .setFontSize(compact ? 24 : 27)
        .setWordWrapWidth(wrap);
      this.progressText
        .setPosition(20, this.promptText.y + this.promptText.height + 10)
        .setFontSize(compact ? 19 : 22)
        .setWordWrapWidth(wrap);
      this.statusText
        .setPosition(20, this.progressText.y + this.progressText.height + 10)
        .setFontSize(compact ? 16 : 18);
      this.hintText
        .setPosition(20, this.statusText.y + this.statusText.height + 8)
        .setFontSize(compact ? 13 : 15)
        .setWordWrapWidth(wrap);
      this.creditText
        .setPosition(20, panelHeight - 26)
        .setFontSize(compact ? 12 : 13)
        .setWordWrapWidth(wrap);
      if (!compact) this.creditText.setPosition(20, height - 44);

      const areaX = compact ? 0 : panelWidth;
      const areaY = compact ? panelHeight : 0;
      const areaWidth = compact ? width : width - panelWidth;
      const areaHeight = compact ? height - panelHeight : height;
      const cols = this.grid[0]?.length ?? 1;
      const rows = this.grid.length;
      this.tile = Math.max(
        8,
        Math.floor(Math.min((areaWidth - 12) / cols, (areaHeight - 12) / rows)),
      );
      this.originX = areaX + (areaWidth - this.tile * cols) / 2;
      this.originY = areaY + (areaHeight - this.tile * rows) / 2;

      this.drawMaze();
      this.layoutEntities();
      this.layoutBanner();
    }

    /** Redraws floor, wall, torch, and gate tiles at the current tile size. */
    private drawMaze(): void {
      this.mazeLayer.removeAll(true);
      const cols = this.grid[0]?.length ?? 0;
      const rows = this.grid.length;
      let wallIndex = 0;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const open = canEnter(this.grid, col, row);
          const x = this.originX + (col + 0.5) * this.tile;
          const y = this.originY + (row + 0.5) * this.tile;
          const tileImage = this.add
            .image(x, y, open ? "cm-floor" : "cm-wall")
            .setDisplaySize(this.tile, this.tile);
          this.mazeLayer.add(tileImage);

          if (!open) {
            wallIndex += 1;
            const lit =
              wallIndex % 11 === 3 &&
              (canEnter(this.grid, col, row + 1) || canEnter(this.grid, col, row - 1));
            if (lit) {
              const torch = this.add
                .sprite(x, y, "cm-torch")
                .setDisplaySize(this.tile * 0.8, this.tile * 0.8);
              torch.play("cm-torch-burn");
              this.mazeLayer.add(torch);
            }
          }
        }
      }
      this.mazeLayer.setDepth(1);

      const gateCell: MazeCell = this.wide
        ? { col: 0, row: Math.floor(rows / 2) }
        : { col: Math.floor(cols / 2), row: 0 };
      this.place(this.gate, gateCell.col, gateCell.row);
      this.gate.setDisplaySize(this.tile * 0.95, this.tile * 1.7);
    }

    /** Repositions hero, goblins, orbs, and coins after a layout change. */
    private layoutEntities(): void {
      this.hero.setDisplaySize(this.tile * 0.98, this.tile * 0.98);
      this.place(this.hero, this.heroMover.col, this.heroMover.row);
      for (const goblin of this.goblins) {
        goblin.sprite.setDisplaySize(this.tile * 0.98, this.tile * 0.98);
        this.place(goblin.sprite, goblin.mover.col, goblin.mover.row);
      }
      for (const orb of this.orbs) {
        orb.sprite.setDisplaySize(this.tile * 0.72, this.tile * 0.72);
        this.place(orb.sprite, orb.cell.col, orb.cell.row);
        orb.label
          .setFontSize(Math.max(11, Math.round(this.tile * 0.4)))
          .setPosition(orb.sprite.x, orb.sprite.y - this.tile * 0.42);
      }
      for (const coin of this.coins) {
        coin.sprite.setDisplaySize(this.tile * 0.5, this.tile * 0.5);
        this.place(coin.sprite, coin.cell.col, coin.cell.row);
      }
    }

    /** Centres the banner over the maze area. */
    private layoutBanner(): void {
      const { width, height } = this.scale;
      const x = this.wide ? width * 0.6 : width * 0.5;
      const y = this.wide ? height * 0.5 : height * 0.62;
      this.bannerText.setPosition(x, y).setWordWrapWidth(Math.min(520, width - 60));
      this.bannerBox
        .setPosition(x, y)
        .setOrigin(0.5)
        .setSize(this.bannerText.width + 44, this.bannerText.height + 30);
    }

    /** Removes host-level listeners and audio when Phaser shuts the scene down. */
    private release(): void {
      this.scale.off("resize", this.handleResize, this);
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointer, this);
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
      this.input.keyboard?.removeAllKeys(true);
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.sound.stopAll();
      this.orbs = [];
      this.coins = [];
      this.goblins = [];
    }
  };
}
