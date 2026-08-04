import Phaser from "phaser";
import type {
  CartridgeGameConfigContext,
  CompetitionAssetId,
} from "@reading-advantage/advantage-play-kit";
import {
  advance,
  buildRound,
  createGameState,
  results,
  TIMER_MS,
  TOTAL_ROUNDS,
  WORD_BANK,
  type GameState,
  type RoundPrompt,
} from "./systems";

const FONT =
  '"Noto Sans Thai", Tahoma, "Segoe UI", "DejaVu Sans", sans-serif';
const BG = 0x0f0c1b;
const PANEL = 0x241b3d;
const PANEL_HOVER = 0x33265a;
const TEXT_COLOR = "#f3eaff";
const DIM_TEXT = "#a99ec9";
const GOLD = 0xffd166;
const CORRECT = 0x3ddc84;
const WRONG = 0xff5c6c;
/** Scale applied to the witch walk-cycle sprite. */
const COURIER_SCALE = 0.32;
/** Walk-cycle frame (feet together) used as the standing idle pose. */
const COURIER_IDLE_FRAME = 8;
/** Vivid blue tint for the magic-fire embers. */
const EMBER_TINT = 0x3b82f6;
/** Deep blue color of the card magic-fire glow aura. */
const MAGIC_GLOW = 0x2563eb;

/** One interactive choice card (rounded box + Thai label). */
interface ChoiceCard {
  readonly container: Phaser.GameObjects.Container;
  readonly box: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
  readonly index: number;
}

/** One on-screen control button (icon box + glyph). */
interface ControlButton {
  readonly container: Phaser.GameObjects.Container;
  readonly box: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
}

/** One edge flame emitter tied to a card and one of its four sides. */
interface CardEdgeEmitter {
  readonly cardIndex: number;
  readonly edge: "top" | "right" | "bottom" | "left";
  readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
}

/** Creates the Crystal Courier round-timer scene while preserving the cartridge contract. */
export function createCourierScene(
  context: CartridgeGameConfigContext,
): typeof Phaser.Scene {
  return class CourierScene extends Phaser.Scene {
    private readonly seed = context.seed ?? 42;
    private state: GameState = createGameState();
    private round: RoundPrompt = buildRound(this.seed, 1, WORD_BANK);
    private resolving = false;
    private finished = false;
    private roundActive = false;
    private roundStartTime = 0;
    private timerEvent?: Phaser.Time.TimerEvent;
    private selectedIndex = 1;
    private timerWidth = 240;
    private restarting = false;
    private courierWalk?: Phaser.Tweens.Tween;
    private courierBreath?: Phaser.Tweens.Tween;

    private titleText?: Phaser.GameObjects.Text;
    private hudText?: Phaser.GameObjects.Text;
    private crystalGlow?: Phaser.GameObjects.Arc;
    private crystalSprite?: Phaser.GameObjects.Sprite;
    private promptText?: Phaser.GameObjects.Text;
    private timerBar?: Phaser.GameObjects.Rectangle;
    private timerText?: Phaser.GameObjects.Text;
    private feedbackText?: Phaser.GameObjects.Text;
    private floatText?: Phaser.GameObjects.Text;
    private courier?: Phaser.GameObjects.Sprite;
    private hitBurst?: Phaser.GameObjects.Sprite;
    private pathTiles?: Phaser.GameObjects.TileSprite;
    private topWall?: Phaser.GameObjects.TileSprite;
    private torchLeft?: Phaser.GameObjects.Sprite;
    private torchRight?: Phaser.GameObjects.Sprite;
    private cards: ChoiceCard[] = [];
    private cardGlows: (Phaser.GameObjects.Arc | undefined)[] = [];
    private cardGlowPulses: (Phaser.Tweens.Tween | undefined)[] = [];
    private cardFrames: (Phaser.GameObjects.Image | undefined)[] = [];
    private cardFrameFlickers: (Phaser.Tweens.Tween | undefined)[] = [];
    private cardEmitters: CardEdgeEmitter[] = [];
    private endPanel?: Phaser.GameObjects.Container;
    private dpad: ControlButton[] = [];
    private actionLeft?: ControlButton;
    private actionRight?: ControlButton;
    private actionGo?: ControlButton;

    preload(): void {
      this.load.spritesheet("cc-hero", "/assets/cartridges/my-game/witch-walk.png", {
        frameWidth: 276,
        frameHeight: 410,
      });
      this.loadSpriteSheet("cc-crystal", "orb.crystal-blue");
      this.loadSpriteSheet("cc-torch", "maze.torch");
      this.loadSpriteSheet("cc-hit", "feedback.hit");
      this.load.image("cc-floor", context.assets.resolve("maze.floor-dungeon").url);
      this.load.image("cc-wall", context.assets.resolve("maze.wall-dungeon").url);
      this.load.image("cc-chest", context.assets.resolve("bonus.chest").url);
      this.load.image("cc-fire-frame", "/assets/cartridges/my-game/blue-fire-frame.png");
      this.loadAudio("cc-correct", "audio.orb-pickup");
      this.loadAudio("cc-wrong", "audio.wrong-orb");
      this.loadAudio("cc-power", "audio.power-up");
      this.loadAudio("cc-win", "audio.sentence-complete");
      this.loadAudio("cc-ui", "audio.ui-confirm");
    }

    create(): void {
      this.cameras.main.setBackgroundColor(BG);
      this.createCourierAnimation();
      this.createAnimation("cc-crystal-spin", "cc-crystal", "orb.crystal-blue");
      this.createAnimation("cc-torch-flicker", "cc-torch", "maze.torch");
      this.createAnimation("cc-hit-burst", "cc-hit", "feedback.hit", 0);

      this.topWall = this.add.tileSprite(0, 0, 1, 1, "cc-wall").setOrigin(0);
      this.pathTiles = this.add.tileSprite(0, 0, 1, 1, "cc-floor").setOrigin(0);

      this.crystalGlow = this.add.circle(0, 0, 46, 0x7b5cff, 0.32);
      this.crystalSprite = this.add.sprite(0, 0, "cc-crystal").setScale(4);
      this.crystalSprite.play("cc-crystal-spin");
      this.torchLeft = this.add.sprite(0, 0, "cc-torch").setScale(1.5);
      this.torchRight = this.add.sprite(0, 0, "cc-torch").setScale(1.5).setFlipX(true);
      this.torchLeft.play("cc-torch-flicker");
      this.torchRight.play("cc-torch-flicker");

      this.promptText = this.add.text(0, 0, "", {
        fontFamily: FONT,
        fontSize: "30px",
        fontStyle: "bold",
        color: TEXT_COLOR,
        align: "center",
      }).setOrigin(0.5);

      this.timerBar = this.add.rectangle(0, 0, 1, 14, GOLD).setOrigin(0.5, 0.5);
      this.timerText = this.add.text(0, 0, "3s", {
        fontFamily: FONT,
        fontSize: "16px",
        color: TEXT_COLOR,
      }).setOrigin(0.5);

      this.feedbackText = this.add.text(0, 0, "", {
        fontFamily: FONT,
        fontSize: "20px",
        fontStyle: "bold",
        color: TEXT_COLOR,
        align: "center",
        wordWrap: { width: 300 },
      }).setOrigin(0.5).setAlpha(0);

      this.courier = this.add
        .sprite(0, 0, "cc-hero")
        .setScale(COURIER_SCALE)
        .setOrigin(0.5, 1);
      this.courier.play("cc-hero-walk");
      this.hitBurst = this.add.sprite(0, 0, "cc-hit").setScale(3).setVisible(false);

      this.titleText = this.add.text(0, 0, "Crystal Courier • ผู้จัดส่งคริสตัล", {
        fontFamily: FONT,
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffd166",
      }).setOrigin(0.5);
      this.hudText = this.add.text(0, 0, "", {
        fontFamily: FONT,
        fontSize: "18px",
        color: TEXT_COLOR,
      }).setOrigin(0.5);

      this.createEmberTexture();
      this.createCards();
      this.createControls();
      this.bindKeyboard();

      this.tweens.add({
        targets: this.crystalGlow,
        alpha: { from: 0.18, to: 0.5 },
        duration: 900,
        yoyo: true,
        repeat: -1,
      });

      this.scale.on("resize", this.layout, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.release, this);

      this.layout();
      this.startRound();
      context.diagnostic({
        code: "GAME_READY",
        message: "Crystal Courier is ready",
      });
    }

    /** Loads one selected-union spritesheet using descriptor-owned frame metadata. */
    private loadSpriteSheet(key: string, assetId: CompetitionAssetId): void {
      const asset = context.assets.resolve(assetId);
      if (asset.kind !== "spritesheet" || !asset.frame) {
        throw new Error(`${assetId} is not a selected-union spritesheet`);
      }
      this.load.spritesheet(key, asset.url, {
        frameWidth: asset.frame.width,
        frameHeight: asset.frame.height,
      });
    }

    /** Loads one selected-union audio asset through the host resolver. */
    private loadAudio(key: string, assetId: CompetitionAssetId): void {
      this.load.audio(key, context.assets.resolve(assetId).url);
    }

    /** Registers the custom witch walk-cycle animation from the 10-frame spritesheet. */
    private createCourierAnimation(): void {
      if (this.anims.exists("cc-hero-walk")) return;
      this.anims.create({
        key: "cc-hero-walk",
        frames: this.anims.generateFrameNumbers("cc-hero", { start: 0, end: 9 }),
        frameRate: 10,
        repeat: -1,
      });
    }

    /** Walks the courier horizontally to a card, then idles and invokes onArrive. */
    private walkCourierTo(targetX: number, onArrive?: () => void): void {
      const courier = this.courier;
      if (!courier) {
        onArrive?.();
        return;
      }
      this.courierWalk?.remove();
      this.courierBreath?.remove();
      courier.setScale(COURIER_SCALE);
      const dx = targetX - courier.x;
      if (Math.abs(dx) < 2) {
        this.idleCourier();
        onArrive?.();
        return;
      }
      courier.play("cc-hero-walk");
      const duration = Phaser.Math.Clamp(Math.abs(dx) * 1.8, 220, 650);
      this.courierWalk = this.tweens.add({
        targets: courier,
        x: targetX,
        duration,
        ease: "Sine.easeInOut",
        onComplete: () => {
          this.idleCourier();
          onArrive?.();
        },
      });
    }

    /** Freezes the courier on the standing pose and adds a gentle breathing scale. */
    private idleCourier(): void {
      const courier = this.courier;
      if (!courier) return;
      courier.anims.stop();
      courier.setFrame(COURIER_IDLE_FRAME);
      this.courierBreath?.remove();
      this.courierBreath = this.tweens.add({
        targets: courier,
        scaleX: COURIER_SCALE * 1.03,
        scaleY: COURIER_SCALE * 0.985,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    }

    /** Stops all courier tweens; used on game end and scene shutdown. */
    private stopCourierMovement(): void {
      this.courierWalk?.remove();
      this.courierBreath?.remove();
      this.courierWalk = undefined;
      this.courierBreath = undefined;
    }

    /** Plays a small hop at the chosen card, then resolves the round. */
    private chooseHop(chosenIndex: number): void {
      const courier = this.courier;
      if (courier) {
        const startY = courier.y;
        this.tweens.add({
          targets: courier,
          y: startY - 26,
          duration: 170,
          yoyo: true,
          ease: "Quad.easeOut",
          onComplete: () => courier.setY(startY),
        });
      }
      if (chosenIndex === this.round.correctIndex) {
        this.resolveCorrect(chosenIndex);
      } else {
        this.resolveWrong("wrong");
      }
      this.advanceAfter(700);
    }

    /** Registers a looping (or once) animation from the frozen palette descriptor. */
    private createAnimation(
      key: string,
      texture: string,
      assetId: CompetitionAssetId,
      repeat = -1,
    ): void {
      if (this.anims.exists(key)) return;
      const asset = context.assets.resolve(assetId);
      if (!asset.frame) {
        throw new Error(`${assetId} is missing animation frame metadata`);
      }
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

    /** Creates the three Thai choice cards with hover and tap handling. */
    private createCards(): void {
      for (let index = 0; index < 3; index += 1) {
        const box = this.add.rectangle(0, 0, 1, 1, PANEL).setStrokeStyle(3, 0x4a3b7a, 1);
        const label = this.add.text(0, 0, "", {
          fontFamily: FONT,
          fontSize: "19px",
          fontStyle: "bold",
          color: TEXT_COLOR,
          align: "center",
        }).setOrigin(0.5);
        const container = this.add.container(0, 0, [box, label]).setDepth(1);
        box.setInteractive({ useHandCursor: true });
        box.on("pointerdown", () => this.chooseCard(index));
        box.on("pointerover", () => {
          if (!this.resolving) {
            this.selectedIndex = index;
            this.updateCardHighlight();
          }
        });
        this.cards.push({ container, box, label, index });
        this.createCardFire(index);
      }
    }

    /** Generates the soft radial-gradient texture used for magic-fire embers. */
    private createEmberTexture(): void {
      if (this.textures.exists("cc-ember-dot")) return;
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.35, "rgba(255,255,255,0.75)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      this.textures.addCanvas("cc-ember-dot", canvas);
    }

    /** Adds the blue glow aura and four edge flame emitters around one choice card. */
    private createCardFire(index: number): void {
      const glow = this.add.circle(0, 0, 60, MAGIC_GLOW, 0.16).setDepth(-1);
      const pulse = this.tweens.add({
        targets: glow,
        alpha: { from: 0.08, to: 0.24 },
        duration: 950,
        yoyo: true,
        repeat: -1,
        delay: index * 180,
      });
      this.cardGlows.push(glow);
      this.cardGlowPulses.push(pulse);

      const frame = this.add.image(0, 0, "cc-fire-frame").setDepth(-2);
      const flicker = this.tweens.add({
        targets: frame,
        alpha: { from: 0.85, to: 1 },
        duration: 520,
        yoyo: true,
        repeat: -1,
        delay: index * 160,
      });
      this.cardFrames.push(frame);
      this.cardFrameFlickers.push(flicker);

      const base = {
        texture: "cc-ember-dot",
        scale: { start: 0.2, end: 0.02 },
        alpha: { start: 0.9, end: 0 },
        blendMode: "ADD",
        tint: EMBER_TINT,
        frequency: 140,
        quantity: 2,
        maxParticles: 20,
      };
      const edges: { edge: CardEdgeEmitter["edge"]; angle: number; speed: [number, number]; lifespan: [number, number] }[] = [
        { edge: "top", angle: 270, speed: [60, 120], lifespan: [600, 1000] },
        { edge: "left", angle: 250, speed: [45, 95], lifespan: [550, 900] },
        { edge: "right", angle: 290, speed: [45, 95], lifespan: [550, 900] },
        { edge: "bottom", angle: 270, speed: [18, 38], lifespan: [220, 340] },
      ];
      for (const spec of edges) {
        const emitter = this.add.particles(0, 0, base.texture, {
          ...base,
          angle: spec.angle,
          speed: { min: spec.speed[0], max: spec.speed[1] },
          lifespan: { min: spec.lifespan[0], max: spec.lifespan[1] },
        }).setDepth(2);
        this.cardEmitters.push({ cardIndex: index, edge: spec.edge, emitter });
      }
    }

    /** Builds a zone that spawns flames along a horizontal or vertical line at an offset. */
    private buildLineZone(
      horizontal: boolean,
      length: number,
      offset: number,
    ): Phaser.GameObjects.Particles.Zones.RandomZone {
      const source: Phaser.Types.GameObjects.Particles.RandomZoneSource = {
        getRandomPoint(point) {
          const d = Phaser.Math.FloatBetween(-length / 2, length / 2);
          if (horizontal) {
            point.x += d;
            point.y += offset;
          } else {
            point.x += offset;
            point.y += d;
          }
          return point;
        },
      };
      return new Phaser.GameObjects.Particles.Zones.RandomZone(source);
    }

    /** Builds the virtual D-pad and the directional/action button clusters. */
    private createControls(): void {
      const press = (delta: number) => {
        if (this.resolving || this.finished) return;
        this.sound.play("cc-ui", { volume: 0.4 });
        this.selectedIndex = (this.selectedIndex + delta + 3) % 3;
        this.updateCardHighlight();
      };
      const confirm = () => {
        if (this.resolving || this.finished) return;
        this.chooseCard(this.selectedIndex);
      };

      const padSize = 46;
      const gap = 6;
      const pad = this.makeButton(0, 0, padSize, "▲", () => press(-1));
      const left = this.makeButton(0, 0, padSize, "◀", () => press(-1));
      const right = this.makeButton(0, 0, padSize, "▶", () => press(1));
      const down = this.makeButton(0, 0, padSize, "▼", () => press(1));
      pad.container.setPosition(0, -(padSize + gap));
      left.container.setPosition(-(padSize + gap), 0);
      right.container.setPosition(padSize + gap, 0);
      down.container.setPosition(0, padSize + gap);
      this.dpad = [pad, left, right, down];

      this.actionLeft = this.makeButton(0, 0, 40, "◀", () => press(-1));
      this.actionRight = this.makeButton(0, 0, 40, "▶", () => press(1));
      this.actionGo = this.makeButton(0, 0, 60, "ACTION", confirm);
      this.actionGo.label.setFontSize(9);
    }

    /** Creates one rounded control button wired to a press callback. */
    private makeButton(
      x: number,
      y: number,
      size: number,
      glyph: string,
      onPress: () => void,
    ): ControlButton {
      const box = this.add.rectangle(x, y, size, size, PANEL).setStrokeStyle(2, 0x6a58b8, 1);
      const label = this.add.text(x, y, glyph, {
        fontFamily: FONT,
        fontSize: "16px",
        fontStyle: "bold",
        color: TEXT_COLOR,
      }).setOrigin(0.5);
      const container = this.add.container(0, 0, [box, label]);
      box.setInteractive({ useHandCursor: true });
      box.on("pointerdown", onPress);
      return { container, box, label };
    }

    /** Wires WASD, arrows, digits, and space to the matching controls. */
    private bindKeyboard(): void {
      this.input.keyboard?.on("keydown-LEFT", () => this.pressKeyboard(-1));
      this.input.keyboard?.on("keydown-A", () => this.pressKeyboard(-1));
      this.input.keyboard?.on("keydown-UP", () => this.pressKeyboard(-1));
      this.input.keyboard?.on("keydown-W", () => this.pressKeyboard(-1));
      this.input.keyboard?.on("keydown-RIGHT", () => this.pressKeyboard(1));
      this.input.keyboard?.on("keydown-D", () => this.pressKeyboard(1));
      this.input.keyboard?.on("keydown-DOWN", () => this.pressKeyboard(1));
      this.input.keyboard?.on("keydown-S", () => this.pressKeyboard(1));
      this.input.keyboard?.on("keydown-SPACE", () => {
        if (this.resolving || this.finished) return;
        this.chooseCard(this.selectedIndex);
      });
      this.input.keyboard?.on("keydown-ENTER", () => {
        if (this.resolving || this.finished) return;
        this.chooseCard(this.selectedIndex);
      });
      this.input.keyboard?.on("keydown-ONE", () => this.chooseCard(0));
      this.input.keyboard?.on("keydown-TWO", () => this.chooseCard(1));
      this.input.keyboard?.on("keydown-THREE", () => this.chooseCard(2));
    }

    private readonly pressKeyboard = (delta: number): void => {
      if (this.resolving || this.finished) return;
      this.sound.play("cc-ui", { volume: 0.3 });
      this.selectedIndex = (this.selectedIndex + delta + 3) % 3;
      this.updateCardHighlight();
    };

    /** Starts the current round: fills the prompt, resets the timer, enables input. */
    private startRound(): void {
      this.round = buildRound(this.seed, this.state.round, WORD_BANK);
      this.roundActive = true;
      this.resolving = false;
      this.selectedIndex = 1;
      this.roundStartTime = this.time.now;

      this.promptText?.setText(this.round.prompt);
      this.cards.forEach((card) => {
        card.label.setText(this.round.options[card.index]!);
      });
      this.updateCardHighlight();

      this.timerEvent?.remove();
      this.timerEvent = this.time.addEvent({
        delay: TIMER_MS,
        callback: () => this.resolveTimeout(),
      });

      this.timerBar?.setFillStyle(GOLD);
      this.feedbackText?.setAlpha(0);
      this.hudText?.setText(
        `Score ${this.state.score}   Round ${Math.min(this.state.round, TOTAL_ROUNDS)}/${TOTAL_ROUNDS}`,
      );
    }

    /** Advances the session after a correct answer. */
    private resolveCorrect(chosenIndex: number): void {
      this.state = advance(this.state, chosenIndex, this.round);
      const points = 100 + Math.min(this.state.streak - 1, 3) * 10;
      this.sound.play("cc-correct", { volume: 0.5 });
      this.crystalSprite?.setTint(CORRECT);
      this.showFeedback(`ถูกต้อง! Correct! +${points}`);
      this.showFloat(`+${points}`, GOLD);
      this.playBurst(this.round.options[chosenIndex]!);
    }

    /** Advances the session after a wrong answer. */
    private resolveWrong(kind: "wrong" | "timeout"): void {
      this.state = advance(this.state, -1, this.round);
      this.sound.play("cc-wrong", { volume: 0.5 });
      this.crystalSprite?.setTint(WRONG);
      this.showFeedback(
        kind === "timeout"
          ? "หมดเวลา! Time's up"
          : "ผิด! −50 / Not quite! −50",
      );
      this.showFloat("-50", WRONG);
    }

    /** Handles the countdown reaching zero as a wrong, timeout answer. */
    private resolveTimeout(): void {
      if (!this.roundActive || this.resolving) return;
      this.roundActive = false;
      this.resolving = true;
      this.timerEvent?.remove();
      const courier = this.courier;
      if (courier) {
        const startX = courier.x;
        this.tweens.add({
          targets: courier,
          x: startX + 8,
          duration: 60,
          yoyo: true,
          repeat: 2,
          onComplete: () => courier.setX(startX),
        });
      }
      this.resolveWrong("timeout");
      this.advanceAfter(700);
    }

    /** Handles the player picking a card: walk to it, hop, then resolve. */
    private chooseCard(chosenIndex: number): void {
      if (!this.roundActive || this.resolving || this.finished) return;
      this.roundActive = false;
      this.resolving = true;
      this.timerEvent?.remove();
      this.timerBar?.setFillStyle(WRONG);
      this.walkCourierTo(
        this.cards[chosenIndex]!.container.x,
        () => this.chooseHop(chosenIndex),
      );
    }

    /** Waits a beat, then either starts the next round or ends the game. */
    private advanceAfter(delay: number): void {
      this.time.delayedCall(delay, () => {
        this.crystalSprite?.clearTint();
        if (this.state.completed) {
          this.endGame();
        } else {
          this.startRound();
        }
      });
    }

    /** Emits the result once and renders the end-of-game panel. */
    private endGame(): void {
      if (this.finished) return;
      this.finished = true;
      const result = results(this.state);
      context.complete(result);
      this.roundActive = false;
      this.resolving = false;
      this.stopCourierMovement();
      this.idleCourier();
      this.cardEmitters.forEach((entry) => entry.emitter.stop());
      this.cardGlowPulses.forEach((pulse) => pulse?.remove());
      this.cardFrameFlickers.forEach((flicker) => flicker?.remove());

      const width = this.scale.gameSize.width;
      const height = this.scale.gameSize.height;
      const cx = width / 2;

      const panel = this.add.container(cx, height / 2);
      const backdrop = this.add.rectangle(0, 0, Math.min(width * 0.9, 460), 300, PANEL);
      backdrop.setStrokeStyle(3, GOLD, 1);
      const chest = this.add.image(0, -78, "cc-chest").setScale(2);
      const accuracy = Math.round(result.accuracy * 100);
      const lines = [
        `จบเกม! / Game Complete!`,
        `Score: ${result.score}`,
        `Accuracy: ${accuracy}%`,
        `Correct: ${result.correctAnswers}/${result.totalAttempts}`,
        `XP: ${result.xp}`,
      ];
      const stats = this.add.text(0, 0, lines.join("\n"), {
        fontFamily: FONT,
        fontSize: "19px",
        color: TEXT_COLOR,
        align: "center",
      }).setOrigin(0.5, 0.5);
      const againBox = this.add.rectangle(0, 112, 200, 46, 0x7b5cff).setStrokeStyle(2, 0xf3eaff, 1);
      const againLabel = this.add.text(0, 112, "เล่นอีกครั้ง / Play Again", {
        fontFamily: FONT,
        fontSize: "15px",
        fontStyle: "bold",
        color: TEXT_COLOR,
      }).setOrigin(0.5);
      againBox.setInteractive({ useHandCursor: true });
      againBox.on("pointerdown", () => this.restartGame());
      this.input.keyboard?.on("keydown-ENTER", () => this.restartGame());
      this.input.keyboard?.on("keydown-SPACE", () => this.restartGame());

      panel.add([backdrop, chest, stats, againBox, againLabel]);
      this.endPanel = panel;
      this.promptText?.setAlpha(0.25);
      this.cards.forEach((card) => card.container.setVisible(false));
      this.sound.play("cc-win", { volume: 0.5 });
      this.showFloat("XP +" + result.xp, GOLD);

      context.diagnostic({
        code: "GAME_COMPLETE",
        message: `score=${result.score} accuracy=${result.accuracy}`,
      });
    }

    /** Restarts the scene once, guarding against double presses. */
    private restartGame(): void {
      if (this.restarting) return;
      this.restarting = true;
      this.scene.restart();
    }

    /** Draws the selection highlight and walks the courier to the active card. */
    private updateCardHighlight(): void {
      this.cards.forEach((card) => {
        const selected = card.index === this.selectedIndex;
        card.box.setFillStyle(selected ? PANEL_HOVER : PANEL);
        card.box.setStrokeStyle(selected ? 4 : 3, selected ? GOLD : 0x4a3b7a, 1);
      });
      this.cardGlows.forEach((glow, index) => {
        glow?.setScale(index === this.selectedIndex ? 1.35 : 1);
      });
      if (!this.resolving && !this.finished) {
        this.walkCourierTo(this.cards[this.selectedIndex]!.container.x);
      }
    }

    /** Shows the bilingual round-outcome banner under the cards. */
    private showFeedback(message: string): void {      this.feedbackText?.setText(message).setAlpha(1);
      this.tweens.add({
        targets: this.feedbackText,
        alpha: 0,
        delay: 1100,
        duration: 400,
      });
    }

    /** Shows a short-lived floating score popup. */
    private showFloat(text: string, color: number): void {
      if (this.floatText) this.floatText.destroy();
      const x = this.crystalSprite?.x ?? this.scale.gameSize.width / 2;
      const y = (this.crystalSprite?.y ?? 0) - 70;
      this.floatText = this.add
        .text(x, y, text, {
          fontFamily: FONT,
          fontSize: "24px",
          fontStyle: "bold",
          color: `#${color.toString(16).padStart(6, "0")}`,
        })
        .setOrigin(0.5);
      this.tweens.add({
        targets: this.floatText,
        y: y - 46,
        alpha: 0,
        duration: 900,
        onComplete: () => this.floatText?.destroy(),
      });
    }

    /** Plays the goblin-defeat burst effect over a card. */
    private playBurst(location: string): void {
      const card = this.cards.find((entry) => entry.label.text === location);
      const x = card ? card.container.x : this.scale.gameSize.width / 2;
      const y = card ? card.container.y : this.scale.gameSize.height / 2;
      this.hitBurst?.setPosition(x, y).setVisible(true).play("cc-hit-burst");
      this.hitBurst?.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.hitBurst?.setVisible(false);
      });
    }

    /** Composes the stage for compact portrait and wide landscape viewports. */
    private layout(): void {
      const { width, height } = this.scale.gameSize;
      const compact = width < 720;
      const cx = width / 2;
      const contentW = Math.min(width - (compact ? 24 : 120), 620);

      this.topWall?.setSize(width, 18).setPosition(0, 0);
      this.pathTiles?.setSize(width, height * 0.26).setPosition(0, height * 0.74);

      this.titleText?.setPosition(cx, height * 0.06);
      this.hudText?.setPosition(cx, height * 0.125);

      const crystalY = height * 0.225;
      this.crystalGlow?.setPosition(cx, crystalY);
      this.crystalSprite?.setPosition(cx, crystalY);
      this.torchLeft?.setPosition(cx - contentW * 0.42, crystalY + 6);
      this.torchRight?.setPosition(cx + contentW * 0.42, crystalY + 6);

      this.promptText?.setPosition(cx, height * 0.315).setWordWrapWidth(contentW * 0.85);

      const timerW = Math.min(contentW * 0.55, 240);
      const timerY = height * 0.37;
      this.timerWidth = timerW;
      this.timerBar?.setSize(timerW, 14).setPosition(cx, timerY);
      this.timerText?.setPosition(cx, timerY + 18);

      const cardGap = compact ? 10 : 18;
      const cardW = (contentW - cardGap * 2) / 3;
      const cardH = Math.max(120, Math.min(180, height * 0.17));
      const cardsY = height * 0.52;
      this.cards.forEach((card) => {
        const x = cx + (card.index - 1) * (cardW + cardGap);
        card.container.setPosition(x, cardsY);
        card.box.setSize(cardW, cardH);
        card.label.setFontSize(cardW < 108 ? 16 : 19);
        card.label.setWordWrapWidth(cardW - 18);
      });
      this.cardGlows.forEach((glow, index) => {
        const x = cx + (index - 1) * (cardW + cardGap);
        glow?.setPosition(x, cardsY);
        glow?.setRadius(Math.max(cardW, cardH) * 0.62);
      });
      this.cardFrames.forEach((frame, index) => {
        const x = cx + (index - 1) * (cardW + cardGap);
        frame?.setPosition(x, cardsY);
        frame?.setDisplaySize(cardW + 80, cardH + 80);
      });
      this.cardEmitters.forEach((entry) => {
        const x = cx + (entry.cardIndex - 1) * (cardW + cardGap);
        const hw = cardW / 2 + 26;
        const hh = cardH / 2;
        const halfTop = cardW / 2 + 26;
        entry.emitter.setPosition(x, cardsY);
        switch (entry.edge) {
          case "top":
            entry.emitter.setEmitZone(this.buildLineZone(true, halfTop * 2, -(hh + 20)));
            break;
          case "left":
            entry.emitter.setEmitZone(this.buildLineZone(false, cardH - 12, -hw));
            break;
          case "right":
            entry.emitter.setEmitZone(this.buildLineZone(false, cardH - 12, hw));
            break;
          case "bottom":
            entry.emitter.setEmitZone(this.buildLineZone(true, halfTop * 2, hh + 30));
            break;
        }
      });

      this.feedbackText?.setPosition(cx, height * 0.63);
      this.courier?.setPosition(cx, height * 0.78);
      this.hitBurst?.setPosition(cx, height * 0.78);

      const ctrlY = height - (compact ? 56 : 72);
      const dpadX = compact ? 70 : 130;
      const actionX = compact ? width - 66 : width - 120;
      this.dpad.forEach((button) => button.container.setPosition(dpadX, ctrlY));
      this.actionLeft?.container.setPosition(actionX - 58, ctrlY);
      this.actionRight?.container.setPosition(actionX + 58, ctrlY);
      this.actionGo?.container.setPosition(actionX, ctrlY);

      if (this.endPanel) {
        this.endPanel.setPosition(cx, height / 2);
      }
    }

    /** Redraws the countdown bar and label each frame. */
    override update(_time: number, _delta: number): void {
      if (!this.roundActive || this.resolving || this.finished) return;
      const remaining = Math.max(0, TIMER_MS - (this.time.now - this.roundStartTime));
      const fraction = remaining / TIMER_MS;
      this.timerBar?.setSize(this.timerWidth * fraction, 14);
      this.timerBar?.setFillStyle(fraction > 0.4 ? GOLD : WRONG);
      this.timerText?.setText(`${Math.ceil(remaining / 1000)}s`);
    }

    /** Removes host-level listeners and schedules when Phaser shuts down this scene. */
    private release(): void {
      this.scale.off("resize", this.layout, this);
      this.stopCourierMovement();
      this.timerEvent?.remove();
      this.time.removeAllEvents();
      this.tweens.killAll();
      this.input.keyboard?.removeAllListeners();
    }
  };
}
